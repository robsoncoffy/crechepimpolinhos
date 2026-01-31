import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticResult {
  source: string;
  found: boolean;
  count?: number;
  details?: string;
}

interface DeleteResult {
  source: string;
  deleted: boolean;
  count?: number;
  error?: string;
}

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
      throw new Error("Apenas administradores podem executar esta ação");
    }

    // Get parameters from request body
    const { userId, email, checkOnly, diagnoseOnly } = await req.json();
    
    if (!userId && !email) {
      throw new Error("ID do usuário ou email não fornecido");
    }

    let targetUserId = userId;
    let authUserEmail: string | null = email || null;
    let authUserDeleted = false;
    let authDeleteAttempted = false;
    let foundByEmail = false;
    let authUserNotFoundByEmail = false;

    // If only email is provided (or we need to find by email), search for the user
    if (!targetUserId && email) {
      console.log(`Searching for user by email: ${email}`);
      
      // IMPORTANT: listUsers is paginated. If we only fetch the first page,
      // we can miss the target user and incorrectly claim the email was "released".
      const normalizedEmail = email.trim().toLowerCase();
      const perPage = 1000;
      let page = 1;
      let foundUser: any | null = null;

      while (!foundUser) {
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

        if (listError) {
          throw new Error(`Erro ao listar usuários de autenticação: ${listError.message}`);
        }

        const users = usersData?.users ?? [];
        foundUser = users.find((u: any) => (u.email ?? "").trim().toLowerCase() === normalizedEmail) ?? null;

        // Last page when the result count is less than perPage
        if (foundUser || users.length < perPage) {
          break;
        }

        page += 1;
        // Safety limit to avoid infinite loops
        if (page > 50) {
          break;
        }
      }

      if (foundUser) {
        targetUserId = foundUser.id;
        authUserEmail = foundUser.email || null;
        foundByEmail = true;
        console.log(`Found user by email: ${foundUser.id} (page ${page})`);
      } else {
        authUserNotFoundByEmail = true;
        console.log(`No auth user found with email after pagination: ${email}`);
      }
    }

    // Prevent admin from deleting themselves
    if (targetUserId && targetUserId === requestingUser.id) {
      throw new Error("Você não pode deletar sua própria conta");
    }

    console.log(`Processing user: ${targetUserId || "(by email only)"}, email: ${authUserEmail || email}`);

    // If we have a userId, try to get user info
    if (targetUserId) {
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

      if (getUserError || !targetUser?.user) {
        console.log(`Auth lookup failed for ${targetUserId}: ${getUserError?.message ?? "user not found"}`);
      } else {
        authUserEmail = targetUser.user.email || authUserEmail;
        console.log(`Found auth user: ${authUserEmail}`);
      }
    }

    const searchEmail = authUserEmail || email;

    // DIAGNOSTIC MODE: Check all sources for this email
    if (diagnoseOnly) {
      const diagnostics: DiagnosticResult[] = [];

      // Check auth.users
      diagnostics.push({
        source: "auth.users (Autenticação)",
        found: !!targetUserId,
        details: targetUserId ? `ID: ${targetUserId}` : undefined,
      });

      // Check profiles table by user_id
      if (targetUserId) {
        const { data: profileData, count: profileCount } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name", { count: "exact" })
          .eq("user_id", targetUserId);
        diagnostics.push({
          source: "profiles (por user_id)",
          found: (profileCount || 0) > 0,
          count: profileCount || 0,
          details: profileData?.[0]?.full_name,
        });
      } else {
        diagnostics.push({ source: "profiles (por user_id)", found: false, count: 0 });
      }

      // Check profiles table by email (detect orphans)
      if (searchEmail) {
        const { data: profileByEmail, count: profileByEmailCount } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, user_id", { count: "exact" })
          .ilike("email", searchEmail);
        
        const isOrphan = profileByEmail?.[0] && (!targetUserId || profileByEmail[0].user_id !== targetUserId);
        diagnostics.push({
          source: "profiles (por email" + (isOrphan ? " - ÓRFÃO!" : "") + ")",
          found: (profileByEmailCount || 0) > 0,
          count: profileByEmailCount || 0,
          details: profileByEmail?.[0] 
            ? `${profileByEmail[0].full_name} (user_id: ${profileByEmail[0].user_id || 'null'})`
            : undefined,
        });
      }

      // Check parent_invites by email
      if (searchEmail) {
        const { count: inviteCount } = await supabaseAdmin
          .from("parent_invites")
          .select("id", { count: "exact" })
          .ilike("email", searchEmail);
        diagnostics.push({
          source: "parent_invites (Convites de Pais)",
          found: (inviteCount || 0) > 0,
          count: inviteCount || 0,
        });
      }

      // Check guardian_invitations by email
      if (searchEmail) {
        const { count: guardianCount } = await supabaseAdmin
          .from("guardian_invitations")
          .select("id", { count: "exact" })
          .ilike("invited_email", searchEmail);
        diagnostics.push({
          source: "guardian_invitations (Convites de Responsável)",
          found: (guardianCount || 0) > 0,
          count: guardianCount || 0,
        });
      }

      // Check contact_submissions by email
      if (searchEmail) {
        const { count: contactCount } = await supabaseAdmin
          .from("contact_submissions")
          .select("id", { count: "exact" })
          .ilike("email", searchEmail);
        diagnostics.push({
          source: "contact_submissions (Formulário de Contato)",
          found: (contactCount || 0) > 0,
          count: contactCount || 0,
        });
      }

      // Check pre_enrollments by email
      if (searchEmail) {
        const { count: preEnrollCount } = await supabaseAdmin
          .from("pre_enrollments")
          .select("id", { count: "exact" })
          .ilike("email", searchEmail);
        diagnostics.push({
          source: "pre_enrollments (Pré-Matrículas)",
          found: (preEnrollCount || 0) > 0,
          count: preEnrollCount || 0,
        });
      }

      // Check employee_invites by email
      if (searchEmail) {
        const { count: empInviteCount } = await supabaseAdmin
          .from("employee_invites")
          .select("id", { count: "exact" })
          .ilike("employee_email", searchEmail);
        diagnostics.push({
          source: "employee_invites (Convites de Funcionários)",
          found: (empInviteCount || 0) > 0,
          count: empInviteCount || 0,
        });
      }

      // Check user_roles
      if (targetUserId) {
        const { count: rolesCount } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact" })
          .eq("user_id", targetUserId);
        diagnostics.push({
          source: "user_roles",
          found: (rolesCount || 0) > 0,
          count: rolesCount || 0,
        });
      }

      // Check employee_profiles
      if (targetUserId) {
        const { count: empCount } = await supabaseAdmin
          .from("employee_profiles")
          .select("id", { count: "exact" })
          .eq("user_id", targetUserId);
        diagnostics.push({
          source: "employee_profiles",
          found: (empCount || 0) > 0,
          count: empCount || 0,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: authUserEmail || email,
          userId: targetUserId,
          diagnostics,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If checkOnly is true, just return the email info without deleting
    if (checkOnly) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          email: authUserEmail,
          userId: targetUserId
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // ============ DELETION PHASE ============
    const deleteResults: DeleteResult[] = [];
    const originalEmail = authUserEmail || email;
    
    // Delete from related tables first (in order of dependencies)
    if (targetUserId) {
      // ============ FIND ORPHANED CHILDREN BEFORE DELETING LINKS ============
      // Get all children linked to this parent
      const { data: linkedChildren } = await supabaseAdmin
        .from("parent_children")
        .select("child_id")
        .eq("parent_id", targetUserId);
      
      const childIdsToCheck = linkedChildren?.map((pc) => pc.child_id) || [];

      // Delete parent_children links
      const { error: parentChildrenError, count: pcCount } = await supabaseAdmin
        .from("parent_children")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "parent_children",
        deleted: !parentChildrenError,
        count: pcCount || 0,
        error: parentChildrenError?.message,
      });

      // ============ DELETE ORPHANED CHILDREN (no remaining parents) ============
      if (childIdsToCheck.length > 0) {
        // Check which children no longer have any parents
        const { data: remainingLinks } = await supabaseAdmin
          .from("parent_children")
          .select("child_id")
          .in("child_id", childIdsToCheck);
        
        const childrenWithParents = new Set(remainingLinks?.map((l) => l.child_id) || []);
        const orphanedChildIds = childIdsToCheck.filter((id) => !childrenWithParents.has(id));
        
        if (orphanedChildIds.length > 0) {
          console.log(`Found ${orphanedChildIds.length} orphaned children to delete: ${orphanedChildIds.join(", ")}`);
          
          // Delete all related records for orphaned children
          for (const childId of orphanedChildIds) {
            // Delete messages
            await supabaseAdmin.from("messages").delete().eq("child_id", childId);
            // Delete attendance
            await supabaseAdmin.from("attendance").delete().eq("child_id", childId);
            // Delete daily_records
            await supabaseAdmin.from("daily_records").delete().eq("child_id", childId);
            // Delete meal_tracking
            await supabaseAdmin.from("meal_tracking").delete().eq("child_id", childId);
            // Delete monthly_tracking
            await supabaseAdmin.from("monthly_tracking").delete().eq("child_id", childId);
            // Delete quarterly_evaluations
            await supabaseAdmin.from("quarterly_evaluations").delete().eq("child_id", childId);
            // Delete gallery_photos
            await supabaseAdmin.from("gallery_photos").delete().eq("child_id", childId);
            // Delete announcements targeting this child
            await supabaseAdmin.from("announcements").delete().eq("child_id", childId);
            // Delete pickup_notifications
            await supabaseAdmin.from("pickup_notifications").delete().eq("child_id", childId);
          }
          
          // Delete orphaned children
          const { error: orphanDeleteError, count: orphanCount } = await supabaseAdmin
            .from("children")
            .delete({ count: "exact" })
            .in("id", orphanedChildIds);
          
          deleteResults.push({
            source: "children (orphaned)",
            deleted: !orphanDeleteError,
            count: orphanCount || 0,
            error: orphanDeleteError?.message,
          });
          
          console.log(`Deleted ${orphanCount} orphaned children`);
        }
      }

      // Delete pickup_notifications
      const { error: pickupError, count: pickupCount } = await supabaseAdmin
        .from("pickup_notifications")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "pickup_notifications",
        deleted: !pickupError,
        count: pickupCount || 0,
        error: pickupError?.message,
      });

      // Delete enrollment_contracts
      const { error: contractsError, count: contractsCount } = await supabaseAdmin
        .from("enrollment_contracts")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "enrollment_contracts",
        deleted: !contractsError,
        count: contractsCount || 0,
        error: contractsError?.message,
      });

      // Delete invoices
      const { error: invoicesError, count: invoicesCount } = await supabaseAdmin
        .from("invoices")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "invoices",
        deleted: !invoicesError,
        count: invoicesCount || 0,
        error: invoicesError?.message,
      });

      // Delete subscriptions
      const { error: subscriptionsError, count: subsCount } = await supabaseAdmin
        .from("subscriptions")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "subscriptions",
        deleted: !subscriptionsError,
        count: subsCount || 0,
        error: subscriptionsError?.message,
      });

      // Delete payment_customers
      const { error: paymentCustomersError, count: paymentCount } = await supabaseAdmin
        .from("payment_customers")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "payment_customers",
        deleted: !paymentCustomersError,
        count: paymentCount || 0,
        error: paymentCustomersError?.message,
      });

      // Delete from child_registrations
      const { error: regError, count: regCount } = await supabaseAdmin
        .from("child_registrations")
        .delete({ count: "exact" })
        .eq("parent_id", targetUserId);
      deleteResults.push({
        source: "child_registrations",
        deleted: !regError,
        count: regCount || 0,
        error: regError?.message,
      });

      // Delete from user_roles
      const { error: rolesError, count: rolesCount } = await supabaseAdmin
        .from("user_roles")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      deleteResults.push({
        source: "user_roles",
        deleted: !rolesError,
        count: rolesCount || 0,
        error: rolesError?.message,
      });

      // Delete from notifications
      const { error: notifError, count: notifCount } = await supabaseAdmin
        .from("notifications")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      deleteResults.push({
        source: "notifications",
        deleted: !notifError,
        count: notifCount || 0,
        error: notifError?.message,
      });

      // Delete from announcement_reads
      const { error: announcementError, count: annCount } = await supabaseAdmin
        .from("announcement_reads")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      deleteResults.push({
        source: "announcement_reads",
        deleted: !announcementError,
        count: annCount || 0,
        error: announcementError?.message,
      });

      // Delete from push_subscriptions
      const { error: pushError, count: pushCount } = await supabaseAdmin
        .from("push_subscriptions")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      deleteResults.push({
        source: "push_subscriptions",
        deleted: !pushError,
        count: pushCount || 0,
        error: pushError?.message,
      });

      // ============ CLEAR ASAAS REFERENCES (to avoid FK constraint on profiles) ============
      await supabaseAdmin
        .from("asaas_customers")
        .update({ linked_parent_id: null })
        .eq("linked_parent_id", targetUserId);
      await supabaseAdmin
        .from("asaas_payments")
        .update({ linked_parent_id: null })
        .eq("linked_parent_id", targetUserId);
      await supabaseAdmin
        .from("asaas_subscriptions")
        .update({ linked_parent_id: null })
        .eq("linked_parent_id", targetUserId);

      // Delete employee_profile if exists
      const { error: empProfileError, count: empCount } = await supabaseAdmin
        .from("employee_profiles")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      deleteResults.push({
        source: "employee_profiles",
        deleted: !empProfileError,
        count: empCount || 0,
        error: empProfileError?.message,
      });

      // Delete from profiles
      const { error: profileError, count: profileCount } = await supabaseAdmin
        .from("profiles")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      deleteResults.push({
        source: "profiles",
        deleted: !profileError,
        count: profileCount || 0,
        error: profileError?.message,
      });
    }

    // ============ DELETE BY EMAIL (invites, contacts, pre-enrollments) ============
    if (searchEmail) {
      // Delete parent_invites by email
      const { error: parentInvError, count: parentInvCount } = await supabaseAdmin
        .from("parent_invites")
        .delete({ count: "exact" })
        .ilike("email", searchEmail);
      deleteResults.push({
        source: "parent_invites",
        deleted: !parentInvError,
        count: parentInvCount || 0,
        error: parentInvError?.message,
      });

      // Delete guardian_invitations by email
      const { error: guardianInvError, count: guardianInvCount } = await supabaseAdmin
        .from("guardian_invitations")
        .delete({ count: "exact" })
        .ilike("invited_email", searchEmail);
      deleteResults.push({
        source: "guardian_invitations",
        deleted: !guardianInvError,
        count: guardianInvCount || 0,
        error: guardianInvError?.message,
      });

      // Delete contact_submissions by email
      const { error: contactError, count: contactCount } = await supabaseAdmin
        .from("contact_submissions")
        .delete({ count: "exact" })
        .ilike("email", searchEmail);
      deleteResults.push({
        source: "contact_submissions",
        deleted: !contactError,
        count: contactCount || 0,
        error: contactError?.message,
      });

      // Delete pre_enrollments by email
      const { error: preEnrollError, count: preEnrollCount } = await supabaseAdmin
        .from("pre_enrollments")
        .delete({ count: "exact" })
        .ilike("email", searchEmail);
      deleteResults.push({
        source: "pre_enrollments",
        deleted: !preEnrollError,
        count: preEnrollCount || 0,
        error: preEnrollError?.message,
      });

      // Delete employee_invites by email
      const { error: empInviteError, count: empInviteCount } = await supabaseAdmin
        .from("employee_invites")
        .delete({ count: "exact" })
        .ilike("employee_email", searchEmail);
      deleteResults.push({
        source: "employee_invites",
        deleted: !empInviteError,
        count: empInviteCount || 0,
        error: empInviteError?.message,
      });

      // ============ DELETE ORPHAN PROFILES BY EMAIL (fallback) ============
      // This catches profiles that weren't deleted by userId (e.g., auth was deleted but profile remained)
      const { data: orphanedProfiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .ilike("email", searchEmail);
      
      for (const orphan of (orphanedProfiles || [])) {
        if (orphan.user_id && orphan.user_id !== targetUserId) {
          console.log(`Found orphan profile with user_id ${orphan.user_id} for email ${searchEmail}, cleaning up...`);
          // Clear asaas references before deleting
          await supabaseAdmin.from("asaas_customers").update({ linked_parent_id: null }).eq("linked_parent_id", orphan.user_id);
          await supabaseAdmin.from("asaas_payments").update({ linked_parent_id: null }).eq("linked_parent_id", orphan.user_id);
          await supabaseAdmin.from("asaas_subscriptions").update({ linked_parent_id: null }).eq("linked_parent_id", orphan.user_id);
          // Also clean other tables that might reference this orphan
          await supabaseAdmin.from("user_roles").delete().eq("user_id", orphan.user_id);
          await supabaseAdmin.from("employee_profiles").delete().eq("user_id", orphan.user_id);
          await supabaseAdmin.from("notifications").delete().eq("user_id", orphan.user_id);
          await supabaseAdmin.from("announcement_reads").delete().eq("user_id", orphan.user_id);
          await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", orphan.user_id);
        }
      }
      
      // Delete orphan profiles by email
      const { error: orphanProfileError, count: orphanProfileCount } = await supabaseAdmin
        .from("profiles")
        .delete({ count: "exact" })
        .ilike("email", searchEmail);
      
      if (orphanProfileCount && orphanProfileCount > 0) {
        deleteResults.push({
          source: "profiles (órfãos por email)",
          deleted: !orphanProfileError,
          count: orphanProfileCount,
          error: (orphanProfileError as any)?.message,
        });
        console.log(`Deleted ${orphanProfileCount} orphan profile(s) by email: ${searchEmail}`);
      }
    }

    // ============ DELETE AUTH USER ============
    if (targetUserId) {
      authDeleteAttempted = true;
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        if (deleteError.message?.includes("not found")) {
          console.log("Auth user already deleted or not found");
          authUserDeleted = true;
        } else {
          console.log(`Auth delete failed for ${targetUserId}: ${deleteError.message}`);
          deleteResults.push({
            source: "auth.users",
            deleted: false,
            error: deleteError.message,
          });
        }
      } else {
        authUserDeleted = true;
        console.log(`Successfully deleted auth user: ${targetUserId}`);
        deleteResults.push({
          source: "auth.users (Autenticação)",
          deleted: true,
          count: 1,
        });
      }
    } else if (searchEmail && authUserNotFoundByEmail) {
      // We paginated through auth users and did not find this email.
      // In this case, there is no auth account to delete.
      authUserDeleted = true;
      deleteResults.push({
        source: "auth.users (Autenticação)",
        deleted: true,
        count: 0,
      });
    }

    // ============ AUDIT LOG ============
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", requestingUser.id)
      .single();

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: requestingUser.id,
      admin_email: requestingUser.email,
      action_type: "user_deletion",
      target_user_id: targetUserId || null,
      target_email: originalEmail,
      details: {
        admin_name: adminProfile?.full_name,
        found_by_email: foundByEmail,
        delete_results: deleteResults,
      },
      success: authUserDeleted,
      error_message: authUserDeleted ? null : "Falha ao deletar usuário do auth",
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: authUserDeleted 
          ? "Usuário deletado com sucesso - email liberado para novo cadastro"
          : "Dados do banco removidos, mas houve problema ao deletar conta de autenticação",
        authUserDeleted,
        authDeleteAttempted,
        foundByEmail,
        email: originalEmail,
        userId: targetUserId,
        deleteResults,
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
