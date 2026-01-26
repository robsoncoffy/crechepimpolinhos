import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  childRegistrationId: string;
  invitedEmail: string;
  invitedName: string;
  relationship: string;
  childName: string;
  inviterName: string;
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
            tags: ["convite-responsavel", "segundo-responsavel"],
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
  const logger = createLogger("send-guardian-invite");
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

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      logger.error("auth_failed", userError?.message || "User not authenticated");
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logger.info("user_authenticated", { metadata: { userId: user.id } });

    const body: InviteRequest = await req.json();
    const { childRegistrationId, invitedEmail, invitedName, relationship, childName, inviterName } = body;

    logger.info("request_parsed", { 
      to: invitedEmail,
      templateType: "guardian_invite",
      metadata: { childRegistrationId, relationship, childName }
    });

    if (!childRegistrationId || !invitedEmail || !invitedName || !childName) {
      logger.error("validation_failed", "Missing required fields");
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user owns the child registration
    const { data: registration, error: regError } = await adminClient
      .from("child_registrations")
      .select("id, parent_id")
      .eq("id", childRegistrationId)
      .single();

    if (regError || !registration) {
      logger.error("registration_not_found", regError?.message || "Not found");
      return new Response(
        JSON.stringify({ error: "Cadastro não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (registration.parent_id !== user.id) {
      logger.error("permission_denied", "User does not own registration");
      return new Response(
        JSON.stringify({ error: "Sem permissão para este cadastro" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await adminClient
      .from("guardian_invitations")
      .select("id")
      .eq("child_registration_id", childRegistrationId)
      .eq("invited_email", invitedEmail.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      logger.warn("duplicate_invite", { metadata: { existingId: existingInvite.id } });
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await adminClient
      .from("guardian_invitations")
      .insert({
        child_registration_id: childRegistrationId,
        invited_by: user.id,
        invited_email: invitedEmail.toLowerCase(),
        invited_name: invitedName,
        relationship: relationship || "Responsável",
      })
      .select()
      .single();

    if (inviteError) {
      logger.error("invitation_create_failed", inviteError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logger.info("invitation_created", { metadata: { invitationId: invitation.id, token: invitation.token } });

    const inviteUrl = `https://www.crechepimpolinhos.com.br/aceitar-convite?token=${invitation.token}`;

    const subject = `${inviterName} te convidou para ser responsável por ${childName}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center;">
      <div style="background: #ffffff; border-radius: 12px; padding: 12px 20px; display: inline-block; margin-bottom: 12px;">
        <img src="https://www.crechepimpolinhos.com.br/logo-email.png" alt="Creche Pimpolinhos" width="100" style="display: block; height: auto;">
      </div>
      <h1 style="color: white; margin: 0; font-size: 20px;">Convite para Responsável</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1e293b; margin-top: 0;">Olá, ${invitedName}! 👋</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        <strong>${inviterName}</strong> te convidou para ser ${relationship || "responsável"} de <strong>${childName}</strong> na Creche Pimpolinhos.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Ao aceitar este convite, você terá acesso ao painel do responsável onde poderá:
      </p>
      <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
        <li>📅 Acompanhar a agenda diária</li>
        <li>📊 Ver o crescimento e desenvolvimento</li>
        <li>💬 Comunicar-se com a escola</li>
        <li>📷 Receber fotos e atualizações</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Aceitar Convite
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        Este convite expira em 7 dias. Se você não solicitou este convite, ignore este email.
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

    logger.info("email_prepared", { subject, to: invitedEmail });

    const result = await sendEmailViaGHL(
      invitedEmail,
      invitedName,
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
      template_type: "guardian_invite",
      to_address: invitedEmail,
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
        invitationId: invitation.id,
        childRegistrationId,
        inviterName,
        childName,
        relationship,
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
      // Don't fail the whole request - invitation was created
    }

    logger.info("request_completed", { 
      metadata: { totalDuration: Date.now() - logger.startTime, invitationId: invitation.id }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso",
        invitationId: invitation.id,
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
        template_type: "guardian_invite",
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
