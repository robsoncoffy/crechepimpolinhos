import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1";

// GHL Pipeline Configuration - Jornada de Matrícula
const GHL_PIPELINE = {
  id: "gfqyCfBI23CDEkJk9gwC",
  stages: {
    CONTRATO_ENVIADO: "716d8093-2530-49d9-8b89-1956b028b973",
  },
};

interface ContractRequest {
  childId: string;
  registrationId: string;
  parentId: string;
  childName: string;
  birthDate: string;
  classType: string;
  shiftType: string;
  planType?: string;
  customMonthlyValue?: number;
  // Optional override data from admin editing
  overrideData?: {
    parentName?: string;
    parentCpf?: string;
    parentRg?: string;
    parentPhone?: string;
    parentEmail?: string;
    address?: string;
    emergencyContact?: string;
    childCpf?: string;
  };
  // Customized clause texts from admin editing
  clauseCustomizations?: {
    clauseObject?: string;
    clauseEnrollment?: string;
    clauseMonthlyFee?: string;
    clauseHours?: string;
    clauseFood?: string;
    clauseMedication?: string;
    clauseUniform?: string;
    clauseHealth?: string;
    clauseRegulations?: string;
    clauseImageRights?: string;
    clauseTermination?: string;
    clauseLGPD?: string;
    clauseGeneral?: string;
    clauseForum?: string;
    clausePenalty?: string;
    clauseSocialMedia?: string;
    clauseValidity?: string;
  };
}

