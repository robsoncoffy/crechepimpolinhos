import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionRequest {
  device_ip: string;
  device_login?: string;
  device_password?: string;
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

    const { device_ip, device_login = "admin", device_password = "admin" }: TestConnectionRequest = await req.json();

    if (!device_ip) {
      return new Response(
        JSON.stringify({ error: "device_ip is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing connection to Control iD at ${device_ip}`);

    // Test login to the device
    const loginUrl = `http://${device_ip}/login.fcgi`;
    
    try {
      const loginResponse = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: device_login,
          password: device_password,
        }),
      });

      if (!loginResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to authenticate with device",
            status: loginResponse.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const loginData = await loginResponse.json();
      
      if (!loginData.session) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid credentials - no session returned",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get device info
      const session = loginData.session;
      const infoUrl = `http://${device_ip}/get_configuration.fcgi?session=${session}`;
      
      const infoResponse = await fetch(infoUrl);
      const deviceInfo = infoResponse.ok ? await infoResponse.json() : null;

      // Get user count
      const usersUrl = `http://${device_ip}/load_objects.fcgi?session=${session}`;
      const usersResponse = await fetch(usersUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: "users",
        }),
      });

      const usersData = usersResponse.ok ? await usersResponse.json() : null;
      const userCount = usersData?.users?.length || 0;

      return new Response(
        JSON.stringify({
          success: true,
          device_info: {
            ip: device_ip,
            name: deviceInfo?.general?.name || "Control iD",
            serial: deviceInfo?.general?.serial || "Unknown",
            firmware: deviceInfo?.general?.firmware || "Unknown",
          },
          user_count: userCount,
          session_valid: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error";
      console.error("Connection error:", fetchError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot connect to device: ${errorMessage}`,
          hint: "Verify the device IP is correct and accessible from the server",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error testing connection:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
