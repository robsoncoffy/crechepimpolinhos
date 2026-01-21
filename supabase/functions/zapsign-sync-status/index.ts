import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1";

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      // Get signed_at from signers
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