// Dados fixos da empresa
const COMPANY_DATA = {
  name: "ESCOLA DE ENSINO INFANTIL PIMPOLINHOS LTDA",
  cnpj: "60.141.634/0001-96",
  address: "Rua Coronel Camisao, nº 495, Bairro Harmonia, Canoas/RS, CEP 92310-410",
};

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  maternal_1: "Maternal I",
  maternal_2: "Maternal II",
  jardim: "Jardim",
  jardim_1: "Jardim I",
  jardim_2: "Jardim II",
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
    const rawZapSignKey = Deno.env.get('ZAPSIGN_API_KEY');
    const ZAPSIGN_API_KEY = rawZapSignKey?.trim();
    if (!ZAPSIGN_API_KEY) {
      console.error("ZAPSIGN_API_KEY not configured");
      throw new Error("ZAPSIGN_API_KEY not configured");
    }

    // Normalize token in case it was saved with a prefix like "Bearer ..."
    const zapsignToken = ZAPSIGN_API_KEY
      .replace(/^Bearer\s+/i, "")
      .replace(/^Token\s+/i, "")
      .trim();

    console.log("ZapSign token loaded (len):", zapsignToken.length);
    console.log("ZapSign token first 8 chars:", zapsignToken.substring(0, 8));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ContractRequest = await req.json();
    console.log("Received contract request:", JSON.stringify(body, null, 2));

    const {
      childId,
      registrationId,
      parentId,
      childName,
      birthDate,
      classType,
      shiftType,
      planType,
      customMonthlyValue,
      overrideData,
      clauseCustomizations,
    } = body;

    // Format currency helper
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    // Default clause texts
    const DEFAULT_CLAUSES = {
      clauseObject: `O presente contrato tem por objeto a prestação de serviços educacionais e cuidados infantis, compreendendo atividades pedagógicas, recreativas, alimentação e acompanhamento do desenvolvimento da criança durante o período contratado.`,
      clauseEnrollment: `O presente contrato terá vigência a partir da data de sua assinatura até o dia 31 de dezembro de ${new Date().getFullYear()}. A matrícula será efetivada mediante assinatura deste contrato e pagamento da primeira mensalidade. A vaga é pessoal e intransferível. A renovação para o ano seguinte deverá ser solicitada até 30 de novembro.`,
      clauseMonthlyFee: `O valor das mensalidades será conforme tabela de preços vigente, com vencimento sempre no mesmo dia da assinatura deste contrato, a cada mês subsequente. O atraso no pagamento acarretará multa de 2% e juros de 1% ao mês.`,
      clauseHours: `A CONTRATADA funciona de segunda a sexta-feira, das 07h00min às 19h00min. O horário de permanência deve respeitar o turno contratado (Integral: 9 horas; Meio Turno Manhã: 7h às 12h; Meio Turno Tarde: 13h às 18h). Há tolerância de 15 minutos para entrada e saída.`,
      clauseFood: `A alimentação será fornecida conforme cardápio elaborado por nutricionista, adequado à faixa etária da criança. Alergias e restrições alimentares devem ser informadas por escrito.`,
      clauseMedication: `A administração de medicamentos somente será realizada mediante prescrição médica, com autorização por escrito do responsável, contendo nome do medicamento, dosagem e horários.`,
      clauseUniform: `O uso do uniforme escolar é facultativo, sendo recomendado para melhor identificação dos alunos. Os materiais escolares devem ser entregues conforme lista fornecida no ato da matrícula.`,
      clauseHealth: `Em caso de febre, vômitos, diarreia ou doenças contagiosas, a criança não poderá permanecer na escola. Os pais serão comunicados imediatamente para buscar a criança.`,
      clauseRegulations: `O CONTRATANTE declara conhecer e aceitar o Regulamento Interno da escola, que é parte integrante deste contrato.`,
      clauseImageRights: `O CONTRATANTE autoriza o uso de imagem da criança para fins pedagógicos, institucionais e de divulgação da escola em redes sociais e materiais promocionais, sem fins comerciais diretos.`,
      clauseTermination: `A rescisão deste contrato pode ser solicitada por qualquer das partes, mediante aviso prévio de 30 dias por escrito. A desistência sem aviso prévio implica no pagamento de multa equivalente a uma mensalidade.`,
      clauseLGPD: `A CONTRATADA se compromete a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), utilizando-os exclusivamente para as finalidades descritas neste contrato.`,
      clauseGeneral: `Os casos omissos serão resolvidos de comum acordo entre as partes, prevalecendo sempre o melhor interesse da criança.`,
      clauseForum: `Fica eleito o Foro da Comarca de Canoas/RS para dirimir quaisquer questões oriundas do presente contrato.`,
      clausePenalty: `Em caso de rescisão antecipada do contrato por iniciativa do CONTRATANTE, sem cumprimento do aviso prévio de 30 dias, ou por inadimplência, fica o CONTRATANTE obrigado ao pagamento de multa correspondente a 20% (vinte por cento) do valor total anual do contrato, calculado com base no plano contratado.`,
      clauseSocialMedia: `O CONTRATANTE autoriza expressamente a CONTRATADA a capturar, utilizar e divulgar imagens (fotos e vídeos) da criança matriculada para fins de publicação em redes sociais oficiais da creche (Instagram, Facebook, WhatsApp e demais plataformas), com objetivo exclusivamente institucional, pedagógico e promocional, sem qualquer remuneração ou compensação. A autorização poderá ser revogada a qualquer momento mediante solicitação por escrito.`,
      clauseValidity: `O presente contrato somente terá validade e eficácia após a confirmação do pagamento da primeira mensalidade. Sem a comprovação deste pagamento, a vaga não será garantida e o contrato será considerado nulo de pleno direito.`,
    };

    // Get clause text (custom or default)
    const getClause = (key: keyof typeof DEFAULT_CLAUSES): string => {
      return clauseCustomizations?.[key] || DEFAULT_CLAUSES[key];
    };

    // Validate required fields
    if (!childId || !parentId || !childName) {
      throw new Error("Missing required fields: childId, parentId, childName");
    }

    // Fetch parent email from auth (can be overridden)
    let parentEmail = overrideData?.parentEmail || '';
    if (!parentEmail) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(parentId);
      if (userError) {
        console.error("Error fetching user:", userError);
        throw new Error("Failed to fetch parent data");
      }
      parentEmail = userData?.user?.email || '';
      if (!parentEmail) {
        throw new Error("Parent email not found");
      }
    }
    console.log("Using parent email:", parentEmail);

    // Fetch parent profile data (name, CPF, RG, phone) - can be overridden
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, cpf, rg, phone')
      .eq('user_id', parentId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Failed to fetch parent profile");
    }

    // Use override data if provided, otherwise use profile data
    const parentName = overrideData?.parentName || profileData?.full_name || 'Responsável';
    const parentCpf = overrideData?.parentCpf || profileData?.cpf || '';
    const parentRg = overrideData?.parentRg || profileData?.rg || '';
    const parentPhone = overrideData?.parentPhone || profileData?.phone || '';

    console.log("Using parent data:", { 
      parentName, 
      parentCpf: parentCpf ? 'exists' : 'missing', 
      parentRg: parentRg ? 'exists' : 'missing',
      hasOverrides: !!overrideData 
    });

    // Format date
    const formattedBirthDate = new Date(birthDate).toLocaleDateString('pt-BR');
    const currentDate = new Date().toLocaleDateString('pt-BR');

    // Fetch additional data from child_registrations if available
    let address = overrideData?.address || "";
    let emergencyContact = overrideData?.emergencyContact || "";
    let childCpf = overrideData?.childCpf || "";
    
    if (registrationId) {
      const { data: regData } = await supabase
        .from('child_registrations')
        .select('address, city, allergies, medications, cpf')
        .eq('id', registrationId)
        .single();
      
      if (regData) {
        if (!address) {
          address = regData.address ? `${regData.address}, ${regData.city || 'Canoas/RS'}` : 'Canoas/RS';
        }
        if (!childCpf && regData.cpf) {
          childCpf = regData.cpf;
        }
      }
    }

    // Get authorized pickup for emergency contact if not overridden
    if (!emergencyContact && registrationId) {
      const { data: pickupData } = await supabase
        .from('authorized_pickups')
        .select('full_name, relationship')
        .eq('registration_id', registrationId)
        .limit(1)
        .single();
      
      if (pickupData) {
        emergencyContact = `${pickupData.full_name} (${pickupData.relationship})`;
      }
    }

    // Format child CPF if available
    const formattedChildCpf = childCpf ? childCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';

    // Format shift hours
    const shiftHours: Record<string, string> = {
      manha: "07h00min às 12h00min",
      tarde: "13h00min às 18h00min",
      integral: "07h00min às 16h00min (9 horas)",
    };

    // Calculate monthly value text
    const monthlyValueText = customMonthlyValue 
      ? `${formatCurrency(customMonthlyValue)} (valor negociado)` 
      : (planType ? `conforme plano ${planTypeLabels[planType] || planType}` : 'conforme tabela de preços vigente');

    // Create document content using customizable clauses
    const contractContent = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E CUIDADOS INFANTIS

