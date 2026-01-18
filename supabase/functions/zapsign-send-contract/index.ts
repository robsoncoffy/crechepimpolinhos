import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // Step 4: Create notification for parent
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

    // Step 5: Send email notification to parent
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        console.log("Sending contract notification email to:", parentEmail);

        await resend.emails.send({
          from: "Creche Pimpolinhos <onboarding@resend.dev>",
          to: [parentEmail],
          subject: `📝 Contrato de Matrícula de ${childName} - Assinatura Pendente`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">📝 Creche Pimpolinhos</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Contrato de Matrícula</p>
                </div>
                <div style="padding: 30px;">
                  <h2 style="color: #1e293b; margin-top: 0;">Olá, ${parentName}! 👋</h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    O contrato de matrícula de <strong>${childName}</strong> está disponível para assinatura digital.
                  </p>
                  
                  <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1e40af; margin: 0 0 15px; font-size: 16px;">📋 Dados do Contrato</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Criança:</strong></td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${childName}</td>
                      </tr>
                      <tr>
                        <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Turma:</strong></td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${classTypeLabels[classType] || classType}</td>
                      </tr>
                      <tr>
                        <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Turno:</strong></td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${shiftTypeLabels[shiftType] || shiftType}</td>
                      </tr>
                      ${planType ? `
                      <tr>
                        <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Plano:</strong></td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${planTypeLabels[planType] || planType}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                      <strong>⏰ Atenção:</strong> O contrato deve ser assinado digitalmente para confirmar a matrícula. Clique no botão abaixo para acessar o documento.
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${signUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      ✍️ Assinar Contrato
                    </a>
                  </div>
                  
                  <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                    Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                    <a href="${signUrl}" style="color: #3b82f6; word-break: break-all;">${signUrl}</a>
                  </p>

                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                  
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                    Em caso de dúvidas, entre em contato conosco pelo telefone <strong>(51) 99999-9999</strong> ou responda este e-mail.
                  </p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Creche Pimpolinhos - Todos os direitos reservados
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log("Contract notification email sent successfully");
      } catch (emailError) {
        console.warn("Failed to send contract email notification:", emailError);
        // Don't fail the whole request if email fails - contract was still created
      }
    } else {
      console.warn("RESEND_API_KEY not configured - skipping email notification");
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