import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Não autorizado");
    }

    // Get parameters from request body
    const { inviteCode } = await req.json();
    
    if (!inviteCode) {
      throw new Error("Código de convite não fornecido");
    }

    // Validate the invite code and get the role
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("employee_invites")
      .select("*")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      throw new Error("Código de convite inválido ou expirado");
    }

    const roleToAssign = invite.role;
    if (!roleToAssign) {
      throw new Error("Cargo não definido no convite");
    }

    console.log(`Assigning role ${roleToAssign} to user ${user.id}`);

    // Delete any existing "parent" role that was auto-assigned by the trigger
    const { error: deleteRoleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "parent");

    if (deleteRoleError) {
      console.log("Error deleting parent role (might not exist):", deleteRoleError.message);
    }

    // Insert the correct staff role from the invite
    const { error: insertRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: roleToAssign,
      });

    if (insertRoleError) {
      // If the role already exists, that's fine
      if (!insertRoleError.message?.includes("duplicate")) {
        console.error("Error inserting role:", insertRoleError);
        throw new Error("Erro ao atribuir cargo");
      }
    }

    // Mark invite as used
    const { error: updateInviteError } = await supabaseAdmin
      .from("employee_invites")
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateInviteError) {
      console.error("Error updating invite:", updateInviteError);
    }

    console.log(`Successfully assigned role ${roleToAssign} to user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        role: roleToAssign,
        message: "Cargo atribuído com sucesso"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar solicitação";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
