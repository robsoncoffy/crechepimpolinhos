import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();

    // Helper to make Asaas API calls
    const asaasRequest = async (endpoint: string, method: string, body?: any) => {
      const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Asaas API error:", data);
        throw new Error(data.errors?.[0]?.description || "Erro na API do Asaas");
      }
      
      return data;
    };

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });

    switch (action) {
      case "create_customer": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { parentId, name, email, cpfCnpj, phone } = payload;

        // Check if customer already exists
        const { data: existing } = await supabase
          .from("payment_customers")
          .select("asaas_customer_id")
          .eq("parent_id", parentId)
          .single();

        if (existing) {
          return new Response(JSON.stringify({ 
            success: true, 
            customerId: existing.asaas_customer_id,
            message: "Cliente já existe" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create customer in Asaas
        const customer = await asaasRequest("/customers", "POST", {
          name,
          email,
          cpfCnpj: cpfCnpj?.replace(/\D/g, ""),
          phone: phone?.replace(/\D/g, ""),
          externalReference: parentId,
        });

        // Save to database
        await supabase.from("payment_customers").insert({
          parent_id: parentId,
          asaas_customer_id: customer.id,
        });

        return new Response(JSON.stringify({ 
          success: true, 
          customerId: customer.id 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_subscription": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { parentId, childId, value, billingDay, description } = payload;

        // Get customer ID
        const { data: customer } = await supabase
          .from("payment_customers")
          .select("asaas_customer_id")
          .eq("parent_id", parentId)
          .single();

        if (!customer) {
          return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create subscription in Asaas
        const nextDueDate = new Date();
        nextDueDate.setDate(billingDay);
        if (nextDueDate <= new Date()) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        const subscription = await asaasRequest("/subscriptions", "POST", {
          customer: customer.asaas_customer_id,
          billingType: "UNDEFINED", // Will generate boleto and pix
          value,
          nextDueDate: nextDueDate.toISOString().split("T")[0],
          cycle: "MONTHLY",
          description: description || "Mensalidade escolar",
          externalReference: childId,
        });

        // Save to database
        const { data: sub } = await supabase.from("subscriptions").insert({
          child_id: childId,
          parent_id: parentId,
          asaas_subscription_id: subscription.id,
          value,
          billing_day: billingDay,
          status: "active",
        }).select().single();

        return new Response(JSON.stringify({ 
          success: true, 
          subscription: sub,
          asaasSubscription: subscription 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_invoice": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { parentId, childId, value, dueDate, description, installmentCount } = payload;

        // Get customer ID
        const { data: customer } = await supabase
          .from("payment_customers")
          .select("asaas_customer_id")
          .eq("parent_id", parentId)
          .single();

        if (!customer) {
          return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build payment request
        const paymentRequest: any = {
          customer: customer.asaas_customer_id,
          billingType: "UNDEFINED",
          value,
          dueDate,
          description: description || "Cobrança avulsa",
          externalReference: childId,
        };

        // Add installment info if more than 1
        if (installmentCount && installmentCount > 1) {
          paymentRequest.installmentCount = installmentCount;
          paymentRequest.installmentValue = value / installmentCount;
          console.log(`Creating installment payment: ${installmentCount}x of R$ ${paymentRequest.installmentValue}`);
        }

        // Create payment in Asaas
        const payment = await asaasRequest("/payments", "POST", paymentRequest);
        console.log("Asaas payment created:", payment.id, payment.installment ? `(installment ${payment.installment})` : "");

        // Get payment details with pix code
        let pixCode = null;
        try {
          const paymentDetails = await asaasRequest(`/payments/${payment.id}/pixQrCode`, "GET");
          pixCode = paymentDetails.payload;
        } catch (e) {
          console.log("Could not get initial PIX code:", e);
        }

        // Save first invoice to database
        const { data: invoice } = await supabase.from("invoices").insert({
          child_id: childId,
          parent_id: parentId,
          asaas_payment_id: payment.id,
          description: installmentCount > 1 
            ? `${description || "Cobrança parcelada"} (1/${installmentCount})`
            : (description || "Cobrança avulsa"),
          value: installmentCount > 1 ? value / installmentCount : value,
          due_date: dueDate,
          status: "pending",
          invoice_url: payment.invoiceUrl,
          pix_code: pixCode,
          bank_slip_url: payment.bankSlipUrl,
        }).select().single();

        // If installment, fetch and save remaining installments
        if (installmentCount && installmentCount > 1 && payment.installment) {
          console.log(`Fetching remaining installments for installment group...`);
          
          // Get all payments for this installment
          const installmentPayments = await asaasRequest(`/payments?installment=${payment.installment}`, "GET");
          
          if (installmentPayments.data && installmentPayments.data.length > 1) {
            // Save remaining installments (skip the first one we already saved)
            for (let i = 1; i < installmentPayments.data.length; i++) {
              const installmentPayment = installmentPayments.data[i];
              
              await supabase.from("invoices").insert({
                child_id: childId,
                parent_id: parentId,
                asaas_payment_id: installmentPayment.id,
                description: `${description || "Cobrança parcelada"} (${i + 1}/${installmentCount})`,
                value: installmentPayment.value,
                due_date: installmentPayment.dueDate,
                status: "pending",
                invoice_url: installmentPayment.invoiceUrl,
                bank_slip_url: installmentPayment.bankSlipUrl,
              });
            }
            console.log(`Saved ${installmentPayments.data.length} installment invoices`);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          invoice,
          installmentCount: installmentCount || 1,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_payment_info": {
        const { paymentId } = payload;

        // Check if user owns this invoice or is staff
        const { data: invoice } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", paymentId)
          .single();

        if (!invoice) {
          return new Response(JSON.stringify({ error: "Fatura não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (invoice.parent_id !== user.id && !isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get fresh data from Asaas
        if (invoice.asaas_payment_id) {
          try {
            const payment = await asaasRequest(`/payments/${invoice.asaas_payment_id}`, "GET");
            
            // Update local status
            const statusMap: Record<string, string> = {
              PENDING: "pending",
              RECEIVED: "paid",
              CONFIRMED: "paid",
              OVERDUE: "overdue",
              REFUNDED: "refunded",
              RECEIVED_IN_CASH: "paid",
            };

            await supabase.from("invoices").update({
              status: statusMap[payment.status] || invoice.status,
              payment_date: payment.paymentDate,
              payment_type: payment.billingType,
            }).eq("id", paymentId);

            // Get PIX QR code if still pending
            let pixCode = invoice.pix_code;
            if (payment.status === "PENDING" && !pixCode) {
              try {
                const pixData = await asaasRequest(`/payments/${invoice.asaas_payment_id}/pixQrCode`, "GET");
                pixCode = pixData.payload;
                await supabase.from("invoices").update({ pix_code: pixCode }).eq("id", paymentId);
              } catch (e) {
                console.log("Could not get PIX code:", e);
              }
            }

            return new Response(JSON.stringify({ 
              ...invoice,
              status: statusMap[payment.status] || invoice.status,
              pix_code: pixCode,
              invoice_url: payment.invoiceUrl,
              bank_slip_url: payment.bankSlipUrl,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch (e) {
            console.error("Error fetching from Asaas:", e);
          }
        }

        return new Response(JSON.stringify(invoice), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_payments": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get all pending invoices
        const { data: pendingInvoices } = await supabase
          .from("invoices")
          .select("*")
          .in("status", ["pending", "overdue"]);

        let updated = 0;
        
        for (const invoice of pendingInvoices || []) {
          if (!invoice.asaas_payment_id) continue;

          try {
            const payment = await asaasRequest(`/payments/${invoice.asaas_payment_id}`, "GET");
            
            const statusMap: Record<string, string> = {
              PENDING: "pending",
              RECEIVED: "paid",
              CONFIRMED: "paid",
              OVERDUE: "overdue",
              REFUNDED: "refunded",
              RECEIVED_IN_CASH: "paid",
            };

            const newStatus = statusMap[payment.status] || invoice.status;
            
            if (newStatus !== invoice.status) {
              await supabase.from("invoices").update({
                status: newStatus,
                payment_date: payment.paymentDate,
                payment_type: payment.billingType,
              }).eq("id", invoice.id);
              updated++;
            }
          } catch (e) {
            console.error(`Error syncing payment ${invoice.id}:`, e);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          updated 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cancel_subscription": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { subscriptionId } = payload;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("id", subscriptionId)
          .single();

        if (!sub) {
          return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub.asaas_subscription_id) {
          await asaasRequest(`/subscriptions/${sub.asaas_subscription_id}`, "DELETE");
        }

        await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", subscriptionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_balance": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        try {
          // Get account balance from Asaas
          const balance = await asaasRequest("/finance/balance", "GET");
          
          return new Response(JSON.stringify({ 
            success: true,
            balance: balance.balance || 0,
            totalBalance: balance.totalBalance || 0,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error fetching balance:", error);
          return new Response(JSON.stringify({ 
            error: "Erro ao buscar saldo",
            balance: null 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
