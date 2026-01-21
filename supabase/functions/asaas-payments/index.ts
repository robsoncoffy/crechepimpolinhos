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

    // Helper to normalize phone/cpf for comparison
    const normalize = (val: string | null | undefined): string => {
      if (!val) return "";
      return val.replace(/\D/g, "").trim();
    };

    const normalizeEmail = (val: string | null | undefined): string => {
      if (!val) return "";
      return val.toLowerCase().trim();
    };

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
          billingType: "UNDEFINED",
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
        }

        // Create payment in Asaas
        const payment = await asaasRequest("/payments", "POST", paymentRequest);

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
          const installmentPayments = await asaasRequest(`/payments?installment=${payment.installment}`, "GET");
          
          if (installmentPayments.data && installmentPayments.data.length > 1) {
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

      case "get_balance": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        try {
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

      case "sync_all_from_asaas": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let syncedCustomers = 0;
        let syncedSubscriptions = 0;
        let syncedPayments = 0;
        let linkedCustomers = 0;

        try {
          console.log("Starting full Asaas sync to new tables...");

          // 1. Load all profiles for matching by cpf/phone/email
          const { data: allProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, cpf, phone");

          // Build lookup maps
          const profileByCpf = new Map<string, string>();
          const profileByPhone = new Map<string, string>();
          const profileByName = new Map<string, string>();

          for (const p of allProfiles || []) {
            if (p.cpf) profileByCpf.set(normalize(p.cpf), p.user_id);
            if (p.phone) profileByPhone.set(normalize(p.phone), p.user_id);
            if (p.full_name) profileByName.set(p.full_name.toLowerCase().trim(), p.user_id);
          }

          // Load parent_children for linking
          const { data: parentChildren } = await supabase
            .from("parent_children")
            .select("parent_id, child_id");

          const parentToChildren = new Map<string, string[]>();
          for (const pc of parentChildren || []) {
            const existing = parentToChildren.get(pc.parent_id) || [];
            existing.push(pc.child_id);
            parentToChildren.set(pc.parent_id, existing);
          }

          // Helper to find parent by customer data
          const findLinkedParent = (customer: any): string | null => {
            // 1. By externalReference
            if (customer.externalReference) {
              return customer.externalReference;
            }
            
            // 2. By CPF
            if (customer.cpfCnpj) {
              const normalizedCpf = normalize(customer.cpfCnpj);
              const parentId = profileByCpf.get(normalizedCpf);
              if (parentId) return parentId;
            }
            
            // 3. By phone
            if (customer.phone || customer.mobilePhone) {
              const phone = customer.phone || customer.mobilePhone;
              const normalizedPhone = normalize(phone);
              // Try with and without country code
              const parentId = profileByPhone.get(normalizedPhone) || 
                              profileByPhone.get(normalizedPhone.slice(-11)) ||
                              profileByPhone.get(normalizedPhone.slice(-10));
              if (parentId) return parentId;
            }
            
            // 4. By name (exact match)
            if (customer.name) {
              const normalizedName = customer.name.toLowerCase().trim();
              const parentId = profileByName.get(normalizedName);
              if (parentId) return parentId;
            }

            return null;
          };

          // 2. Sync all customers from Asaas
          console.log("Fetching customers from Asaas...");
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const response = await asaasRequest(`/customers?offset=${offset}&limit=100`, "GET");
            const customers = response.data || [];
            console.log(`Processing ${customers.length} customers at offset ${offset}`);

            for (const customer of customers) {
              const linkedParentId = findLinkedParent(customer);
              
              const { error } = await supabase.from("asaas_customers").upsert({
                asaas_id: customer.id,
                name: customer.name,
                email: customer.email,
                cpf_cnpj: customer.cpfCnpj,
                phone: customer.phone || customer.mobilePhone,
                external_reference: customer.externalReference,
                linked_parent_id: linkedParentId,
              }, { onConflict: "asaas_id" });

              if (!error) {
                syncedCustomers++;
                if (linkedParentId) linkedCustomers++;
              }
            }

            hasMore = response.hasMore;
            offset += 100;
          }
          console.log(`Customers synced: ${syncedCustomers}, linked: ${linkedCustomers}`);

          // 3. Build customer mapping for subscriptions/payments
          const { data: asaasCustomers } = await supabase
            .from("asaas_customers")
            .select("asaas_id, linked_parent_id");

          const customerToParent = new Map<string, string | null>();
          for (const c of asaasCustomers || []) {
            customerToParent.set(c.asaas_id, c.linked_parent_id);
          }

          // 4. Sync all subscriptions from Asaas
          console.log("Fetching subscriptions from Asaas...");
          offset = 0;
          hasMore = true;

          while (hasMore) {
            const response = await asaasRequest(`/subscriptions?offset=${offset}&limit=100`, "GET");
            const subs = response.data || [];
            console.log(`Processing ${subs.length} subscriptions at offset ${offset}`);

            for (const sub of subs) {
              const linkedParentId = customerToParent.get(sub.customer);
              let linkedChildId: string | null = null;

              // Try to find child
              if (sub.externalReference) {
                linkedChildId = sub.externalReference;
              } else if (linkedParentId) {
                const children = parentToChildren.get(linkedParentId);
                if (children && children.length > 0) {
                  linkedChildId = children[0];
                }
              }

              const { error } = await supabase.from("asaas_subscriptions").upsert({
                asaas_id: sub.id,
                asaas_customer_id: sub.customer,
                value: sub.value,
                next_due_date: sub.nextDueDate,
                billing_cycle: sub.cycle,
                description: sub.description,
                status: sub.status === "ACTIVE" ? "active" : sub.status?.toLowerCase() || "inactive",
                external_reference: sub.externalReference,
                linked_parent_id: linkedParentId,
                linked_child_id: linkedChildId,
              }, { onConflict: "asaas_id" });

              if (!error) syncedSubscriptions++;
            }

            hasMore = response.hasMore;
            offset += 100;
          }
          console.log(`Subscriptions synced: ${syncedSubscriptions}`);

          // 5. Sync all payments from Asaas
          console.log("Fetching payments from Asaas...");
          offset = 0;
          hasMore = true;

          const statusMap: Record<string, string> = {
            PENDING: "pending",
            RECEIVED: "paid",
            CONFIRMED: "paid",
            OVERDUE: "overdue",
            REFUNDED: "refunded",
            RECEIVED_IN_CASH: "paid",
            REFUND_REQUESTED: "refunded",
            REFUND_IN_PROGRESS: "refunded",
            CHARGEBACK_REQUESTED: "refunded",
            CHARGEBACK_DISPUTE: "refunded",
            AWAITING_CHARGEBACK_REVERSAL: "pending",
            DUNNING_REQUESTED: "overdue",
            DUNNING_RECEIVED: "paid",
            AWAITING_RISK_ANALYSIS: "pending",
          };

          while (hasMore) {
            const response = await asaasRequest(`/payments?offset=${offset}&limit=100`, "GET");
            const payments = response.data || [];
            console.log(`Processing ${payments.length} payments at offset ${offset}`);

            for (const payment of payments) {
              const linkedParentId = customerToParent.get(payment.customer);
              let linkedChildId: string | null = null;

              if (payment.externalReference) {
                linkedChildId = payment.externalReference;
              } else if (linkedParentId) {
                const children = parentToChildren.get(linkedParentId);
                if (children && children.length > 0) {
                  linkedChildId = children[0];
                }
              }

              const { error } = await supabase.from("asaas_payments").upsert({
                asaas_id: payment.id,
                asaas_customer_id: payment.customer,
                asaas_subscription_id: payment.subscription,
                value: payment.value,
                net_value: payment.netValue,
                due_date: payment.dueDate,
                payment_date: payment.paymentDate,
                billing_type: payment.billingType,
                status: statusMap[payment.status] || "pending",
                description: payment.description,
                invoice_url: payment.invoiceUrl,
                bank_slip_url: payment.bankSlipUrl,
                external_reference: payment.externalReference,
                linked_parent_id: linkedParentId,
                linked_child_id: linkedChildId,
              }, { onConflict: "asaas_id" });

              if (!error) syncedPayments++;
            }

            hasMore = response.hasMore;
            offset += 100;
          }
          console.log(`Payments synced: ${syncedPayments}`);

          console.log(`Sync completed: ${syncedCustomers} customers (${linkedCustomers} linked), ${syncedSubscriptions} subscriptions, ${syncedPayments} payments`);

          return new Response(JSON.stringify({ 
            success: true,
            syncedCustomers,
            linkedCustomers,
            syncedSubscriptions,
            syncedPayments,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error syncing from Asaas:", error);
          return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : "Erro ao sincronizar com Asaas",
            syncedCustomers,
            syncedSubscriptions,
            syncedPayments,
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "link_customer": {
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { asaasCustomerId, parentId, childId } = payload;

        // Update customer link
        await supabase.from("asaas_customers")
          .update({ linked_parent_id: parentId })
          .eq("asaas_id", asaasCustomerId);

        // Update subscriptions
        await supabase.from("asaas_subscriptions")
          .update({ linked_parent_id: parentId, linked_child_id: childId })
          .eq("asaas_customer_id", asaasCustomerId);

        // Update payments
        await supabase.from("asaas_payments")
          .update({ linked_parent_id: parentId, linked_child_id: childId })
          .eq("asaas_customer_id", asaasCustomerId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parent-facing actions (no staff required)
      case "get_my_payments": {
        // Get payments for the logged-in parent
        const { childId } = payload;
        
        // Get payments linked to this parent
        let query = supabase
          .from("asaas_payments")
          .select("*")
          .eq("linked_parent_id", user.id)
          .order("due_date", { ascending: false });
        
        if (childId) {
          query = query.eq("linked_child_id", childId);
        }
        
        const { data: payments, error } = await query;
        
        if (error) {
          console.error("Error fetching payments:", error);
          return new Response(JSON.stringify({ error: "Erro ao buscar cobranças" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Also fetch from subscriptions table (for contracts)
        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("*, children(full_name)")
          .eq("parent_id", user.id)
          .eq("status", "active");
        
        return new Response(JSON.stringify({ 
          success: true,
          payments: payments || [],
          subscriptions: subscriptions || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_payment_details": {
        // Get fresh details for a specific payment from Asaas
        const { paymentAsaasId } = payload;
        
        // First verify this payment belongs to the user
        const { data: payment } = await supabase
          .from("asaas_payments")
          .select("*")
          .eq("asaas_id", paymentAsaasId)
          .eq("linked_parent_id", user.id)
          .single();
        
        if (!payment) {
          return new Response(JSON.stringify({ error: "Cobrança não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        try {
          // Fetch from Asaas
          const asaasPayment = await asaasRequest(`/payments/${paymentAsaasId}`, "GET");
          
          // Get PIX code if pending/overdue
          let pixCode = payment.pix_code;
          if ((asaasPayment.status === "PENDING" || asaasPayment.status === "OVERDUE") && !pixCode) {
            try {
              const pixData = await asaasRequest(`/payments/${paymentAsaasId}/pixQrCode`, "GET");
              pixCode = pixData.payload;
              
              // Update in database
              await supabase.from("asaas_payments")
                .update({ pix_code: pixCode })
                .eq("asaas_id", paymentAsaasId);
            } catch (e) {
              console.log("Could not get PIX code:", e);
            }
          }
          
          const statusMap: Record<string, string> = {
            PENDING: "pending",
            RECEIVED: "paid",
            CONFIRMED: "paid",
            OVERDUE: "overdue",
            REFUNDED: "refunded",
            RECEIVED_IN_CASH: "paid",
          };
          
          // Update local record
          await supabase.from("asaas_payments").update({
            status: statusMap[asaasPayment.status] || "pending",
            payment_date: asaasPayment.paymentDate,
            invoice_url: asaasPayment.invoiceUrl,
            bank_slip_url: asaasPayment.bankSlipUrl,
          }).eq("asaas_id", paymentAsaasId);
          
          return new Response(JSON.stringify({ 
            success: true,
            payment: {
              ...payment,
              status: statusMap[asaasPayment.status] || payment.status,
              payment_date: asaasPayment.paymentDate,
              invoice_url: asaasPayment.invoiceUrl,
              bank_slip_url: asaasPayment.bankSlipUrl,
              pix_code: pixCode,
            },
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("Error fetching from Asaas:", e);
          // Return cached data
          return new Response(JSON.stringify({ 
            success: true,
            payment,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "generate_pix": {
        // Generate PIX code for a pending payment
        const { paymentAsaasId } = payload;
        
        // Verify ownership
        const { data: payment } = await supabase
          .from("asaas_payments")
          .select("*")
          .eq("asaas_id", paymentAsaasId)
          .eq("linked_parent_id", user.id)
          .single();
        
        if (!payment) {
          return new Response(JSON.stringify({ error: "Cobrança não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        try {
          const pixData = await asaasRequest(`/payments/${paymentAsaasId}/pixQrCode`, "GET");
          
          // Update in database
          await supabase.from("asaas_payments")
            .update({ pix_code: pixData.payload })
            .eq("asaas_id", paymentAsaasId);
          
          return new Response(JSON.stringify({ 
            success: true,
            pixCode: pixData.payload,
            qrCodeImage: pixData.encodedImage,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("Error generating PIX:", e);
          return new Response(JSON.stringify({ error: "Erro ao gerar código PIX" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "pay_with_card": {
        // Pay a pending payment with credit card
        const { paymentAsaasId, cardHolderName, cardNumber, expiryMonth, expiryYear, ccv, installments } = payload;
        
        // Verify ownership
        const { data: payment } = await supabase
          .from("asaas_payments")
          .select("*")
          .eq("asaas_id", paymentAsaasId)
          .eq("linked_parent_id", user.id)
          .single();
        
        if (!payment) {
          return new Response(JSON.stringify({ error: "Cobrança não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Get user profile for billing info
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, cpf, phone")
          .eq("user_id", user.id)
          .single();
        
        if (!profile) {
          return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        try {
          // Pay with card using Asaas
          const paymentData = await asaasRequest(`/payments/${paymentAsaasId}/payWithCreditCard`, "POST", {
            creditCard: {
              holderName: cardHolderName,
              number: cardNumber.replace(/\s/g, ""),
              expiryMonth: expiryMonth,
              expiryYear: expiryYear,
              ccv: ccv,
            },
            creditCardHolderInfo: {
              name: profile.full_name,
              email: profile.email,
              cpfCnpj: profile.cpf?.replace(/\D/g, ""),
              phone: profile.phone?.replace(/\D/g, "") || undefined,
              postalCode: "00000000", // Asaas requires this but we don't have it
              addressNumber: "0",
            },
            installmentCount: installments || 1,
          });
          
          // Update local record
          await supabase.from("asaas_payments").update({
            status: "paid",
            payment_date: new Date().toISOString().split("T")[0],
          }).eq("asaas_id", paymentAsaasId);
          
          // Create notification
          await supabase.from("notifications").insert({
            user_id: user.id,
            title: "✅ Pagamento Confirmado!",
            message: `Seu pagamento de R$ ${Number(payment.value).toFixed(2).replace(".", ",")} foi processado com sucesso.`,
            type: "payment_confirmed",
            link: "/painel-responsavel",
          });
          
          return new Response(JSON.stringify({ 
            success: true,
            message: "Pagamento realizado com sucesso!",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("Error paying with card:", e);
          const errorMsg = e instanceof Error ? e.message : "Erro ao processar pagamento";
          return new Response(JSON.stringify({ error: errorMsg }), {
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