ESCOLA DE ENSINO INFANTIL PIMPOLINHOS

Pelo presente instrumento particular de Contrato de Prestação de Serviços Educacionais e Cuidados Infantis, de um lado:

CLÁUSULA 1 – DAS PARTES CONTRATANTES

CONTRATADA: ${COMPANY_DATA.name}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ${COMPANY_DATA.cnpj}, com sede na ${COMPANY_DATA.address}, neste ato representada por sua proprietária/diretora, doravante denominada simplesmente CONTRATADA.

CONTRATANTE: ${parentName}, inscrito(a) no CPF sob nº ${parentCpf || 'não informado'}${parentRg ? `, RG nº ${parentRg}` : ''}, residente e domiciliado(a) em ${address || 'Canoas/RS'}, telefone: ${parentPhone || 'não informado'}, e-mail: ${parentEmail}, doravante denominado(a) simplesmente CONTRATANTE (responsável legal pelo aluno).

ALUNO(A): ${childName}${formattedChildCpf ? `, inscrito(a) no CPF sob nº ${formattedChildCpf}` : ''}, nascido(a) em ${formattedBirthDate}.

As partes acima qualificadas firmam o presente contrato, que se regerá pelas cláusulas e condições a seguir estabelecidas.


CLÁUSULA 2 – DO OBJETO

${getClause('clauseObject')}


CLÁUSULA 3 – DA MATRÍCULA E VIGÊNCIA

Turma: ${classTypeLabels[classType] || classType}
Turno: ${shiftTypeLabels[shiftType] || shiftType} (${shiftHours[shiftType] || 'conforme contratado'})

${getClause('clauseEnrollment')}


CLÁUSULA 4 – DAS MENSALIDADES E FORMA DE PAGAMENTO

Plano Contratado: ${planType ? planTypeLabels[planType] || planType : 'Conforme acordado'}
Valor Mensal: ${monthlyValueText}

${getClause('clauseMonthlyFee')}


CLÁUSULA 5 – DO HORÁRIO DE FUNCIONAMENTO

${getClause('clauseHours')}


CLÁUSULA 6 – DA ALIMENTAÇÃO

${getClause('clauseFood')}


CLÁUSULA 7 – DA ADMINISTRAÇÃO DE MEDICAMENTOS

${getClause('clauseMedication')}


CLÁUSULA 8 – DA SAÚDE E SEGURANÇA

Contato de emergência: ${emergencyContact || 'A ser informado pelo responsável'}

${getClause('clauseHealth')}


CLÁUSULA 9 – DO UNIFORME E MATERIAIS

${getClause('clauseUniform')}


CLÁUSULA 10 – DO REGULAMENTO INTERNO

${getClause('clauseRegulations')}


CLÁUSULA 11 – DO USO DE IMAGEM

${getClause('clauseImageRights')}


