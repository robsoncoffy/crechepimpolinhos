import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZapSignWebhookPayload {
  event_type: string;
  // ZapSign sends doc token as "token", not "doc_token"
  token: string;
  doc_token?: string; // fallback for backwards compatibility
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ZapSignWebhookPayload = await req.json();
    console.log("Received ZapSign webhook:", JSON.stringify(payload, null, 2));

    // ZapSign sends doc token as "token", not "doc_token"
    const doc_token = payload.token || payload.doc_token;
    const event_type = payload.event_type;
    
    // Get signed_at from signer_who_signed or signers array
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

    // Find the contract by doc_token
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

    // Process different event types
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

    // Update contract status
    const { error: updateError } = await supabase
      .from('enrollment_contracts')
      .update(updateData)
      .eq('id', contract.id);

    if (updateError) {
      console.error("Failed to update contract:", updateError);
      throw new Error(`Failed to update contract: ${updateError.message}`);
    }

    console.log(`Contract ${contract.id} updated to status: ${newStatus}`);

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

      // Send push notifications to all admins
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