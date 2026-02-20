import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryEmailRequest {
  email: string;
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
            firstName: "Usuário",
            lastName: "",
            email,
            source: "Sistema Pimpolinhos",
            tags: ["recuperacao-senha"],
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
  const logger = createLogger("send-recovery-email");
  logger.info("request_received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      logger.error("config_error", "GHL credentials not configured");
      throw new Error("GHL credentials not configured");
    }
    logger.info("credentials_validated");

    const body: RecoveryEmailRequest = await req.json();
    const { email } = body;
    
    logger.info("request_parsed", { 
      to: email, 
      templateType: "recovery"
    });

    if (!email) {
      logger.error("validation_failed", "Email is required");
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate password reset link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: "https://www.crechepimpolinhos.com.br/redefinir-senha",
      },
    });

    if (linkError) {
      logger.warn("recovery_link_generation_failed", { error: linkError.message });
      // Still return success to not reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData?.properties?.action_link) {
      logger.warn("no_action_link_generated");
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recoveryLink = linkData.properties.action_link;
    logger.info("recovery_link_generated");

    const subject = "🔐 Recuperação de Senha - Creche Pimpolinhos";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
      <div style="background: #ffffff; border-radius: 12px; padding: 12px 20px; display: inline-block; margin-bottom: 12px;">
        <img src="https://www.crechepimpolinhos.com.br/logo-email.png" alt="Creche Pimpolinhos" width="100" style="display: block; height: auto;">
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Recuperação de Senha</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1e293b; margin-top: 0;">Olá! 👋</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Recebemos uma solicitação para redefinir a senha da sua conta na Creche Pimpolinhos.
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Clique no botão abaixo para criar uma nova senha:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${recoveryLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Redefinir Minha Senha
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          <strong>⚠️ Importante:</strong> Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.
        </p>
      </div>
      
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
      </p>
      <p style="color: #3b82f6; font-size: 12px; word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">
        ${recoveryLink}
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
    `;

    logger.info("email_prepared", { subject, to: email });

    const result = await sendEmailViaGHL(
      email,
      subject,
      html,
      GHL_API_KEY,
      GHL_LOCATION_ID,
      logger
    );

    // Persist to email_logs
    const { error: logError } = await adminClient.from("email_logs").insert({
      request_id: logger.requestId,
      provider: "ghl",
      template_type: "recovery",
      to_address: email,
      subject: subject,
      body_html: html,
      ghl_contact_id: result.contactId || null,
      ghl_message_id: result.messageId || null,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      direction: "outbound",
      sent_at: result.success ? new Date().toISOString() : null,
      retry_count: 0,
      next_retry_at: result.success ? null : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      metadata: { 
        duration: Date.now() - logger.startTime
      }
    });

    if (logError) {
      logger.warn("db_log_failed", { error: logError.message });
    } else {
      logger.info("db_log_saved");
    }

    if (!result.success) {
      logger.warn("email_send_failed", { error: result.error });
      // Still return success to not reveal if email exists
    }

    logger.info("request_completed", { 
      metadata: { totalDuration: Date.now() - logger.startTime }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de recuperação enviado com sucesso",
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
        template_type: "recovery",
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
