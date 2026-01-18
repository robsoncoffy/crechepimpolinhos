import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface ControlIDPayload {
  id?: string;
  user_id?: string;
  cpf?: string;
  pis?: string;
  name?: string;
  timestamp?: string;
  device_id?: string;
  verification_type?: string; // 'biometry' | 'card' | 'facial' | 'password'
  photo?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
      .select("webhook_secret, is_active")
      .eq("is_active", true)
      .single();

    if (!config) {
      console.error("No active time clock configuration found");
      return new Response(
        JSON.stringify({ error: "Configuration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (webhookSecret && config.webhook_secret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ControlIDPayload = await req.json();
    console.log("Received Control iD payload:", JSON.stringify(payload, null, 2));

    // Find employee by CPF
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

    // Get the last clock record for today to determine entry/exit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: lastRecord } = await supabase
      .from("employee_time_clock")
      .select("clock_type, timestamp")
      .eq("employee_id", employee.id)
      .gte("timestamp", today.toISOString())
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    // Determine clock type based on last record
    let clockType: "entry" | "exit" | "break_start" | "break_end" = "entry";
    
    if (lastRecord) {
      switch (lastRecord.clock_type) {
        case "entry":
          clockType = "break_start";
          break;
        case "break_start":
          clockType = "break_end";
          break;
        case "break_end":
          clockType = "exit";
          break;
        case "exit":
          clockType = "entry"; // New day or re-entry
          break;
      }
    }

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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
