import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

// Pricing matrix: prices[classType][planType]
// Note: Maternal I (24-35 months) uses Berçário prices
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

// Calculate age in months from birth date
function getAgeInMonths(birthDate: string | null): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate + "T12:00:00");
  const now = new Date();
  if (isNaN(birth.getTime())) return 0;
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return months;
}

// Check if child is Maternal I (24-35 months) - uses Berçário prices
function isMaternalI(birthDate: string | null): boolean {
  const months = getAgeInMonths(birthDate);
  return months >= 24 && months < 36;
}

function getContractValue(classType: string | null, planType: string | null, birthDate: string | null = null): number {
  if (!classType || !planType) return 0;
  // Maternal I uses Berçário prices
  if (classType === 'maternal' && birthDate && isMaternalI(birthDate)) {
    return PRICES.bercario?.[planType] ?? 0;
  }
  return PRICES[classType]?.[planType] ?? 0;
}

interface ZapSignWebhookPayload {
  event_type: string;
  token: string;
  doc_token?: string;
  signer_token?: string;
  signed_at?: string;
  refused_at?: string;
  status?: string;
  signers?: Array<{
    token: string;
    signed_at?: string;
  }>;
  signer_who_signed?: {
    token: string;
    signed_at?: string;
  };
  signer?: {
    name: string;
    email: string;
    status: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
    const zapsignWebhookSecret = Deno.env.get('ZAPSIGN_WEBHOOK_SECRET');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate webhook authentication
    const webhookSecret = req.headers.get('x-webhook-secret');
    
    if (zapsignWebhookSecret) {
      // If secret is configured, validate it
      if (!webhookSecret || webhookSecret !== zapsignWebhookSecret) {
        console.error("Invalid or missing x-webhook-secret header");
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log("Webhook authentication validated");
    } else {
      console.warn("ZAPSIGN_WEBHOOK_SECRET not configured - webhook authentication disabled");
    }

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

    const payload: ZapSignWebhookPayload = await req.json();
    console.log("Received ZapSign webhook:", JSON.stringify(payload, null, 2));

    const doc_token = payload.token || payload.doc_token;
    const event_type = payload.event_type;
    
    const signed_at = payload.signer_who_signed?.signed_at || 
                      payload.signers?.[0]?.signed_at ||
                      payload.signed_at;

    if (!doc_token) {
      console.error("Missing token in webhook payload");
      return new Response(
        JSON.stringify({ error: 'Missing token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing webhook: event_type=${event_type}, doc_token=${doc_token}`);

    const { data: contract, error: findError } = await supabase
      .from('enrollment_contracts')
      .select('*')
      .eq('zapsign_doc_token', doc_token)
      .single();

    if (findError || !contract) {
      console.error("Contract not found for doc_token:", doc_token, findError);
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Found contract:", contract.id);

    let newStatus: string;
    let updateData: Record<string, unknown> = {};
    let notificationTitle: string;
    let notificationMessage: string;
    let notificationType: string;

    switch (event_type) {
      case 'doc_signed':
      case 'signer_signed':
        newStatus = 'signed';
        updateData = {
          status: 'signed',
          signed_at: signed_at || new Date().toISOString(),
        };
        notificationTitle = '✅ Contrato Assinado!';
        notificationMessage = `O contrato de matrícula de ${contract.child_name} foi assinado com sucesso.`;
        notificationType = 'contract_signed';
        break;

      case 'doc_refused':
      case 'signer_refused':
        newStatus = 'refused';
        updateData = {
          status: 'refused',
        };
        notificationTitle = '❌ Contrato Recusado';
        notificationMessage = `O contrato de matrícula de ${contract.child_name} foi recusado.`;
        notificationType = 'contract_refused';
        break;

      case 'doc_expired':
        newStatus = 'expired';
        updateData = {
          status: 'expired',
        };
        notificationTitle = '⏰ Contrato Expirado';
        notificationMessage = `O contrato de matrícula de ${contract.child_name} expirou sem assinatura.`;
        notificationType = 'contract_expired';
        break;

      default:
        console.log("Unhandled event type:", event_type);
        return new Response(
          JSON.stringify({ message: 'Event type not handled', event_type }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const { error: updateError } = await supabase
      .from('enrollment_contracts')
      .update(updateData)
      .eq('id', contract.id);

    if (updateError) {
      console.error("Failed to update contract:", updateError);
      throw new Error(`Failed to update contract: ${updateError.message}`);
    }

    console.log(`Contract ${contract.id} updated to status: ${newStatus}`);

    // If contract was signed, create Asaas subscription
    if (newStatus === 'signed' && contract.child_id && contract.parent_id) {
      console.log("Creating Asaas subscription for signed contract...");
      
      try {
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
            // Create new customer in Asaas (omit phone to avoid validation issues)
            console.log("Creating new customer in Asaas...");
            const customerData: Record<string, unknown> = {
              name: parentProfile.full_name,
              email: parentProfile.email,
              cpfCnpj: parentProfile.cpf?.replace(/\D/g, ""),
              externalReference: contract.parent_id,
            };
            
            const customer = await asaasRequest("/customers", "POST", customerData);
            
            customerId = customer.id;
            
            await supabase.from("payment_customers").insert({
              parent_id: contract.parent_id,
              asaas_customer_id: customer.id,
            });
            console.log("Created new customer:", customerId);
          }

          // Get child birth date to calculate correct pricing (Maternal I uses Berçário prices)
          let childBirthDate: string | null = null;
          if (contract.child_id) {
            const { data: childData } = await supabase
              .from('children')
              .select('birth_date')
              .eq('id', contract.child_id)
              .single();
            if (childData) {
              childBirthDate = childData.birth_date;
            }
          }

          // Calculate subscription value from contract (with birth date for Maternal I pricing)
          const subscriptionValue = getContractValue(contract.class_type, contract.plan_type, childBirthDate);
          
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
      } catch (subscriptionError) {
        console.error("Failed to create Asaas subscription:", subscriptionError);
        // Don't throw - we still want to process the contract status update
      }
    }

    // Notify parent
    const { error: parentNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: contract.parent_id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        link: '/painel-responsavel',
      });

    if (parentNotifError) {
      console.warn("Failed to notify parent:", parentNotifError);
    }

    // Send push notification to parent
    try {
      const supabasePublicUrl = Deno.env.get('SUPABASE_URL')!;
      const pushResponse = await fetch(`${supabasePublicUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: contract.parent_id,
          title: notificationTitle,
          body: notificationMessage,
          url: '/painel-responsavel',
        }),
      });
      
      if (!pushResponse.ok) {
        console.warn("Push notification failed:", await pushResponse.text());
      } else {
        console.log("Push notification sent to parent");
      }
    } catch (pushError) {
      console.warn("Failed to send push notification:", pushError);
    }

    // Notify all admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        link: '/painel/contratos',
      }));

      const { error: adminNotifError } = await supabase
        .from('notifications')
        .insert(adminNotifications);

      if (adminNotifError) {
        console.warn("Failed to notify admins:", adminNotifError);
      }

      for (const admin of admins) {
        try {
          const supabasePublicUrl = Deno.env.get('SUPABASE_URL')!;
          await fetch(`${supabasePublicUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: admin.user_id,
              title: notificationTitle,
              body: notificationMessage,
              url: '/painel/contratos',
            }),
          });
        } catch (pushError) {
          console.warn("Failed to send push to admin:", pushError);
        }
      }
    }

    console.log("Webhook processed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Contract status updated to ${newStatus}`,
        contractId: contract.id,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});