CLÁUSULA 12 – DA RESCISÃO

${getClause('clauseTermination')}


CLÁUSULA 13 – DA PROTEÇÃO DE DADOS (LGPD)

${getClause('clauseLGPD')}


CLÁUSULA 14 – DO FORO

${getClause('clauseForum')}


CLÁUSULA 15 – DA MULTA POR RESCISÃO

${getClause('clausePenalty')}


CLÁUSULA 16 – AUTORIZAÇÃO PARA REDES SOCIAIS

${getClause('clauseSocialMedia')}


CLÁUSULA 17 – DA VALIDADE DO CONTRATO

${getClause('clauseValidity')}


CLÁUSULA 18 – DISPOSIÇÕES GERAIS

${getClause('clauseGeneral')}


E, por estarem assim justos e contratados, as partes assinam o presente instrumento digitalmente, produzindo os mesmos efeitos jurídicos de um documento físico assinado de próprio punho.


Canoas/RS, ${currentDate}.


_____________________________________________
CONTRATANTE (Responsável Legal)
${parentName}
CPF: ${parentCpf || 'não informado'}


_____________________________________________
CONTRATADA
${COMPANY_DATA.name}
CNPJ: ${COMPANY_DATA.cnpj}
    `.trim();

    // Step 1: Create document in ZapSign with signer included
    console.log("Creating document in ZapSign...");
    // Some setups accept the token only via Authorization header, others also via query param.
    // We send both to maximize compatibility.
    const buildCreateDocUrl = (token: string) => {
      const url = new URL(`${ZAPSIGN_API_URL}/docs/`);
      url.searchParams.set('api_token', token);
      return url.toString();
    };

    // ZapSign supports markdown_text for document creation (ideal for contracts)
    // This is the recommended approach for text-based contracts
    const createDocPayload = {
      name: `Contrato de Matrícula - ${childName}`,
      markdown_text: contractContent,
      lang: "pt-br",
      disable_signer_emails: false,
      signed_file_only_finished: true,
      brand_primary_color: "#3B82F6",
      external_id: `${registrationId || childId}`,
      signers: [
        {
          name: parentName,
          email: parentEmail,
          auth_mode: "assinaturaTela-tokenEmail",
          send_automatic_email: true,
          send_automatic_whatsapp: false,
          lock_name: true,
          lock_email: true,
          qualification: "Responsável Legal",
          external_id: parentId,
          // Verificação com selfie obrigatória (apenas rosto, sem documento)
          require_selfie_photo: true,
          selfie_validation_type: "liveness-only",
        },
      ],
    };

    const doCreateDocRequest = async (authorizationValue: string, tokenForQuery: string) =>
      await fetch(buildCreateDocUrl(tokenForQuery), {
        method: 'POST',
        headers: {
          'Authorization': authorizationValue,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createDocPayload),
      });

    // ZapSign docs say "Authorization: Bearer <api_token>".
    // We also try with raw token as fallback (some setups accept it without prefix).
    console.log("Attempting ZapSign API call with Bearer prefix...");
    let createDocResponse = await doCreateDocRequest(`Bearer ${zapsignToken}`, zapsignToken);

    if (!createDocResponse.ok) {
      const errorText = await createDocResponse.text();
      console.log("ZapSign response with Bearer:", errorText);
      const shouldRetryRaw = /API token not found/i.test(errorText) || /Token da API n[aã]o encontrado/i.test(errorText);

      if (shouldRetryRaw) {
        console.warn("ZapSign auth failed with Bearer prefix; retrying with raw token...");
        createDocResponse = await doCreateDocRequest(zapsignToken, zapsignToken);
        
        if (!createDocResponse.ok) {
          const errorText2 = await createDocResponse.text();
          console.error("ZapSign create doc error (raw token):", errorText2);
          throw new Error(`Failed to create document in ZapSign: ${errorText2}`);
        }
      } else {
        console.error("ZapSign create doc error:", errorText);
        throw new Error(`Failed to create document in ZapSign: ${errorText}`);
      }
    }

    const docData = await createDocResponse.json();
    console.log("Document created:", JSON.stringify(docData, null, 2));

    const docToken = docData.token;
    const signerData = docData.signers?.[0];
    const signerToken = signerData?.token || '';
    const signUrl = signerData?.sign_url || '';

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
        monthly_value: customMonthlyValue || null,
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

    // Step 6: Send WhatsApp notification with signing link
    const GHL_API_KEY = Deno.env.get('GHL_API_KEY');
    const GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID');
    
    if (GHL_API_KEY && GHL_LOCATION_ID) {
      try {
        // Get parent phone from profile
        const { data: parentProfile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('user_id', parentId)
          .maybeSingle();
        
        const parentPhone = parentProfile?.phone;
        
        if (parentPhone) {
          // Normalize phone number
          let normalizedPhone = parentPhone.replace(/\D/g, "");
          if (normalizedPhone.startsWith("0")) {
            normalizedPhone = normalizedPhone.substring(1);
          }
          if (!normalizedPhone.startsWith("55")) {
            normalizedPhone = "55" + normalizedPhone;
          }
          normalizedPhone = "+" + normalizedPhone;

          // Search for GHL contact by phone
          const searchResponse = await fetch(
            `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(normalizedPhone)}&limit=1`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${GHL_API_KEY}`,
                Version: "2021-07-28",
              },
            }
          );

          if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            const ghlContactId = searchResult.contacts?.[0]?.id;

            if (ghlContactId) {
              // Update GHL contact tags - Move to "Contrato Enviado" stage
              await fetch(
                `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${GHL_API_KEY}`,
                    "Content-Type": "application/json",
                    Version: "2021-07-28",
                  },
                  body: JSON.stringify({
                    tags: ["contrato_enviado", "aguardando_assinatura"],
                  }),
                }
              );
              console.log("GHL contact updated with contract_sent tags");

              // Move opportunity to "Contrato Enviado" stage in pipeline
              const oppSearchResponse = await fetch(
                `https://services.leadconnectorhq.com/opportunities/search`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${GHL_API_KEY}`,
                    "Content-Type": "application/json",
                    Version: "2021-07-28",
                  },
                  body: JSON.stringify({
                    locationId: GHL_LOCATION_ID,
                    contactId: ghlContactId,
                    pipelineId: GHL_PIPELINE.id,
                  }),
                }
              );

              if (oppSearchResponse.ok) {
                const oppSearchResult = await oppSearchResponse.json();
                const opportunities = oppSearchResult.opportunities || [];

                if (opportunities.length > 0) {
                  const oppId = opportunities[0].id;
                  await fetch(
                    `https://services.leadconnectorhq.com/opportunities/${oppId}`,
                    {
                      method: "PUT",
                      headers: {
                        Authorization: `Bearer ${GHL_API_KEY}`,
                        "Content-Type": "application/json",
                        Version: "2021-07-28",
                      },
                      body: JSON.stringify({
                        pipelineStageId: GHL_PIPELINE.stages.CONTRATO_ENVIADO,
                        pipelineId: GHL_PIPELINE.id,
                      }),
                    }
                  );
                  console.log("Opportunity moved to Contrato Enviado stage");
                }
              }

              // Send WhatsApp message with signing link
              const whatsappMessage = `📝 *Olá, ${parentName}!*

O contrato de matrícula de *${childName}* foi enviado para assinatura digital! ✍️

📋 *Dados do Contrato:*
• Criança: ${childName}
• Turma: ${classTypeLabels[classType] || classType}
• Turno: ${shiftTypeLabels[shiftType] || shiftType}
${planType ? `• Plano: ${planTypeLabels[planType] || planType}` : ''}

👉 *Clique no link abaixo para assinar:*
${signUrl}

⏰ Após a assinatura, a cobrança será gerada automaticamente.

Qualquer dúvida, estamos à disposição!

💜 Creche Pimpolinhos`;

              const whatsappResponse = await fetch(
                "https://services.leadconnectorhq.com/conversations/messages",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${GHL_API_KEY}`,
                    "Content-Type": "application/json",
                    Version: "2021-04-15",
                  },
                  body: JSON.stringify({
                    type: "WhatsApp",
                    contactId: ghlContactId,
                    message: whatsappMessage,
                    body: whatsappMessage,
                  }),
                }
              );

              if (whatsappResponse.ok) {
                console.log("WhatsApp contract notification sent successfully");
              } else {
                const errorText = await whatsappResponse.text();
                console.warn("WhatsApp send failed:", errorText);
              }
            } else {
              console.warn("GHL contact not found for WhatsApp notification");
            }
          } else {
            console.warn("Failed to search GHL contact for WhatsApp");
          }
        } else {
          console.warn("Parent phone not found - skipping WhatsApp notification");
        }
      } catch (whatsappError) {
        console.warn("Failed to send WhatsApp notification:", whatsappError);
      }
    } else {
      console.warn("GHL credentials not configured - skipping WhatsApp notification");
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