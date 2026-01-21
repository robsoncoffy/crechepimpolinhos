import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking payment reminders...");

    // Get today's date and dates for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    // Fetch pending payments that are:
    // 1. Due within 3 days (near_due)
    // 2. Already overdue
    const { data: payments, error: paymentsError } = await supabase
      .from("asaas_payments")
      .select("asaas_id, linked_parent_id, value, due_date, status, description")
      .in("status", ["pending", "PENDING"])
      .not("linked_parent_id", "is", null);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return new Response(JSON.stringify({ error: "Failed to fetch payments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${payments?.length || 0} pending payments to check`);

    let nearDueSent = 0;
    let overdueSent = 0;

    for (const payment of payments || []) {
      const dueDate = new Date(payment.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const isOverdue = dueDate < today;
      const isNearDue = !isOverdue && dueDate <= threeDaysFromNow;
      
      if (!isOverdue && !isNearDue) continue;

      const notificationType = isOverdue ? "overdue" : "near_due";
      
      // Check if we already sent this notification
      const { data: existingNotif } = await supabase
        .from("payment_notification_log")
        .select("id")
        .eq("payment_asaas_id", payment.asaas_id)
        .eq("notification_type", notificationType)
        .eq("user_id", payment.linked_parent_id)
        .maybeSingle();

      if (existingNotif) {
        continue; // Already sent
      }

      // Format value
      const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(payment.value);

      const formattedDate = new Date(payment.due_date).toLocaleDateString("pt-BR");

      // Create notification
      let title: string;
      let message: string;
      let type: string;

      if (isOverdue) {
        title = "⚠️ Pagamento Vencido";
        message = `Sua mensalidade de ${formattedValue} venceu em ${formattedDate}. Regularize para evitar pendências.`;
        type = "payment_overdue";
      } else {
        title = "📅 Pagamento Próximo";
        message = `Sua mensalidade de ${formattedValue} vence em ${formattedDate}. Pague agora pelo app!`;
        type = "payment_reminder";
      }

      // Insert in-app notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: payment.linked_parent_id,
          title,
          message,
          type,
          link: "/painel-pais?tab=financas",
        });

      if (notifError) {
        console.error(`Error creating notification for ${payment.linked_parent_id}:`, notifError);
        continue;
      }

      // Log that we sent this notification
      await supabase.from("payment_notification_log").insert({
        payment_asaas_id: payment.asaas_id,
        notification_type: notificationType,
        user_id: payment.linked_parent_id,
      });

      // Try to send push notification
      try {
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: payment.linked_parent_id,
            title,
            body: message,
            tag: type,
            url: "/painel-pais?tab=financas",
          }),
        });

        if (pushResponse.ok) {
          console.log(`Push notification sent to ${payment.linked_parent_id}`);
        }
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }

      if (isOverdue) {
        overdueSent++;
      } else {
        nearDueSent++;
      }
    }

    console.log(`Sent ${nearDueSent} near-due and ${overdueSent} overdue notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        nearDueSent,
        overdueSent,
        totalChecked: payments?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
