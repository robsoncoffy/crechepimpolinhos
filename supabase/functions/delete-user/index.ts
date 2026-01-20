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

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify that the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !requestingUser) {
      throw new Error("Não autorizado");
    }

    // Check if requesting user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Apenas administradores podem deletar usuários");
    }

    // Get user_id to delete from request body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("ID do usuário não fornecido");
    }

    // Prevent admin from deleting themselves
    if (userId === requestingUser.id) {
      throw new Error("Você não pode deletar sua própria conta");
    }

    console.log(`Attempting to delete user: ${userId}`);

    // Optional: try to get the user from auth for logging purposes.
    // IMPORTANT: we should NOT rely on this lookup to decide whether to delete.
    const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    let authUserDeleted = false;
    let authUserEmail: string | null = null;
    let authDeleteAttempted = false;

    if (getUserError || !targetUser?.user) {
      console.log(
        `Auth lookup failed or user not found for ${userId}. getUserError=${getUserError?.message ?? "none"}`
      );

      // Try to find something for logs (profile name)
      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        console.log(`Found profile for user ${userId}: ${profileData.full_name}`);
      }
    } else {
      authUserEmail = targetUser.user.email || null;
      console.log(`Found auth user: ${authUserEmail}`);
    }

    // Delete from related tables first (in order of dependencies)
    
    // Delete parent_children links
    const { error: parentChildrenError } = await supabaseAdmin
      .from("parent_children")
      .delete()
      .eq("parent_id", userId);
    if (parentChildrenError) {
      console.log("Error deleting parent_children:", parentChildrenError.message);
    }

    // Delete pickup_notifications
    const { error: pickupError } = await supabaseAdmin
      .from("pickup_notifications")
      .delete()
      .eq("parent_id", userId);
    if (pickupError) {
      console.log("Error deleting pickup_notifications:", pickupError.message);
    }

    // Delete enrollment_contracts
    const { error: contractsError } = await supabaseAdmin
      .from("enrollment_contracts")
      .delete()
      .eq("parent_id", userId);
    if (contractsError) {
      console.log("Error deleting enrollment_contracts:", contractsError.message);
    }

    // Delete invoices
    const { error: invoicesError } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("parent_id", userId);
    if (invoicesError) {
      console.log("Error deleting invoices:", invoicesError.message);
    }

    // Delete subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("parent_id", userId);
    if (subscriptionsError) {
      console.log("Error deleting subscriptions:", subscriptionsError.message);
    }

    // Delete payment_customers
    const { error: paymentCustomersError } = await supabaseAdmin
      .from("payment_customers")
      .delete()
      .eq("parent_id", userId);
    if (paymentCustomersError) {
      console.log("Error deleting payment_customers:", paymentCustomersError.message);
    }

    // Delete from child_registrations
    const { error: regError } = await supabaseAdmin
      .from("child_registrations")
      .delete()
      .eq("parent_id", userId);
    if (regError) {
      console.log("Error deleting child_registrations:", regError.message);
    }

    // Delete from user_roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesError) {
      console.log("Error deleting user_roles:", rolesError.message);
    }

    // Delete from notifications
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", userId);
    if (notifError) {
      console.log("Error deleting notifications:", notifError.message);
    }

    // Delete from announcement_reads
    const { error: announcementError } = await supabaseAdmin
      .from("announcement_reads")
      .delete()
      .eq("user_id", userId);
    if (announcementError) {
      console.log("Error deleting announcement_reads:", announcementError.message);
    }

    // Delete from push_subscriptions
    const { error: pushError } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);
    if (pushError) {
      console.log("Error deleting push_subscriptions:", pushError.message);
    }

    // Delete employee_profile if exists
    const { error: empProfileError } = await supabaseAdmin
      .from("employee_profiles")
      .delete()
      .eq("user_id", userId);
    if (empProfileError) {
      console.log("Error deleting employee_profiles:", empProfileError.message);
    }

    // Delete from profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    if (profileError) {
      console.log("Error deleting profiles:", profileError.message);
    }

    // Finally, ALWAYS attempt to delete the auth user.
    // Even if the lookup fails, we still try to delete to ensure the email is actually freed.
    authDeleteAttempted = true;
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // If still getting "user not found", the user might have been deleted already
      if (deleteError.message?.includes("not found")) {
        console.log("Auth user already deleted or not found");
        authUserDeleted = true;
      } else {
        console.log(`Auth delete failed for ${userId}: ${deleteError.message}`);
        throw deleteError;
      }
    } else {
      authUserDeleted = true;
      console.log(`Successfully deleted auth user: ${userId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário deletado com sucesso",
        authUserDeleted,
        authDeleteAttempted,
        email: authUserEmail
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao deletar usuário";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
