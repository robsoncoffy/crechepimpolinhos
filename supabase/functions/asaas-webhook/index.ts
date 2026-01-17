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

      // Find invoice by asaas_payment_id
      const { data: invoice, error: findError } = await supabase
        .from("invoices")
        .select("id, status, parent_id, child_id")
        .eq("asaas_payment_id", asaasPaymentId)
        .maybeSingle();

      if (findError) {
        console.error("Error finding invoice:", findError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invoice) {
        console.log(`Found invoice ${invoice.id}, updating status from ${invoice.status} to ${newStatus}`);

        // Update invoice status
        const updateData: Record<string, any> = {
          status: newStatus,
        };

        // Add payment date if paid
        if (newStatus === "paid" && payment.paymentDate) {
          updateData.payment_date = payment.paymentDate;
        }

        // Add payment type if available
        if (payment.billingType) {
          updateData.payment_type = payment.billingType;
        }

        // Update bank slip URL if available
        if (payment.bankSlipUrl) {
          updateData.bank_slip_url = payment.bankSlipUrl;
        }

        // Update invoice URL if available
        if (payment.invoiceUrl) {
          updateData.invoice_url = payment.invoiceUrl;
        }

        const { error: updateError } = await supabase
          .from("invoices")
          .update(updateData)
          .eq("id", invoice.id);

        if (updateError) {
          console.error("Error updating invoice:", updateError);
          return new Response(JSON.stringify({ error: "Update failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create notification for parent
        if (invoice.parent_id && newStatus !== invoice.status) {
          let notificationTitle = "";
          let notificationMessage = "";

          if (newStatus === "paid") {
            notificationTitle = "Pagamento confirmado! 🎉";
            notificationMessage = "Seu pagamento foi recebido com sucesso.";
          } else if (newStatus === "overdue") {
            notificationTitle = "Fatura em atraso ⚠️";
            notificationMessage = "Sua fatura está em atraso. Por favor, regularize o pagamento.";
          } else if (newStatus === "refunded") {
            notificationTitle = "Pagamento estornado";
            notificationMessage = "Seu pagamento foi estornado.";
          }

          if (notificationTitle) {
            await supabase.from("notifications").insert({
              user_id: invoice.parent_id,
              title: notificationTitle,
              message: notificationMessage,
              type: "payment",
              link: "/dashboard",
            });
            console.log(`Notification created for parent ${invoice.parent_id}`);
          }
        }

        console.log(`Invoice ${invoice.id} updated successfully`);
      } else {
        console.log(`No invoice found for payment ${asaasPaymentId}`);
        
        // Check if this payment is from a subscription
        if (payment.subscription) {
          console.log(`Payment is from subscription ${payment.subscription}`);
          
          // Find subscription
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("asaas_subscription_id", payment.subscription)
            .maybeSingle();

          if (sub) {
            console.log(`Found subscription ${sub.id}, creating invoice`);
            
            // Create new invoice for this subscription payment
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

      // Find subscription
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
