import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteType = "parent" | "employee";

interface DeleteInviteRequest {
  inviteType: InviteType;
  inviteId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    if (rolesError) {
      return new Response(JSON.stringify({ error: rolesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão de administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: DeleteInviteRequest = await req.json();
    const { inviteType, inviteId } = body;

    if (!inviteType || !inviteId) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inviteType === "parent") {
      // Get invite data first to clean up related records
      const { data: inviteRow } = await supabaseAdmin
        .from("parent_invites")
        .select("id, pre_enrollment_id, email, child_name")
        .eq("id", inviteId)
        .maybeSingle();

      if (inviteRow) {
        // Delete related whatsapp_message_logs
        await supabaseAdmin
          .from("whatsapp_message_logs")
          .delete()
          .eq("parent_invite_id", inviteId);

        // Clear any pre_enrollments pointing to this invite
        await supabaseAdmin
          .from("pre_enrollments")
          .update({ converted_to_invite_id: null })
          .eq("converted_to_invite_id", inviteId);

        // Also clear by explicit pre_enrollment_id if present
        if (inviteRow.pre_enrollment_id) {
          await supabaseAdmin
            .from("pre_enrollments")
            .update({ converted_to_invite_id: null })
            .eq("id", inviteRow.pre_enrollment_id);
        }

        // Delete contact_submissions with same email
        if (inviteRow.email) {
          await supabaseAdmin
            .from("contact_submissions")
            .delete()
            .ilike("email", inviteRow.email);
        }
      }

      const { error: delError, count } = await supabaseAdmin
        .from("parent_invites")
        .delete({ count: "exact" })
        .eq("id", inviteId);

      if (delError) throw delError;

      return new Response(
        JSON.stringify({ success: true, deletedCount: count ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (inviteType === "employee") {
      // Get invite data first to clean up related records
      const { data: inviteRow } = await supabaseAdmin
        .from("employee_invites")
        .select("id, employee_email")
        .eq("id", inviteId)
        .maybeSingle();

      if (inviteRow?.employee_email) {
        // Delete contact_submissions with same email
        await supabaseAdmin
          .from("contact_submissions")
          .delete()
          .ilike("email", inviteRow.employee_email);
      }

      const { error: delError, count } = await supabaseAdmin
        .from("employee_invites")
        .delete({ count: "exact" })
        .eq("id", inviteId);

      if (delError) throw delError;

      return new Response(
        JSON.stringify({ success: true, deletedCount: count ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(JSON.stringify({ error: "Tipo de convite inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
