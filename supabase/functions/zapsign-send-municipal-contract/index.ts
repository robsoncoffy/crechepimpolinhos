import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

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

interface MunicipalContractRequest {
  childId: string;
  registrationId: string;
  parentId: string;
  childName: string;
  birthDate: string;
  classType: string;
  shiftType: string;
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
    clauseConvenio?: string;
    clauseEnrollment?: string;
    clauseFrequency?: string;
    clauseHours?: string;
    clauseFood?: string;
    clauseMedication?: string;
    clauseUniform?: string;
    clauseHealth?: string;
    clauseRegulations?: string;
    clauseImageRights?: string;
    clauseLGPD?: string;
    clauseTermination?: string;
    clauseDigitalComm?: string;
    clauseForum?: string;
  };
}

// Dados fixos da empresa
const COMPANY_DATA = {
  name: "CRECHE INFANTIL PIMPOLINHOS LTDA",
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

    // Normalize token in case it was saved with a prefix
    const zapsignToken = ZAPSIGN_API_KEY
      .replace(/^Bearer\s+/i, "")
      .replace(/^Token\s+/i, "")
      .trim();

    console.log("ZapSign token loaded (len):", zapsignToken.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MunicipalContractRequest = await req.json();
    console.log("Received municipal contract request:", JSON.stringify(body, null, 2));

    const {
      childId,
      registrationId,
      parentId,
      childName,
      birthDate,
      classType,
      shiftType,
      overrideData,
      clauseCustomizations,
    } = body;

    // Default clause texts for MUNICIPAL contract
    const DEFAULT_CLAUSES = {
      clauseObject: `O presente contrato tem por objeto a prestação de serviços educacionais e de cuidados infantis, em conformidade com a Lei nº 9.394/1996 (Lei de Diretrizes e Bases da Educação Nacional), normas da Secretaria Municipal de Educação de Canoas/RS e demais legislações aplicáveis à Educação Infantil.

Os serviços compreendem atividades pedagógicas, recreativas, de socialização, cuidados básicos, higiene, alimentação e repouso, respeitando a faixa etária da criança.`,

      clauseConvenio: `2.1. O atendimento prestado ao(à) aluno(a) é realizado por meio de convênio firmado entre a CONTRATADA e o Município de Canoas/RS, sendo o custeio financeiro de responsabilidade do Município, enquanto vigente o referido convênio.

2.2. Não haverá cobrança de mensalidade ao responsável legal, desde que mantidas as condições estabelecidas pelo convênio e pela Secretaria Municipal de Educação.

2.3. A vaga do(a) aluno(a) está condicionada:
a) à vigência do convênio com o Município;
b) ao cumprimento deste contrato e do Regulamento Interno;
c) à frequência regular da criança.`,

      clauseEnrollment: `3.1. A matrícula é pessoal e intransferível e assegura a vaga do(a) aluno(a) na turma correspondente à sua faixa etária.

3.2. A efetivação da matrícula ocorrerá mediante assinatura deste contrato e entrega da documentação exigida pela instituição e pela SME.`,

      clauseFrequency: `4.1. O(a) aluno(a) deverá frequentar regularmente a instituição, conforme critérios definidos pelo convênio municipal.

4.2. Faltas excessivas, sem justificativa formal, poderão resultar na perda da vaga, conforme normas da Secretaria Municipal de Educação.`,

      clauseHours: `5.1. O horário de funcionamento da instituição é:
• Integral: das 7h às 19h;
• Meio Turno Manhã: das 8h às 12h30;
• Meio Turno Tarde: das 13h às 18h.

5.2. Será concedida tolerância máxima de 15 (quinze) minutos para a retirada da criança após o término do horário contratado.

5.3. Ultrapassado o período de tolerância, será aplicada multa de R$ 30,00 (trinta reais) a cada 15 (quinze) minutos de atraso, a ser paga pelo responsável legal.

5.4. Caso o atraso ultrapasse 01 (uma) hora, sem contato prévio ou justificativa plausível, a CONTRATADA poderá acionar o Conselho Tutelar, visando garantir a segurança e o bem-estar da criança.

5.5. Somente pais, responsáveis legais ou pessoas previamente autorizadas poderão retirar o(a) aluno(a).`,

      clauseFood: `6.1. A instituição fornecerá alimentação balanceada, elaborada e supervisionada por nutricionista.

6.2. Crianças com restrições alimentares deverão apresentar laudo médico e trazer sua alimentação identificada, quando necessário.`,

      clauseMedication: `7.1. Medicamentos somente serão administrados mediante apresentação de receita médica, contendo dosagem e horários.

7.2. Crianças com temperatura igual ou superior a 37,9°C não permanecerão na instituição, devendo o responsável providenciar a retirada imediata.`,

      clauseUniform: `8.1. O uso do uniforme é opcional, porém recomendado.

8.2. Materiais de uso pessoal (fraldas, lenços, pomadas, mamadeiras, fórmulas, entre outros) são de responsabilidade da família.`,

      clauseHealth: `9.1. Crianças com doenças contagiosas não deverão frequentar a instituição até liberação médica.`,

      clauseRegulations: `O responsável declara ter lido e concordado com o Regulamento Interno da Creche Infantil Pimpolinhos, que integra este contrato.`,

      clauseImageRights: `Fica autorizada a utilização da imagem e voz do(a) aluno(a) para fins pedagógicos e institucionais, sem fins lucrativos, respeitando a legislação vigente.`,

      clauseLGPD: `Os dados pessoais serão tratados conforme a Lei Geral de Proteção de Dados – LGPD (Lei nº 13.709/2018), exclusivamente para fins legais, administrativos e pedagógicos.`,

      clauseTermination: `13.1. O contrato poderá ser rescindido por qualquer das partes.

13.2. A CONTRATADA poderá rescindir o contrato nos casos de:
a) descumprimento das normas internas;
b) reiterados atrasos na retirada da criança;
c) omissão de informações relevantes;
d) encerramento ou suspensão do convênio com o Município.`,

      clauseDigitalComm: `As partes reconhecem como válidas as comunicações realizadas por WhatsApp, e-mail ou aplicativos institucionais.`,

      clauseForum: `Fica eleito o Foro da Comarca de Canoas/RS, com renúncia a qualquer outro.`,
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

    // Fetch parent profile data
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

    // Format shift hours for municipal
    const shiftHours: Record<string, string> = {
      manha: "08h00min às 12h30min",
      tarde: "13h00min às 18h00min",
      integral: "07h00min às 19h00min",
    };

    // Create document content for MUNICIPAL contract
    const contractContent = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E CUIDADOS INFANTIS
CONVÊNIO PREFEITURA

CRECHE INFANTIL PIMPOLINHOS

Pelo presente instrumento particular de Contrato de Prestação de Serviços Educacionais e Cuidados Infantis, de um lado:

CLÁUSULA 1 – DAS PARTES CONTRATANTES

CONTRATADA: ${COMPANY_DATA.name}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ${COMPANY_DATA.cnpj}, com sede na ${COMPANY_DATA.address}.

CONTRATANTE: ${parentName}, inscrito(a) no CPF sob nº ${parentCpf || 'não informado'}${parentRg ? `, RG nº ${parentRg}` : ''}, residente e domiciliado(a) em ${address || 'Canoas/RS'}, telefone: ${parentPhone || 'não informado'}, e-mail: ${parentEmail}.

ALUNO(A): ${childName}${formattedChildCpf ? `, inscrito(a) no CPF sob nº ${formattedChildCpf}` : ''}, nascido(a) em ${formattedBirthDate}.


CLÁUSULA 2 – DO OBJETO

${getClause('clauseObject')}


CLÁUSULA 3 – DO CONVÊNIO E DO CUSTEIO

${getClause('clauseConvenio')}


CLÁUSULA 4 – DA MATRÍCULA

Turma: ${classTypeLabels[classType] || classType}
Turno: ${shiftTypeLabels[shiftType] || shiftType} (${shiftHours[shiftType] || 'conforme contratado'})

${getClause('clauseEnrollment')}


CLÁUSULA 5 – DA FREQUÊNCIA E PERDA DA VAGA

${getClause('clauseFrequency')}


CLÁUSULA 6 – DO HORÁRIO E DA PONTUALIDADE

${getClause('clauseHours')}


CLÁUSULA 7 – DA ALIMENTAÇÃO

${getClause('clauseFood')}


CLÁUSULA 8 – DA ADMINISTRAÇÃO DE MEDICAMENTOS

${getClause('clauseMedication')}


CLÁUSULA 9 – DO UNIFORME, MATERIAIS E PERTENCES

${getClause('clauseUniform')}


CLÁUSULA 10 – DA SAÚDE E SEGURANÇA

Contato de emergência: ${emergencyContact || 'A ser informado pelo responsável'}

${getClause('clauseHealth')}


CLÁUSULA 11 – DO REGULAMENTO INTERNO

${getClause('clauseRegulations')}


CLÁUSULA 12 – DO USO DE IMAGEM

${getClause('clauseImageRights')}


CLÁUSULA 13 – DA PROTEÇÃO DE DADOS

${getClause('clauseLGPD')}


CLÁUSULA 14 – DA RESCISÃO

${getClause('clauseTermination')}


CLÁUSULA 15 – DAS COMUNICAÇÕES DIGITAIS

${getClause('clauseDigitalComm')}


CLÁUSULA 16 – DO FORO

${getClause('clauseForum')}


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
    console.log("Creating municipal contract document in ZapSign...");
    
    const buildCreateDocUrl = (token: string) => {
      const url = new URL(`${ZAPSIGN_API_URL}/docs/`);
      url.searchParams.set('api_token', token);
      return url.toString();
    };

    const createDocPayload = {
      name: `Contrato Municipal - ${childName}`,
      markdown_text: contractContent,
      lang: "pt-br",
      disable_signer_emails: false,
      signed_file_only_finished: true,
      brand_primary_color: "#2563EB", // Blue for municipal
      external_id: `municipal-${registrationId || childId}`,
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

    console.log("Attempting ZapSign API call with Bearer prefix...");
    let createDocResponse = await doCreateDocRequest(`Bearer ${zapsignToken}`, zapsignToken);

    if (!createDocResponse.ok) {
      const errorText = await createDocResponse.text();
      console.log("ZapSign response with Bearer:", errorText);
      
      console.log("Retrying without Bearer prefix...");
      createDocResponse = await doCreateDocRequest(zapsignToken, zapsignToken);
      
      if (!createDocResponse.ok) {
        const retryErrorText = await createDocResponse.text();
        console.error("ZapSign create doc error (retry):", retryErrorText);
        throw new Error(`Failed to create ZapSign document: ${retryErrorText}`);
      }
    }

    const docData = await createDocResponse.json();
    console.log("ZapSign document created:", JSON.stringify(docData, null, 2));

    const docToken = docData.token;
    const signerToken = docData.signers?.[0]?.token;
    const signUrl = docData.signers?.[0]?.sign_url;

    if (!docToken || !signerToken) {
      console.error("Missing tokens in ZapSign response:", { docToken: !!docToken, signerToken: !!signerToken });
      throw new Error("Failed to get document tokens from ZapSign");
    }

    // Store contract info in database
    const { error: contractError } = await supabase
      .from('contracts')
      .insert({
        child_id: childId,
        registration_id: registrationId,
        zapsign_doc_token: docToken,
        zapsign_signer_token: signerToken,
        sign_url: signUrl,
        status: 'pending',
        contract_type: 'municipal',
      });

    if (contractError) {
      console.error("Error storing contract:", contractError);
    }

    // Update GHL pipeline stage if contact exists
    try {
      const { data: preEnrollment } = await supabase
        .from('pre_enrollments')
        .select('ghl_contact_id')
        .eq('id', registrationId)
        .maybeSingle();

      if (preEnrollment?.ghl_contact_id) {
        await supabase.functions.invoke("ghl-sync-contact/update-stage", {
          body: {
            ghl_contact_id: preEnrollment.ghl_contact_id,
            stage_id: GHL_PIPELINE.stages.CONTRATO_ENVIADO,
            tags: ["contrato_municipal_enviado"],
          },
        });
        console.log("GHL stage updated to CONTRATO_ENVIADO");
      }
    } catch (ghlError) {
      console.error("Error updating GHL stage:", ghlError);
    }

    // Send email notification
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'Creche Pimpolinhos <noreply@crechepimpolinhos.lovable.app>',
          to: parentEmail,
          subject: `Contrato Municipal - ${childName} - Creche Pimpolinhos`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563EB;">Contrato de Matrícula Municipal</h2>
              <p>Olá, ${parentName}!</p>
              <p>O contrato de matrícula municipal para <strong>${childName}</strong> está pronto para assinatura.</p>
              <p><strong>Tipo de Vaga:</strong> Convênio Prefeitura</p>
              <p><strong>Turma:</strong> ${classTypeLabels[classType] || classType}</p>
              <p><strong>Turno:</strong> ${shiftTypeLabels[shiftType] || shiftType}</p>
              <p style="background: #EFF6FF; padding: 12px; border-radius: 8px; border-left: 4px solid #2563EB;">
                <strong>Importante:</strong> Esta vaga é custeada pelo Município de Canoas através de convênio. 
                Não há cobrança de mensalidade.
              </p>
              <p>Você receberá outro e-mail do ZapSign com o link para assinar digitalmente.</p>
              <p style="margin-top: 24px;">Atenciosamente,<br><strong>Creche Pimpolinhos</strong></p>
            </div>
          `,
        });
        console.log("Email notification sent successfully");
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        docToken, 
        signerToken, 
        signUrl,
        message: "Municipal contract created and sent successfully" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in zapsign-send-municipal-contract:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
