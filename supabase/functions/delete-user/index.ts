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

    // Get userId OR email from request body
    const { userId, email } = await req.json();
    
    if (!userId && !email) {
      throw new Error("ID do usuário ou email não fornecido");
    }

    let targetUserId = userId;
    let authUserEmail: string | null = email || null;
    let authUserDeleted = false;
    let authDeleteAttempted = false;
    let foundByEmail = false;

    // If only email is provided (or we need to find by email), search for the user
    if (!targetUserId && email) {
      console.log(`Searching for user by email: ${email}`);
      
      // List all users and find by email (supabase-js doesn't have getUserByEmail)
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listError) {
        console.log(`Error listing users: ${listError.message}`);
      } else if (usersData?.users) {
        const foundUser = usersData.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (foundUser) {
          targetUserId = foundUser.id;
          authUserEmail = foundUser.email || null;
          foundByEmail = true;
          console.log(`Found user by email: ${foundUser.id}`);
        } else {
          console.log(`No auth user found with email: ${email}`);
        }
      }
    }

    // Prevent admin from deleting themselves
    if (targetUserId && targetUserId === requestingUser.id) {
      throw new Error("Você não pode deletar sua própria conta");
    }

    console.log(`Attempting to delete user: ${targetUserId || "(by email only)"}, email: ${authUserEmail}`);

    // If we have a userId, try to get user info for logging
    if (targetUserId) {
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

      if (getUserError || !targetUser?.user) {
        console.log(
          `Auth lookup failed or user not found for ${targetUserId}. getUserError=${getUserError?.message ?? "none"}`
        );
      } else {
        authUserEmail = targetUser.user.email || authUserEmail;
        console.log(`Found auth user: ${authUserEmail}`);
      }
    }

    // Delete from related tables first (in order of dependencies)
    // We'll try to delete by both user_id and also search profiles by email if needed
    
    if (targetUserId) {
      // Delete parent_children links
      const { error: parentChildrenError } = await supabaseAdmin
        .from("parent_children")
        .delete()
        .eq("parent_id", targetUserId);
      if (parentChildrenError) {
        console.log("Error deleting parent_children:", parentChildrenError.message);
      }

      // Delete pickup_notifications
      const { error: pickupError } = await supabaseAdmin
        .from("pickup_notifications")
        .delete()
        .eq("parent_id", targetUserId);
      if (pickupError) {
        console.log("Error deleting pickup_notifications:", pickupError.message);
      }

      // Delete enrollment_contracts
      const { error: contractsError } = await supabaseAdmin
        .from("enrollment_contracts")
        .delete()
        .eq("parent_id", targetUserId);
      if (contractsError) {
        console.log("Error deleting enrollment_contracts:", contractsError.message);
      }

      // Delete invoices
      const { error: invoicesError } = await supabaseAdmin
        .from("invoices")
        .delete()
        .eq("parent_id", targetUserId);
      if (invoicesError) {
        console.log("Error deleting invoices:", invoicesError.message);
      }

      // Delete subscriptions
      const { error: subscriptionsError } = await supabaseAdmin
        .from("subscriptions")
        .delete()
        .eq("parent_id", targetUserId);
      if (subscriptionsError) {
        console.log("Error deleting subscriptions:", subscriptionsError.message);
      }

      // Delete payment_customers
      const { error: paymentCustomersError } = await supabaseAdmin
        .from("payment_customers")
        .delete()
        .eq("parent_id", targetUserId);
      if (paymentCustomersError) {
        console.log("Error deleting payment_customers:", paymentCustomersError.message);
      }

      // Delete from child_registrations
      const { error: regError } = await supabaseAdmin
        .from("child_registrations")
        .delete()
        .eq("parent_id", targetUserId);
      if (regError) {
        console.log("Error deleting child_registrations:", regError.message);
      }

      // Delete from user_roles
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (rolesError) {
        console.log("Error deleting user_roles:", rolesError.message);
      }

      // Delete from notifications
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", targetUserId);
      if (notifError) {
        console.log("Error deleting notifications:", notifError.message);
      }

      // Delete from announcement_reads
      const { error: announcementError } = await supabaseAdmin
        .from("announcement_reads")
        .delete()
        .eq("user_id", targetUserId);
      if (announcementError) {
        console.log("Error deleting announcement_reads:", announcementError.message);
      }

      // Delete from push_subscriptions
      const { error: pushError } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("user_id", targetUserId);
      if (pushError) {
        console.log("Error deleting push_subscriptions:", pushError.message);
      }

      // Delete employee_profile if exists
      const { error: empProfileError } = await supabaseAdmin
        .from("employee_profiles")
        .delete()
        .eq("user_id", targetUserId);
      if (empProfileError) {
        console.log("Error deleting employee_profiles:", empProfileError.message);
      }

      // Delete from profiles
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", targetUserId);
      if (profileError) {
        console.log("Error deleting profiles:", profileError.message);
      }

      // Finally, attempt to delete the auth user
      authDeleteAttempted = true;
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        if (deleteError.message?.includes("not found")) {
          console.log("Auth user already deleted or not found");
          authUserDeleted = true;
        } else {
          console.log(`Auth delete failed for ${targetUserId}: ${deleteError.message}`);
          // Don't throw here - we still want to report partial success
        }
      } else {
        authUserDeleted = true;
        console.log(`Successfully deleted auth user: ${targetUserId}`);
      }
    }

    // If we only have email and didn't find a userId, still try to clean up any orphaned data
    if (!targetUserId && email) {
      console.log(`No user ID found for email ${email}, but database records should be clean.`);
      // The email doesn't exist in auth.users, so it should be free for registration
      authUserDeleted = true; // It's effectively "deleted" since it doesn't exist
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: authUserDeleted 
          ? "Usuário deletado com sucesso - email liberado para novo cadastro"
          : "Dados do banco removidos, mas houve problema ao deletar conta de autenticação",
        authUserDeleted,
        authDeleteAttempted,
        foundByEmail,
        email: authUserEmail,
        userId: targetUserId
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
