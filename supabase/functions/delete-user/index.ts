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

      // ============ DELETE FROM ADDITIONAL TABLES (comprehensive cleanup) ============
      
      // Delete staff_messages sent by this user
      const { error: staffMsgError, count: staffMsgCount } = await supabaseAdmin
        .from("staff_messages")
        .delete({ count: "exact" })
        .eq("sender_id", targetUserId);
      if (staffMsgCount && staffMsgCount > 0) {
        deleteResults.push({
          source: "staff_messages",
          deleted: !staffMsgError,
          count: staffMsgCount,
          error: (staffMsgError as any)?.message,
        });
      }

      // Delete messages sent by this user (sender_id)
      const { error: msgSenderError, count: msgSenderCount } = await supabaseAdmin
        .from("messages")
        .delete({ count: "exact" })
        .eq("sender_id", targetUserId);
      if (msgSenderCount && msgSenderCount > 0) {
        deleteResults.push({
          source: "messages (sender)",
          deleted: !msgSenderError,
          count: msgSenderCount,
          error: (msgSenderError as any)?.message,
        });
      }

      // Delete school_feed created by this user
      const { error: feedError, count: feedCount } = await supabaseAdmin
        .from("school_feed")
        .delete({ count: "exact" })
        .eq("created_by", targetUserId);
      if (feedCount && feedCount > 0) {
        deleteResults.push({
          source: "school_feed",
          deleted: !feedError,
          count: feedCount,
          error: (feedError as any)?.message,
        });
      }

      // Delete announcements created by this user (not targeting children)
      await supabaseAdmin
        .from("announcements")
        .delete()
        .eq("created_by", targetUserId);

      // Delete gallery_photos created by this user
      await supabaseAdmin
        .from("gallery_photos")
        .delete()
        .eq("created_by", targetUserId);

      // Delete teacher_assignments
      const { error: teacherAssignError, count: teacherAssignCount } = await supabaseAdmin
        .from("teacher_assignments")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      if (teacherAssignCount && teacherAssignCount > 0) {
        deleteResults.push({
          source: "teacher_assignments",
          deleted: !teacherAssignError,
          count: teacherAssignCount,
          error: (teacherAssignError as any)?.message,
        });
      }

      // Clear attendance recorded_by reference (set to null, don't delete)
      await supabaseAdmin
        .from("attendance")
        .update({ recorded_by: null })
        .eq("recorded_by", targetUserId);

      // Clear daily_records teacher_id reference
      await supabaseAdmin
        .from("daily_records")
        .update({ teacher_id: null })
        .eq("teacher_id", targetUserId);

      // Delete employee_absences
      const { error: absencesError, count: absencesCount } = await supabaseAdmin
        .from("employee_absences")
        .delete({ count: "exact" })
        .eq("employee_id", targetUserId);
      if (absencesCount && absencesCount > 0) {
        deleteResults.push({
          source: "employee_absences",
          deleted: !absencesError,
          count: absencesCount,
          error: (absencesError as any)?.message,
        });
      }
      // Clear approved_by reference in employee_absences
      await supabaseAdmin
        .from("employee_absences")
        .update({ approved_by: null })
        .eq("approved_by", targetUserId);

      // Delete employee_documents
      const { error: empDocsError, count: empDocsCount } = await supabaseAdmin
        .from("employee_documents")
        .delete({ count: "exact" })
        .eq("employee_user_id", targetUserId);
      if (empDocsCount && empDocsCount > 0) {
        deleteResults.push({
          source: "employee_documents",
          deleted: !empDocsError,
          count: empDocsCount,
          error: (empDocsError as any)?.message,
        });
      }
      // Clear created_by reference in employee_documents
      await supabaseAdmin
        .from("employee_documents")
        .update({ created_by: null })
        .eq("created_by", targetUserId);

      // Delete employee_time_clock
      const { error: timeClockError, count: timeClockCount } = await supabaseAdmin
        .from("employee_time_clock")
        .delete({ count: "exact" })
        .eq("user_id", targetUserId);
      if (timeClockCount && timeClockCount > 0) {
        deleteResults.push({
          source: "employee_time_clock",
          deleted: !timeClockError,
          count: timeClockCount,
          error: (timeClockError as any)?.message,
        });
      }
      // Clear created_by reference
      await supabaseAdmin
        .from("employee_time_clock")
        .update({ created_by: null })
        .eq("created_by", targetUserId);

      // Delete controlid_user_mappings (get employee_profile id first)
      const { data: empProfile } = await supabaseAdmin
        .from("employee_profiles")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (empProfile?.id) {
        await supabaseAdmin
          .from("controlid_user_mappings")
          .delete()
          .eq("employee_id", empProfile.id);
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

      // ============ DELETE WHATSAPP LOGS RELATED TO THIS EMAIL ============
      // First, get all parent_invite IDs for this email to clean up related whatsapp logs
      const { data: parentInviteIds } = await supabaseAdmin
        .from("parent_invites")
        .select("id")
        .ilike("email", searchEmail);
      
      if (parentInviteIds && parentInviteIds.length > 0) {
        const inviteIdList = parentInviteIds.map((inv: any) => inv.id);
        const { count: waLogCount } = await supabaseAdmin
          .from("whatsapp_message_logs")
          .delete({ count: "exact" })
          .in("parent_invite_id", inviteIdList);
        if (waLogCount && waLogCount > 0) {
          deleteResults.push({
            source: "whatsapp_message_logs",
            deleted: true,
            count: waLogCount,
          });
        }
      }

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

    // ============ DELETE STORAGE FILES ============
    // Delete files from child-documents bucket
    if (targetUserId) {
      const bucketsToClean = ["child-documents", "employee-documents", "gallery-photos"];
      
      for (const bucketName of bucketsToClean) {
        try {
          // List all files in user's folder
          const { data: folderFiles } = await supabaseAdmin.storage
            .from(bucketName)
            .list(targetUserId, { limit: 1000 });
          
          if (folderFiles && folderFiles.length > 0) {
            const filePaths = folderFiles.map((f: any) => `${targetUserId}/${f.name}`);
            const { error: deleteStorageError } = await supabaseAdmin.storage
              .from(bucketName)
              .remove(filePaths);
            
            if (!deleteStorageError) {
              console.log(`Deleted ${filePaths.length} files from ${bucketName} for user ${targetUserId}`);
              deleteResults.push({
                source: `storage.${bucketName}`,
                deleted: true,
                count: filePaths.length,
              });
            }
          }
          
          // Also check for nested folders (like photos/userId, birth-certificates/userId)
          const subfolders = ["photos", "birth-certificates", "documents"];
          for (const subfolder of subfolders) {
            const { data: subFiles } = await supabaseAdmin.storage
              .from(bucketName)
              .list(`${subfolder}/${targetUserId}`, { limit: 1000 });
            
            if (subFiles && subFiles.length > 0) {
              const subFilePaths = subFiles.map((f: any) => `${subfolder}/${targetUserId}/${f.name}`);
              await supabaseAdmin.storage
                .from(bucketName)
                .remove(subFilePaths);
              console.log(`Deleted ${subFilePaths.length} files from ${bucketName}/${subfolder} for user ${targetUserId}`);
            }
          }
        } catch (storageError) {
          console.log(`Error cleaning storage bucket ${bucketName}:`, storageError);
        }
      }
    }

    // ============ DELETE STORAGE FILES FOR ORPHANED CHILDREN ============
    // Clean up storage files for any child_registrations that were deleted
    if (searchEmail) {
      try {
        // Get any child_registration IDs that were linked to this email before deletion
        const { data: childRegs } = await supabaseAdmin
          .from("child_registrations")
          .select("id")
          .ilike("email", searchEmail);
        
        // Note: child_registrations might not have email field, so we'll clean by parent_id
        // This is already handled above when we delete child_registrations
      } catch (err) {
        console.log("Error checking child_registrations for storage cleanup:", err);
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
