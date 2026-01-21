import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// Status map from Asaas to our internal statuses
const statusMap: Record<string, string> = {
  PENDING: "pending",
  RECEIVED: "paid",
  CONFIRMED: "paid",
  OVERDUE: "overdue",
  REFUNDED: "refunded",
  RECEIVED_IN_CASH: "paid",
  REFUND_REQUESTED: "refunding",
  REFUND_IN_PROGRESS: "refunding",
  CHARGEBACK_REQUESTED: "chargeback",
  CHARGEBACK_DISPUTE: "chargeback",
  AWAITING_CHARGEBACK_REVERSAL: "chargeback",
  DUNNING_REQUESTED: "overdue",
  DUNNING_RECEIVED: "paid",
  AWAITING_RISK_ANALYSIS: "pending",
};

// Helper function to send push notification
async function sendPushNotification(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  title: string,
  body: string,
  tag: string,
  url: string
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ user_id: userId, title, body, tag, url }),
    });
    if (response.ok) {
      console.log(`Push notification sent to ${userId}`);
    }
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Asaas webhook received");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload, null, 2));

    const { event, payment, subscription } = payload;

    if (!event) {
      console.log("No event in payload, ignoring");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing event: ${event}`);

    // Handle payment events
    if (event.startsWith("PAYMENT_")) {
      if (!payment) {
        console.log("Payment event without payment data");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const asaasPaymentId = payment.id;
      const newStatus = statusMap[payment.status] || "pending";

      console.log(`Payment ${asaasPaymentId} status: ${payment.status} -> ${newStatus}`);

      // First, update asaas_payments table (the main source of truth)
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "paid" && payment.paymentDate) {
        updateData.payment_date = payment.paymentDate;
      }
      if (payment.billingType) {
        updateData.billing_type = payment.billingType;
      }
      if (payment.bankSlipUrl) {
        updateData.bank_slip_url = payment.bankSlipUrl;
      }
      if (payment.invoiceUrl) {
        updateData.invoice_url = payment.invoiceUrl;
      }

      const { data: asaasPayment, error: asaasUpdateError } = await supabase
        .from("asaas_payments")
        .update(updateData)
        .eq("asaas_id", asaasPaymentId)
        .select("linked_parent_id, linked_child_id, value")
        .maybeSingle();

      if (asaasUpdateError) {
        console.error("Error updating asaas_payments:", asaasUpdateError);
      } else if (asaasPayment) {
        console.log(`Updated asaas_payments for ${asaasPaymentId}`);

        // Send notifications to parent
        if (asaasPayment.linked_parent_id) {
          const formattedValue = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(asaasPayment.value);

          let notificationTitle = "";
          let notificationMessage = "";
          let notificationType = "";

          if (newStatus === "paid") {
            notificationTitle = "✅ Pagamento Confirmado!";
            notificationMessage = `Seu pagamento de ${formattedValue} foi recebido com sucesso.`;
            notificationType = "payment_confirmed";
          } else if (newStatus === "overdue") {
            notificationTitle = "⚠️ Pagamento Vencido";
            notificationMessage = `Sua mensalidade de ${formattedValue} está em atraso. Por favor, regularize.`;
            notificationType = "payment_overdue";
          } else if (newStatus === "refunded") {
            notificationTitle = "💰 Pagamento Estornado";
            notificationMessage = `Seu pagamento de ${formattedValue} foi estornado.`;
            notificationType = "payment_refunded";
          }

          if (notificationTitle) {
            // Create in-app notification
            await supabase.from("notifications").insert({
              user_id: asaasPayment.linked_parent_id,
              title: notificationTitle,
              message: notificationMessage,
              type: notificationType,
              link: "/painel-pais?tab=financas",
            });
            console.log(`Notification created for parent ${asaasPayment.linked_parent_id}`);

            // Send push notification
            await sendPushNotification(
              supabaseUrl,
              supabaseServiceKey,
              asaasPayment.linked_parent_id,
              notificationTitle,
              notificationMessage,
              notificationType,
              "/painel-pais?tab=financas"
            );
          }
        }

        // Notify admins when payment is received
        if (newStatus === "paid") {
          // Get child name if linked
          let childName = "Aluno";
          if (asaasPayment.linked_child_id) {
            const { data: childData } = await supabase
              .from("children")
              .select("full_name")
              .eq("id", asaasPayment.linked_child_id)
              .single();
            if (childData) childName = childData.full_name;
          }

          const formattedValue = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(asaasPayment.value);

          // Get all admin users
          const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (adminRoles && adminRoles.length > 0) {
            const adminNotifications = adminRoles.map((admin) => ({
              user_id: admin.user_id,
              title: "💰 Pagamento Recebido",
              message: `Pagamento de ${formattedValue} recebido - ${childName}`,
              type: "payment_received",
              link: "/painel/financeiro",
            }));

            await supabase.from("notifications").insert(adminNotifications);
            console.log(`Notifications created for ${adminRoles.length} admins`);
          }
        }
      }

      // Also update invoices table if there's a linked invoice
      const { data: invoice, error: findError } = await supabase
        .from("invoices")
        .select("id, status, parent_id, child_id")
        .eq("asaas_payment_id", asaasPaymentId)
        .maybeSingle();

      if (findError) {
        console.error("Error finding invoice:", findError);
      }

      if (invoice) {
        console.log(`Found invoice ${invoice.id}, updating status from ${invoice.status} to ${newStatus}`);

        const invoiceUpdateData: Record<string, any> = {
          status: newStatus,
        };

        if (newStatus === "paid" && payment.paymentDate) {
          invoiceUpdateData.payment_date = payment.paymentDate;
        }
        if (payment.billingType) {
          invoiceUpdateData.payment_type = payment.billingType;
        }
        if (payment.bankSlipUrl) {
          invoiceUpdateData.bank_slip_url = payment.bankSlipUrl;
        }
        if (payment.invoiceUrl) {
          invoiceUpdateData.invoice_url = payment.invoiceUrl;
        }

        const { error: updateError } = await supabase
          .from("invoices")
          .update(invoiceUpdateData)
          .eq("id", invoice.id);

        if (updateError) {
          console.error("Error updating invoice:", updateError);
        } else {
          console.log(`Invoice ${invoice.id} updated successfully`);
        }
      } else {
        console.log(`No invoice found for payment ${asaasPaymentId}`);

        // Check if this payment is from a subscription - create invoice
        if (payment.subscription) {
          console.log(`Payment is from subscription ${payment.subscription}`);

          const { data: sub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("asaas_subscription_id", payment.subscription)
            .maybeSingle();

          if (sub) {
            console.log(`Found subscription ${sub.id}, creating invoice`);

            const { error: insertError } = await supabase.from("invoices").insert({
              child_id: sub.child_id,
              parent_id: sub.parent_id,
              subscription_id: sub.id,
              asaas_payment_id: payment.id,
              description: payment.description || "Mensalidade escolar",
              value: payment.value,
              due_date: payment.dueDate,
              status: newStatus,
              invoice_url: payment.invoiceUrl,
              bank_slip_url: payment.bankSlipUrl,
              payment_date: payment.paymentDate,
              payment_type: payment.billingType,
            });

            if (insertError) {
              console.error("Error creating invoice:", insertError);
            } else {
              console.log("Invoice created from subscription payment");
            }
          }
        }
      }
    }

    // Handle subscription events
    if (event.startsWith("SUBSCRIPTION_")) {
      if (!subscription) {
        console.log("Subscription event without subscription data");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const asaasSubscriptionId = subscription.id;
      console.log(`Subscription event for ${asaasSubscriptionId}: ${event}`);

      // Update asaas_subscriptions table
      const subUpdateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
        subUpdateData.status = "cancelled";
      } else if (event === "SUBSCRIPTION_ACTIVATED") {
        subUpdateData.status = "active";
      }

      if (subscription.nextDueDate) {
        subUpdateData.next_due_date = subscription.nextDueDate;
      }

      await supabase
        .from("asaas_subscriptions")
        .update(subUpdateData)
        .eq("asaas_id", asaasSubscriptionId);

      // Also update subscriptions table
      const { data: sub, error: findError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("asaas_subscription_id", asaasSubscriptionId)
        .maybeSingle();

      if (findError) {
        console.error("Error finding subscription:", findError);
      }

      if (sub) {
        let newStatus = sub.status;

        if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
          newStatus = "cancelled";
        } else if (event === "SUBSCRIPTION_ACTIVATED") {
          newStatus = "active";
        }

        if (newStatus !== sub.status) {
          await supabase
            .from("subscriptions")
            .update({ status: newStatus })
            .eq("id", sub.id);
          console.log(`Subscription ${sub.id} updated to ${newStatus}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
