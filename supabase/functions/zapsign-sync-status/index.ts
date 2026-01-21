import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1";
const ASAAS_API_URL = "https://api.asaas.com/v3";

// Pricing matrix: prices[classType][planType]
const PRICES: Record<string, Record<string, number>> = {
  bercario: {
    basico: 799.90,
    intermediario: 1299.90,
    plus: 1699.90,
  },
  maternal: {
    basico: 749.90,
    intermediario: 1099.90,
    plus: 1499.90,
  },
  jardim: {
    basico: 649.90,
    intermediario: 949.90,
    plus: 1299.90,
  },
};

function getContractValue(classType: string | null, planType: string | null): number {
  if (!classType || !planType) return 0;
  return PRICES[classType]?.[planType] ?? 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawZapSignKey = Deno.env.get('ZAPSIGN_API_KEY');
    const ZAPSIGN_API_KEY = rawZapSignKey?.trim()
      .replace(/^Bearer\s+/i, "")
      .replace(/^Token\s+/i, "")
      .trim();

    if (!ZAPSIGN_API_KEY) {
      throw new Error("ZAPSIGN_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { contractId } = await req.json();

    if (!contractId) {
      throw new Error("Missing contractId");
    }

    // Fetch contract
    const { data: contract, error: fetchError } = await supabase
      .from('enrollment_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      throw new Error("Contract not found");
    }

    if (!contract.zapsign_doc_token) {
      throw new Error("Contract has no ZapSign token");
    }

    // Fetch document status from ZapSign
    console.log(`Fetching document ${contract.zapsign_doc_token} from ZapSign...`);

    const docResponse = await fetch(`${ZAPSIGN_API_URL}/docs/${contract.zapsign_doc_token}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ZAPSIGN_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!docResponse.ok) {
      const errorText = await docResponse.text();
      console.error("ZapSign fetch error:", errorText);
      throw new Error(`Failed to fetch document from ZapSign: ${errorText}`);
    }

    const docData = await docResponse.json();
    console.log("ZapSign document status:", docData.status);

    // Map ZapSign status to our status
    let newStatus = contract.status;
    let signed_at = contract.signed_at;

    if (docData.status === 'signed') {
      newStatus = 'signed';
      if (docData.signers && docData.signers.length > 0) {
        signed_at = docData.signers[0].signed_at || signed_at;
      }
    } else if (docData.status === 'refused') {
      newStatus = 'refused';
    } else if (docData.status === 'expired') {
      newStatus = 'expired';
    } else if (docData.status === 'pending') {
      newStatus = 'sent';
    }

    // Update if status changed
    if (newStatus !== contract.status) {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'signed' && signed_at) {
        updateData.signed_at = signed_at;
      }

      const { error: updateError } = await supabase
        .from('enrollment_contracts')
        .update(updateData)
        .eq('id', contractId);

      if (updateError) {
        throw new Error(`Failed to update contract: ${updateError.message}`);
      }

      console.log(`Contract ${contractId} synced: ${contract.status} -> ${newStatus}`);

      // If contract was signed, create Asaas subscription
      if (newStatus === 'signed' && contract.child_id && contract.parent_id) {
        console.log("Creating Asaas subscription for signed contract...");
        
        try {
          // Check if subscription already exists for this child
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('child_id', contract.child_id)
            .eq('status', 'active')
            .single();

          if (existingSubscription) {
            console.log("Subscription already exists for this child, skipping creation");
          } else {
            // Get parent profile info
            const { data: parentProfile } = await supabase
              .from('profiles')
              .select('full_name, cpf, phone, email')
              .eq('user_id', contract.parent_id)
              .single();

            if (parentProfile) {
              // Check if customer already exists
              let customerId: string | null = null;
              
              const { data: existingCustomer } = await supabase
                .from('payment_customers')
                .select('asaas_customer_id')
                .eq('parent_id', contract.parent_id)
                .single();

              if (existingCustomer) {
                customerId = existingCustomer.asaas_customer_id;
                console.log("Using existing customer:", customerId);
              } else {
                // Create new customer in Asaas
                console.log("Creating new customer in Asaas...");
                const customer = await asaasRequest("/customers", "POST", {
                  name: parentProfile.full_name,
                  email: parentProfile.email,
                  cpfCnpj: parentProfile.cpf?.replace(/\D/g, ""),
                  phone: parentProfile.phone?.replace(/\D/g, ""),
                  externalReference: contract.parent_id,
                });
                
                customerId = customer.id;
                
                await supabase.from("payment_customers").insert({
                  parent_id: contract.parent_id,
                  asaas_customer_id: customer.id,
                });
                console.log("Created new customer:", customerId);
              }

              // Calculate subscription value from contract
              const subscriptionValue = getContractValue(contract.class_type, contract.plan_type);
              
              if (subscriptionValue > 0 && customerId) {
                // Calculate end date (December of current year)
                const now = new Date();
                const currentYear = now.getFullYear();
                const endDate = new Date(currentYear, 11, 31); // December 31
                
                // Calculate next due date (day 10 of next month)
                const nextDueDate = new Date();
                nextDueDate.setDate(10);
                if (nextDueDate <= new Date()) {
                  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                }

                console.log(`Creating subscription: value=${subscriptionValue}, endDate=${endDate.toISOString()}`);

                // Create subscription in Asaas with end date
                const subscription = await asaasRequest("/subscriptions", "POST", {
                  customer: customerId,
                  billingType: "UNDEFINED",
                  value: subscriptionValue,
                  nextDueDate: nextDueDate.toISOString().split("T")[0],
                  cycle: "MONTHLY",
                  description: `Mensalidade ${contract.child_name} - ${contract.class_type} ${contract.plan_type}`,
                  externalReference: contract.child_id,
                  endDate: endDate.toISOString().split("T")[0],
                });

                console.log("Asaas subscription created:", subscription.id);

                // Save to database
                await supabase.from("subscriptions").insert({
                  child_id: contract.child_id,
                  parent_id: contract.parent_id,
                  asaas_subscription_id: subscription.id,
                  value: subscriptionValue,
                  billing_day: 10,
                  status: "active",
                });

                console.log("Subscription saved to database");

                // Notify about subscription creation
                await supabase.from('notifications').insert({
                  user_id: contract.parent_id,
                  title: '💳 Cobrança Configurada',
                  message: `Sua assinatura mensal de R$ ${subscriptionValue.toFixed(2).replace('.', ',')} para ${contract.child_name} foi configurada.`,
                  type: 'subscription_created',
                  link: '/painel-responsavel',
                });
              } else {
                console.log("Could not create subscription: value=", subscriptionValue, "customerId=", customerId);
              }
            }
          }
        } catch (subscriptionError) {
          console.error("Failed to create Asaas subscription:", subscriptionError);
          // Don't throw - we still want to process the contract status update
        }
      }

      // Create notification for admins if status changed to signed
      if (newStatus === 'signed') {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          const adminNotifications = admins.map(admin => ({
            user_id: admin.user_id,
            title: '✅ Contrato Assinado!',
            message: `O contrato de matrícula de ${contract.child_name} foi assinado com sucesso.`,
            type: 'contract_signed',
            link: '/painel/contratos',
          }));

          await supabase.from('notifications').insert(adminNotifications);
        }

        // Notify parent too
        await supabase.from('notifications').insert({
          user_id: contract.parent_id,
          title: '✅ Contrato Assinado!',
          message: `O contrato de matrícula de ${contract.child_name} foi assinado com sucesso.`,
          type: 'contract_signed',
          link: '/painel-responsavel',
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Status synced: ${contract.status} -> ${newStatus}`,
          previousStatus: contract.status,
          newStatus,
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Status is already up to date",
        status: newStatus,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
