import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccessLog {
  id: number;
  time: number;
  user_id: number;
  event: number;
  portal_id?: number;
  device_id?: number;
}

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get active config
    const { data: config, error: configError } = await supabase
      .from("time_clock_config")
      .select("*")
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      console.error("No active time clock configuration found");
      return new Response(
        JSON.stringify({ error: "Configuration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.device_ip) {
      return new Response(
        JSON.stringify({ error: "Device IP not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deviceIp = config.device_ip;
    const deviceLogin = config.device_login || "admin";
    const devicePassword = config.device_password || "admin";

    console.log(`Starting sync with Control iD at ${deviceIp}`);

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("controlid_sync_logs")
      .insert({
        sync_type: "polling",
        status: "success",
        device_id: deviceIp,
        records_synced: 0,
        records_failed: 0,
      })
      .select()
      .single();

    const syncLogId = syncLog?.id;
    let recordsSynced = 0;
    let recordsFailed = 0;
    const results: Array<{ log_id: number; success: boolean; error?: string }> = [];

    try {
      // Login to device
      const loginResponse = await fetch(`http://${deviceIp}/login.fcgi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: deviceLogin,
          password: devicePassword,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status}`);
      }

      const loginData = await loginResponse.json();
      const session = loginData.session;

      if (!session) {
        throw new Error("No session returned from device");
      }

      // Calculate time range - last sync or last 24 hours
      const lastSync = config.last_sync_at 
        ? new Date(config.last_sync_at) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const lastSyncTimestamp = Math.floor(lastSync.getTime() / 1000);

      // Load access logs since last sync
      const logsResponse = await fetch(`http://${deviceIp}/load_objects.fcgi?session=${session}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: "access_logs",
          where: {
            access_logs: {
              time: { ">=": lastSyncTimestamp },
            },
          },
        }),
      });

      if (!logsResponse.ok) {
        throw new Error(`Failed to load access logs: ${logsResponse.status}`);
      }

      const logsData = await logsResponse.json();
      const accessLogs: AccessLog[] = logsData.access_logs || [];

      console.log(`Found ${accessLogs.length} access logs since ${lastSync.toISOString()}`);

      // Process each log
      for (const log of accessLogs) {
        const logId = log.id.toString();
        const controlidUserId = log.user_id;
        const timestamp = new Date(log.time * 1000).toISOString();

        try {
          // Check for duplicate
          const { data: existing } = await supabase
            .from("employee_time_clock")
            .select("id")
            .eq("device_id", deviceIp)
            .eq("controlid_log_id", logId)
            .single();

          if (existing) {
            console.log(`Skipping duplicate log_id: ${logId}`);
            continue;
          }

          // Find employee mapping
          const { data: mapping } = await supabase
            .from("controlid_user_mappings")
            .select("employee_id")
            .eq("controlid_user_id", controlidUserId)
            .single();

          if (!mapping) {
            console.log(`No mapping for controlid_user_id: ${controlidUserId}`);
            results.push({ log_id: log.id, success: false, error: "No mapping found" });
            recordsFailed++;
            continue;
          }

          // Get employee info
          const { data: employee } = await supabase
            .from("employee_profiles")
            .select("id, user_id, full_name")
            .eq("id", mapping.employee_id)
            .single();

          if (!employee) {
            results.push({ log_id: log.id, success: false, error: "Employee not found" });
            recordsFailed++;
            continue;
          }

          // Determine clock type
          const clockType = await determineClockType(supabase, employee.id);

          // Insert record
          const { error: insertError } = await supabase
            .from("employee_time_clock")
            .insert({
              employee_id: employee.id,
              user_id: employee.user_id,
              clock_type: clockType,
              timestamp,
              source: "controlid",
              device_id: deviceIp,
              controlid_log_id: logId,
              verified: true,
            });

          if (insertError) {
            results.push({ log_id: log.id, success: false, error: insertError.message });
            recordsFailed++;
            continue;
          }

          results.push({ log_id: log.id, success: true });
          recordsSynced++;

          console.log(`Synced: ${employee.full_name} - ${clockType} at ${timestamp}`);

        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          results.push({ log_id: log.id, success: false, error: errMsg });
          recordsFailed++;
        }
      }

      // Update last sync timestamp
      await supabase
        .from("time_clock_config")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", config.id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Sync error:", err);

      if (syncLogId) {
        await supabase
          .from("controlid_sync_logs")
          .update({
            status: "error",
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncLogId);
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update sync log with results
    if (syncLogId) {
      await supabase
        .from("controlid_sync_logs")
        .update({
          status: recordsFailed > 0 ? (recordsSynced > 0 ? "partial" : "error") : "success",
          records_synced: recordsSynced,
          records_failed: recordsFailed,
          completed_at: new Date().toISOString(),
          details: { results },
        })
        .eq("id", syncLogId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        records_synced: recordsSynced,
        records_failed: recordsFailed,
        total_logs_found: results.length + recordsSynced,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in sync:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function determineClockType(supabase: AnySupabaseClient, employeeId: string): Promise<"entry" | "exit" | "break_start" | "break_end"> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: lastRecord } = await supabase
    .from("employee_time_clock")
    .select("clock_type")
    .eq("employee_id", employeeId)
    .gte("timestamp", today.toISOString())
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (!lastRecord) return "entry";

  switch (lastRecord.clock_type) {
    case "entry": return "break_start";
    case "break_start": return "break_end";
    case "break_end": return "exit";
    case "exit": return "entry";
    default: return "entry";
  }
}
