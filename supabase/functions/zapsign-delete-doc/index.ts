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

    // Fetch contract to get ZapSign token
    const { data: contract, error: fetchError } = await supabase
      .from('enrollment_contracts')
      .select('zapsign_doc_token, child_name')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      throw new Error("Contract not found");
    }

    const docToken = contract.zapsign_doc_token;

    // Delete from ZapSign if token exists
    if (docToken) {
      console.log(`Deleting document ${docToken} from ZapSign...`);

      const deleteResponse = await fetch(`${ZAPSIGN_API_URL}/docs/${docToken}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ZAPSIGN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.warn("ZapSign delete warning:", errorText);
        // Continue anyway - we still want to delete from our database
      } else {
        console.log("Document deleted from ZapSign successfully");
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('enrollment_contracts')
      .delete()
      .eq('id', contractId);

    if (deleteError) {
      throw new Error(`Failed to delete contract: ${deleteError.message}`);
    }

    console.log(`Contract ${contractId} deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contract deleted from ZapSign and database" 
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
