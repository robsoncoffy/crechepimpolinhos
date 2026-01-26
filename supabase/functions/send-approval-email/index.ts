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

interface EmailLogEntry {
  requestId: string;
  timestamp: string;
  function: string;
  step: string;
  level: "info" | "warn" | "error";
  duration: number;
  to?: string;
  subject?: string;
  templateType?: string;
  ghlContactId?: string;
  ghlMessageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

function createLogger(functionName: string) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const log = (level: "info" | "warn" | "error", step: string, data?: Partial<EmailLogEntry>) => {
    const entry: EmailLogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      function: functionName,
      step,
      level,
      duration: Date.now() - startTime,
      ...data,
    };
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  };

  return {
    requestId,
    startTime,
    info: (step: string, data?: Partial<EmailLogEntry>) => log("info", step, data),
    warn: (step: string, data?: Partial<EmailLogEntry>) => log("warn", step, data),
    error: (step: string, error: Error | string, data?: Partial<EmailLogEntry>) => 
      log("error", step, { error: typeof error === "string" ? error : error.message, ...data }),
  };
}

// Send email via GHL with detailed logging
async function sendEmailViaGHL(
  email: string,
  name: string,
  subject: string,
  html: string,
  apiKey: string,
  locationId: string,
  logger: ReturnType<typeof createLogger>
): Promise<{ success: boolean; contactId?: string; messageId?: string; error?: string }> {
  const searchStart = Date.now();
  
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
  let wasCreated = false;

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.contact?.id) {
      contactId = searchResult.contact.id;
      logger.info("ghl_contact_found", { ghlContactId: contactId });
    } else {
      const createStart = Date.now();
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
        const errorText = await createResponse.text();
        logger.error("ghl_contact_create_failed", errorText, {
          metadata: { status: createResponse.status, createDuration: Date.now() - createStart }
        });
        return { success: false, error: `Failed to create contact: ${createResponse.status}` };
      }

      const createResult = await createResponse.json();
      contactId = createResult.contact.id;
      wasCreated = true;
      logger.info("ghl_contact_created", { 
        ghlContactId: contactId,
        metadata: { createDuration: Date.now() - createStart }
      });
    }
  } else {
    const errorText = await searchResponse.text();
    logger.error("ghl_contact_search_failed", errorText, {
      metadata: { status: searchResponse.status, searchDuration: Date.now() - searchStart }
    });
    return { success: false, error: `Failed to search contact: ${searchResponse.status}` };
  }

  const sendStart = Date.now();
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
    const errorText = await emailResponse.text();
    logger.error("ghl_email_send_failed", errorText, {
      ghlContactId: contactId,
      metadata: { status: emailResponse.status, sendDuration: Date.now() - sendStart }
    });
    return { success: false, contactId, error: `Failed to send email: ${emailResponse.status}` };
  }

  const sendResult = await emailResponse.json();
  const messageId = sendResult.messageId || sendResult.id;
  
  logger.info("ghl_email_sent", {
    ghlContactId: contactId,
    ghlMessageId: messageId,
    metadata: { sendDuration: Date.now() - sendStart, wasContactCreated: wasCreated }
  });

  return { success: true, contactId, messageId };
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("send-approval-email");
  logger.info("request_received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.error("auth_failed", "No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      logger.error("config_error", "GHL credentials not configured");
      throw new Error("GHL credentials not configured");
    }
    logger.info("credentials_validated");

    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("auth_failed", userError?.message || "User not authenticated");
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
      logger.error("auth_failed", "User is not admin", { metadata: { userId: user.id } });
      return new Response(
        JSON.stringify({ error: "Sem permissão de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logger.info("admin_verified", { metadata: { adminId: user.id } });

    const body: ApprovalEmailRequest = await req.json();
    const { parentId, parentName, approvalType, childName } = body;

    logger.info("request_parsed", { 
      templateType: `approval_${approvalType}`,
      metadata: { parentId, approvalType, childName: childName || null }
    });

    if (!parentId || !parentName || !approvalType) {
      logger.error("validation_failed", "Missing required fields");
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get parent email
    const { data: userData, error: userDataError } = await adminClient.auth.admin.getUserById(parentId);
    
    if (userDataError || !userData?.user?.email) {
      logger.error("user_lookup_failed", userDataError?.message || "User not found");
      return new Response(
        JSON.stringify({ error: "Não foi possível obter o email do responsável" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parentEmail = userData.user.email;
    logger.info("parent_email_resolved", { to: parentEmail });

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

    logger.info("email_prepared", { subject, to: parentEmail });

    const result = await sendEmailViaGHL(
      parentEmail,
      parentName,
      subject,
      bodyHtml,
      GHL_API_KEY,
      GHL_LOCATION_ID,
      logger
    );

    // Persist to email_logs
    const { error: logError } = await adminClient.from("email_logs").insert({
      request_id: logger.requestId,
      provider: "ghl",
      template_type: `approval_${approvalType}`,
      to_address: parentEmail,
      subject: subject,
      ghl_contact_id: result.contactId || null,
      ghl_message_id: result.messageId || null,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      direction: "outbound",
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        parentId,
        parentName,
        approvalType,
        childName: childName || null,
        duration: Date.now() - logger.startTime
      }
    });

    if (logError) {
      logger.warn("db_log_failed", { error: logError.message });
    } else {
      logger.info("db_log_saved");
    }

    if (!result.success) {
      logger.error("email_failed", result.error || "Unknown error");
      throw new Error(result.error || "Failed to send email via GHL");
    }

    logger.info("request_completed", { 
      metadata: { totalDuration: Date.now() - logger.startTime }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de aprovação enviado com sucesso via GHL",
        requestId: logger.requestId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logger.error("request_failed", error);
    
    try {
      await adminClient.from("email_logs").insert({
        request_id: logger.requestId,
        provider: "ghl",
        template_type: "approval",
        status: "error",
        error_message: error.message,
        direction: "outbound",
        metadata: { duration: Date.now() - logger.startTime }
      });
    } catch (logErr) {
      logger.warn("db_error_log_failed", { error: logErr instanceof Error ? logErr.message : String(logErr) });
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
