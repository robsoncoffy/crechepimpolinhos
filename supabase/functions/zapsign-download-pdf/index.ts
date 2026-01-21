import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1";

serve(async (req) => {
  // Handle CORS preflight
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
    const zapSignApiKey = Deno.env.get('ZAPSIGN_API_KEY');
    
    if (!zapSignApiKey) {
      throw new Error("ZAPSIGN_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc('is_staff', { user_id: user.id });
    
    const { contractId, docToken } = await req.json();

    if (!contractId && !docToken) {
      return new Response(
        JSON.stringify({ error: 'contractId or docToken required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let documentToken = docToken;

    // If contractId provided, get the doc token from database
    if (contractId && !docToken) {
      const { data: contract, error: contractError } = await supabase
        .from('enrollment_contracts')
        .select('zapsign_doc_token, parent_id')
        .eq('id', contractId)
        .single();

      if (contractError || !contract) {
        return new Response(
          JSON.stringify({ error: 'Contract not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check permission: user must be staff or the parent
      if (!isStaff && contract.parent_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      documentToken = contract.zapsign_doc_token;
    }

    if (!documentToken) {
      return new Response(
        JSON.stringify({ error: 'Document token not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Fetching PDF for document:", documentToken);

    // Get document details from ZapSign to get the PDF URL
    const docResponse = await fetch(`${ZAPSIGN_API_URL}/docs/${documentToken}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${zapSignApiKey}`,
      },
    });

    if (!docResponse.ok) {
      const errorText = await docResponse.text();
      console.error("ZapSign API error:", errorText);
      throw new Error(`Failed to fetch document from ZapSign: ${docResponse.status}`);
    }

    const docData = await docResponse.json();
    console.log("Document data received:", JSON.stringify(docData, null, 2).substring(0, 500));

    // ZapSign returns signed_file for signed documents, or original_file for originals
    const pdfUrl = docData.signed_file || docData.original_file;

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'PDF not available yet',
          status: docData.status,
          message: 'O contrato ainda não foi assinado ou o PDF ainda está sendo gerado.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the PDF URL for the client to download
    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: pdfUrl,
        status: docData.status,
        signedAt: docData.signed_at,
        documentName: docData.name,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error("Error downloading PDF:", error);
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
