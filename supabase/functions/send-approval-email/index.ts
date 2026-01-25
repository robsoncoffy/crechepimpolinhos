import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  parentId: string;
  parentName: string;
  approvalType: "parent" | "child";
  childName?: string;
}

// Send email via GHL
async function sendEmailViaGHL(
  email: string,
  name: string,
  subject: string,
  html: string,
  apiKey: string,
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  const searchResponse = await fetch(
    `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
      },
    }
  );

  let contactId: string;

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.contact?.id) {
      contactId = searchResult.contact.id;
    } else {
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "Responsável";
      const lastName = nameParts.slice(1).join(" ") || "";

      const createResponse = await fetch(
        "https://services.leadconnectorhq.com/contacts/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId,
            firstName,
            lastName,
            email,
            source: "Sistema Pimpolinhos",
            tags: ["aprovacao", "transacional"],
          }),
        }
      );

      if (!createResponse.ok) {
        return { success: false, error: `Failed to create contact: ${createResponse.status}` };
      }

      const createResult = await createResponse.json();
      contactId = createResult.contact.id;
    }
  } else {
    return { success: false, error: `Failed to search contact: ${searchResponse.status}` };
  }

  const emailResponse = await fetch(
    "https://services.leadconnectorhq.com/conversations/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify({
        type: "Email",
        contactId,
        emailTo: email,
        subject,
        html,
      }),
    }
  );

  if (!emailResponse.ok) {
    return { success: false, error: `Failed to send email: ${emailResponse.status}` };
  }

  return { success: true };
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-approval-email function called (GHL)");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Sem permissão de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ApprovalEmailRequest = await req.json();
    const { parentId, parentName, approvalType, childName } = body;

    if (!parentId || !parentName || !approvalType) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get parent email
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: userData, error: userDataError } = await adminClient.auth.admin.getUserById(parentId);
    
    if (userDataError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Não foi possível obter o email do responsável" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parentEmail = userData.user.email;
    const appUrl = "https://www.crechepimpolinhos.com.br";

    let subject: string;
    let bodyHtml: string;

    if (approvalType === "parent") {
      subject = "✅ Seu cadastro foi aprovado na Creche Pimpolinhos!";
      bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🎈 Creche Pimpolinhos</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Cadastro Aprovado!</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1e293b; margin-top: 0;">Olá, ${parentName}! 👋</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Temos o prazer de informar que <strong style="color: #22c55e;">seu cadastro foi aprovado</strong> na Creche Pimpolinhos!
      </p>
      
      <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 10px; font-size: 16px;">✅ Próximos passos</h3>
        <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
          Agora você pode acessar o sistema e cadastrar seu(s) filho(s) para matrícula.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}/painel-pais" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Acessar Meu Painel
        </a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Creche Pimpolinhos
      </p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      subject = `🎉 ${childName} foi aprovado(a) na Creche Pimpolinhos!`;
      bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🎈 Creche Pimpolinhos</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Matrícula Aprovada!</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1e293b; margin-top: 0;">Olá, ${parentName}! 🎉</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Temos o prazer de informar que o cadastro de <strong>${childName}</strong> foi <strong style="color: #22c55e;">aprovado</strong> na Creche Pimpolinhos!
      </p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <h3 style="color: #166534; margin: 0 0 10px; font-size: 16px;">📋 O que acontece agora?</h3>
        <ul style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Você receberá o contrato para assinatura digital</li>
          <li>Após assinatura, a matrícula estará confirmada</li>
          <li>Você já pode acompanhar tudo pelo painel</li>
        </ul>
      </div>

      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        No painel você poderá:
      </p>
      <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
        <li>📅 Acompanhar a agenda diária</li>
        <li>💬 Comunicar-se com a escola</li>
        <li>📷 Receber fotos e atualizações</li>
        <li>🍽️ Ver o cardápio semanal</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}/painel-pais" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Acessar Painel do Responsável
        </a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Creche Pimpolinhos
      </p>
    </div>
  </div>
</body>
</html>
      `;
    }

    console.log("Sending approval email to:", parentEmail, "Type:", approvalType);

    const result = await sendEmailViaGHL(
      parentEmail,
      parentName,
      subject,
      bodyHtml,
      GHL_API_KEY,
      GHL_LOCATION_ID
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to send email via GHL");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de aprovação enviado com sucesso via GHL" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-approval-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
