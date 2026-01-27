import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserToSync {
  id: number;
  name: string;
  registration: string; // CPF
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active config
    const { data: config, error: configError } = await supabase
      .from("time_clock_config")
      .select("*")
      .eq("is_active", true)
      .single();

    if (configError || !config || !config.device_ip) {
      return new Response(
        JSON.stringify({ error: "Device not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deviceIp = config.device_ip;
    const deviceLogin = config.device_login || "admin";
    const devicePassword = config.device_password || "admin";

    console.log(`Syncing employees to Control iD at ${deviceIp}`);

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
      return new Response(
        JSON.stringify({ error: "Failed to connect to device" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loginData = await loginResponse.json();
    const session = loginData.session;

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with device" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing users from device
    const existingUsersResponse = await fetch(`http://${deviceIp}/load_objects.fcgi?session=${session}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: "users" }),
    });

    const existingUsersData = await existingUsersResponse.json();
    const existingUsers: UserToSync[] = existingUsersData.users || [];
    const existingCpfs = new Set(existingUsers.map(u => u.registration?.replace(/\D/g, "")));

    // Get employees with CPF
    const { data: employees, error: employeesError } = await supabase
      .from("employee_profiles")
      .select("id, user_id, full_name, cpf")
      .not("cpf", "is", null);

    if (employeesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch employees" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ 
      employee_name: string; 
      success: boolean; 
      action: string;
      error?: string;
    }> = [];

    let nextUserId = Math.max(...existingUsers.map(u => u.id), 0) + 1;

    for (const employee of employees || []) {
      const cpf = employee.cpf?.replace(/\D/g, "");
      
      if (!cpf) {
        results.push({ 
          employee_name: employee.full_name, 
          success: false, 
          action: "skipped",
          error: "No CPF" 
        });
        continue;
      }

      // Check if already synced
      const { data: existingMapping } = await supabase
        .from("controlid_user_mappings")
        .select("id, controlid_user_id")
        .eq("employee_id", employee.id)
        .eq("device_id", deviceIp)
        .single();

      if (existingMapping) {
        results.push({ 
          employee_name: employee.full_name, 
          success: true, 
          action: "already_synced" 
        });
        continue;
      }

      // Check if user exists on device by CPF
      const existingOnDevice = existingUsers.find(
        u => u.registration?.replace(/\D/g, "") === cpf
      );

      let controlidUserId: number;

      if (existingOnDevice) {
        controlidUserId = existingOnDevice.id;
        console.log(`Employee ${employee.full_name} already exists on device with ID ${controlidUserId}`);
      } else {
        // Create user on device
        controlidUserId = nextUserId++;
        
        const createUserResponse = await fetch(`http://${deviceIp}/create_objects.fcgi?session=${session}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            object: "users",
            values: [{
              id: controlidUserId,
              name: employee.full_name,
              registration: cpf,
            }],
          }),
        });

        if (!createUserResponse.ok) {
          results.push({ 
            employee_name: employee.full_name, 
            success: false, 
            action: "create_failed",
            error: `Device returned ${createUserResponse.status}` 
          });
          continue;
        }

        console.log(`Created user ${employee.full_name} on device with ID ${controlidUserId}`);
      }

      // Create mapping
      const { error: mappingError } = await supabase
        .from("controlid_user_mappings")
        .insert({
          employee_id: employee.id,
          controlid_user_id: controlidUserId,
          cpf: cpf,
          device_id: deviceIp,
        });

      if (mappingError) {
        results.push({ 
          employee_name: employee.full_name, 
          success: false, 
          action: "mapping_failed",
          error: mappingError.message 
        });
        continue;
      }

      results.push({ 
        employee_name: employee.full_name, 
        success: true, 
        action: existingOnDevice ? "linked" : "created" 
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        failed: failedCount,
        total: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error syncing employees:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
