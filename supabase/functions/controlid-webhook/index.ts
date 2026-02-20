import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Formato do Monitor Control iD
interface ControlIDMonitorPayload {
  object_changes?: Array<{
    object: string;
    type: string;
    values: {
      id: string;
      time: string;
      user_id: string;
      device_id?: string;
      event?: number;
      portal_id?: number;
    };
  }>;
  device_id?: number;
}

// Formato legado/manual
interface ControlIDLegacyPayload {
  id?: string;
  user_id?: string;
  cpf?: string;
  pis?: string;
  name?: string;
  timestamp?: string;
  device_id?: string;
  verification_type?: string;
  photo?: string;
}

type ControlIDPayload = ControlIDMonitorPayload | ControlIDLegacyPayload;

function isMonitorPayload(payload: ControlIDPayload): payload is ControlIDMonitorPayload {
  return 'object_changes' in payload && Array.isArray(payload.object_changes);
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

    // Get webhook secret from header
    const webhookSecret = req.headers.get("x-webhook-secret");
    
    // Validate webhook secret
    const { data: config } = await supabase
      .from("time_clock_config")
      .select("webhook_secret, is_active, device_ip")
      .eq("is_active", true)
      .single();

    if (!config) {
      console.error("No active time clock configuration found");
      return new Response(
        JSON.stringify({ error: "Configuration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (webhookSecret && config.webhook_secret && config.webhook_secret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ControlIDPayload = await req.json();
    console.log("Received Control iD payload:", JSON.stringify(payload, null, 2));

    // Handle Monitor format (Push from device)
    if (isMonitorPayload(payload)) {
      return await handleMonitorPayload(supabase, payload);
    }

    // Handle legacy format
    return await handleLegacyPayload(supabase, payload as ControlIDLegacyPayload);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleMonitorPayload(supabase: AnySupabaseClient, payload: ControlIDMonitorPayload) {
  const results: Array<{ success: boolean; log_id: string; error?: string }> = [];
  const deviceId = payload.device_id?.toString() || "";

  // Log the sync start
  const { data: syncLog } = await supabase
    .from("controlid_sync_logs")
    .insert({
      sync_type: "push",
      status: "success",
      device_id: deviceId,
      records_synced: 0,
      records_failed: 0,
    })
    .select()
    .single();

  const syncLogId = syncLog?.id;
  let recordsSynced = 0;
  let recordsFailed = 0;

  for (const change of payload.object_changes || []) {
    // Only process access_logs inserts
    if (change.object !== "access_logs" || change.type !== "inserted") {
      continue;
    }

    const logId = change.values.id;
    const controlidUserId = parseInt(change.values.user_id);
    const timestamp = new Date(parseInt(change.values.time) * 1000).toISOString();
    const logDeviceId = change.values.device_id || deviceId;

    try {
      // Find employee by controlid_user_id mapping
      const { data: mapping, error: mappingError } = await supabase
        .from("controlid_user_mappings")
        .select("employee_id, cpf")
        .eq("controlid_user_id", controlidUserId)
        .single();

      if (mappingError || !mapping) {
        console.log(`No mapping found for controlid_user_id: ${controlidUserId}`);
        results.push({ success: false, log_id: logId, error: "User mapping not found" });
        recordsFailed++;
        continue;
      }

      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name")
        .eq("id", mapping.employee_id)
        .single();

      if (employeeError || !employee) {
        console.error("Employee not found for mapping:", mapping.employee_id);
        results.push({ success: false, log_id: logId, error: "Employee not found" });
        recordsFailed++;
        continue;
      }

      // Determine clock type based on last record
      const clockType = await determineClockType(supabase, employee.id);

      // Check for duplicate
      const { data: existing } = await supabase
        .from("employee_time_clock")
        .select("id")
        .eq("device_id", logDeviceId)
        .eq("controlid_log_id", logId)
        .single();

      if (existing) {
        console.log(`Duplicate record for log_id: ${logId}`);
        results.push({ success: true, log_id: logId, error: "Duplicate - skipped" });
        continue;
      }

      // Insert time clock record
      const { error: insertError } = await supabase
        .from("employee_time_clock")
        .insert({
          employee_id: employee.id,
          user_id: employee.user_id,
          clock_type: clockType,
          timestamp,
          source: "controlid",
          device_id: logDeviceId,
          controlid_log_id: logId,
          verified: true,
        });

      if (insertError) {
        console.error("Error inserting time clock record:", insertError);
        results.push({ success: false, log_id: logId, error: insertError.message });
        recordsFailed++;
        continue;
      }

      console.log("Time clock record created:", {
        employee: employee.full_name,
        type: clockType,
        timestamp,
      });

      results.push({ success: true, log_id: logId });
      recordsSynced++;

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({ success: false, log_id: logId, error: errMsg });
      recordsFailed++;
    }
  }

  // Update sync log
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
      results,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleLegacyPayload(supabase: AnySupabaseClient, payload: ControlIDLegacyPayload) {
  const cpf = payload.cpf?.replace(/\D/g, "") || "";
  
  if (!cpf) {
    console.error("CPF not provided in payload");
    return new Response(
      JSON.stringify({ error: "CPF is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find employee profile by CPF
  const { data: employee, error: employeeError } = await supabase
    .from("employee_profiles")
    .select("id, user_id, full_name")
    .eq("cpf", cpf)
    .single();

  if (employeeError || !employee) {
    console.error("Employee not found for CPF:", cpf);
    return new Response(
      JSON.stringify({ error: "Employee not found", cpf }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Found employee:", employee.full_name);

  // Determine clock type
  const clockType = await determineClockType(supabase, employee.id);

  // Parse timestamp from payload or use current time
  const timestamp = payload.timestamp 
    ? new Date(payload.timestamp).toISOString()
    : new Date().toISOString();

  // Insert time clock record
  const { data: record, error: insertError } = await supabase
    .from("employee_time_clock")
    .insert({
      employee_id: employee.id,
      user_id: employee.user_id,
      clock_type: clockType,
      timestamp,
      source: "controlid",
      device_id: payload.device_id || null,
      verified: payload.verification_type === "biometry" || payload.verification_type === "facial",
      photo_url: payload.photo || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting time clock record:", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to insert record", details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Time clock record created:", {
    employee: employee.full_name,
    type: clockType,
    timestamp,
  });

  return new Response(
    JSON.stringify({
      success: true,
      record: {
        id: record.id,
        employee_name: employee.full_name,
        clock_type: clockType,
        timestamp,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function determineClockType(supabase: AnySupabaseClient, employeeId: string): Promise<"entry" | "exit" | "break_start" | "break_end"> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: lastRecord } = await supabase
    .from("employee_time_clock")
    .select("clock_type, timestamp")
    .eq("employee_id", employeeId)
    .gte("timestamp", today.toISOString())
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (!lastRecord) {
    return "entry";
  }

  switch (lastRecord.clock_type) {
    case "entry":
      return "break_start";
    case "break_start":
      return "break_end";
    case "break_end":
      return "exit";
    case "exit":
      return "entry";
    default:
      return "entry";
  }
}
