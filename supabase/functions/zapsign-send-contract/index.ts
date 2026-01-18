import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1";

interface ContractRequest {
  childId: string;
  registrationId: string;
  parentId: string;
  parentEmail?: string; // Optional - will be fetched if not provided
  parentName: string;
  parentCpf?: string;
  childName: string;
  birthDate: string;
  classType: string;
  shiftType: string;
  planType?: string;
}

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const shiftTypeLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

const planTypeLabels: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  plus: "Plus+",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPSIGN_API_KEY = Deno.env.get('ZAPSIGN_API_KEY');
    if (!ZAPSIGN_API_KEY) {
      console.error("ZAPSIGN_API_KEY not configured");
      throw new Error("ZAPSIGN_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ContractRequest = await req.json();
    console.log("Received contract request:", JSON.stringify(body, null, 2));

    let {
      childId,
      registrationId,
      parentId,
      parentEmail,
      parentName,
      parentCpf,
      childName,
      birthDate,
      classType,
      shiftType,
      planType,
    } = body;

    // Validate required fields
    if (!childId || !parentId || !parentName || !childName) {
      throw new Error("Missing required fields: childId, parentId, parentName, childName");
    }

    // Fetch parent email if not provided
    if (!parentEmail) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(parentId);
      if (userError) {
        console.error("Error fetching user:", userError);
        throw new Error("Failed to fetch parent email");
      }
      parentEmail = userData?.user?.email;
      if (!parentEmail) {
        throw new Error("Parent email not found");
      }
      console.log("Fetched parent email:", parentEmail);
    }

    // Format date
    const formattedBirthDate = new Date(birthDate).toLocaleDateString('pt-BR');
    const currentDate = new Date().toLocaleDateString('pt-BR');

    // Create document content with placeholders
    const contractContent = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS
CRECHE PIMPOLINHOS

Data: ${currentDate}

CONTRATANTE (Responsável):
Nome: ${parentName}
${parentCpf ? `CPF: ${parentCpf}` : ''}
E-mail: ${parentEmail}

ALUNO(A):
Nome: ${childName}
Data de Nascimento: ${formattedBirthDate}
Turma: ${classTypeLabels[classType] || classType}
Turno: ${shiftTypeLabels[shiftType] || shiftType}
${planType ? `Plano: ${planTypeLabels[planType] || planType}` : ''}

CLÁUSULA 1 - DO OBJETO
O presente contrato tem por objeto a prestação de serviços educacionais pela CRECHE PIMPOLINHOS ao aluno acima identificado.

CLÁUSULA 2 - DAS OBRIGAÇÕES
O CONTRATANTE se compromete a:
a) Manter os dados cadastrais atualizados;
b) Cumprir pontualmente com as obrigações financeiras;
c) Respeitar os horários de entrada e saída;
d) Comunicar ausências com antecedência.

CLÁUSULA 3 - DO PERÍODO LETIVO
O ano letivo segue o calendário escolar estabelecido pela instituição.

CLÁUSULA 4 - DA RESCISÃO
O presente contrato poderá ser rescindido mediante aviso prévio de 30 dias.

CLÁUSULA 5 - DISPOSIÇÕES GERAIS
Este contrato é regido pelas leis brasileiras.

Canoas, RS - ${currentDate}
    `.trim();

    // Step 1: Create document in ZapSign
    console.log("Creating document in ZapSign...");
    const createDocResponse = await fetch(`${ZAPSIGN_API_URL}/docs/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAPSIGN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Contrato de Matrícula - ${childName}`,
        url_pdf: "", // We'll use base64 content instead
        base64_pdf: btoa(unescape(encodeURIComponent(contractContent))),
        lang: "pt-br",
        disable_signer_emails: false,
        signed_file_only_finished: true,
        brand_logo: "",
        brand_primary_color: "#3B82F6",
        external_id: `${registrationId || childId}`,
      }),
    });

    if (!createDocResponse.ok) {
      const errorText = await createDocResponse.text();
      console.error("ZapSign create doc error:", errorText);
      throw new Error(`Failed to create document in ZapSign: ${errorText}`);
    }

    const docData = await createDocResponse.json();
    console.log("Document created:", JSON.stringify(docData, null, 2));

    const docToken = docData.token;

    // Step 2: Add signer to the document
    console.log("Adding signer to document...");
    const addSignerResponse = await fetch(`${ZAPSIGN_API_URL}/docs/${docToken}/signers/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAPSIGN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: parentName,
        email: parentEmail,
        auth_mode: "assinaturaTela",
        send_automatic_email: true,
        send_automatic_whatsapp: false,
        lock_name: true,
        lock_email: true,
        qualification: "Responsável Legal",
        external_id: parentId,
      }),
    });

    if (!addSignerResponse.ok) {
      const errorText = await addSignerResponse.text();
      console.error("ZapSign add signer error:", errorText);
      throw new Error(`Failed to add signer in ZapSign: ${errorText}`);
    }

    const signerData = await addSignerResponse.json();
    console.log("Signer added:", JSON.stringify(signerData, null, 2));

    const signerToken = signerData.token;
    const signUrl = signerData.sign_url;

    // Step 3: Save contract to database
    console.log("Saving contract to database...");
    const { data: contractData, error: contractError } = await supabase
      .from('enrollment_contracts')
      .insert({
        child_id: childId,
        parent_id: parentId,
        registration_id: registrationId || null,
        zapsign_doc_token: docToken,
        zapsign_signer_token: signerToken,
        zapsign_doc_url: signUrl,
        status: 'sent',
        sent_at: new Date().toISOString(),
        child_name: childName,
        class_type: classType,
        shift_type: shiftType,
        plan_type: planType || null,
      })
      .select()
      .single();

    if (contractError) {
      console.error("Database error:", contractError);
      throw new Error(`Failed to save contract: ${contractError.message}`);
    }

    console.log("Contract saved successfully:", contractData.id);

    // Step 4: Create notification for admin
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: parentId,
        title: '📝 Contrato de Matrícula Enviado',
        message: `O contrato de matrícula de ${childName} foi enviado para assinatura. Verifique seu e-mail.`,
        type: 'contract',
        link: signUrl,
      });

    if (notifError) {
      console.warn("Failed to create notification:", notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contractData.id,
        docToken,
        signerToken,
        signUrl,
        message: "Contrato enviado com sucesso para assinatura",
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error("Error in zapsign-send-contract:", error);
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