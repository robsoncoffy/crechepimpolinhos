import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteCode: string;
  role: string;
  employeeName?: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador(a)",
  teacher: "Professor(a)",
  cook: "Cozinheira",
  nutritionist: "Nutricionista",
  pedagogue: "Pedagoga",
  auxiliar: "Auxiliar de Sala",
};

const roleEmojis: Record<string, string> = {
  admin: "👑",
  teacher: "📚",
  cook: "👨‍🍳",
  nutritionist: "🥗",
  pedagogue: "🎓",
  auxiliar: "🤝",
};

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
      const firstName = nameParts[0] || "Funcionário";
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
            tags: ["funcionario", "convite-funcionario"],
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

  // Send email via GHL
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
  const logger = createLogger("send-employee-invite-email");
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

    const body: InviteEmailRequest = await req.json();
    const { email, inviteCode, role, employeeName } = body;

    logger.info("request_parsed", { 
      to: email, 
      templateType: "employee_invite",
      metadata: { inviteCode, role, employeeName: employeeName || null }
    });

    if (!email || !inviteCode) {
      logger.error("validation_failed", "Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email e código de convite são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = "https://www.crechepimpolinhos.com.br";
    const signupUrl = `${appUrl}/cadastro-funcionario?code=${inviteCode}`;
    const roleLabel = roleLabels[role] || role;
    const roleEmoji = roleEmojis[role] || "👤";
    const logoUrl = `${appUrl}/logo-email.png`;
    const greeting = employeeName ? `Olá, ${employeeName}!` : "Olá!";

    const subject = `${roleEmoji} Convite para Trabalhar na Creche Pimpolinhos`;
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 40px; text-align: center;">
        <img src="${logoUrl}" alt="Creche Pimpolinhos" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 12px; background: white; padding: 8px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Creche Pimpolinhos</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Convite para Nossa Equipe</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 40px;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600;">${greeting} 👋</h2>
        
        <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
          Temos o prazer de convidá-lo(a) para fazer parte da nossa equipe como <strong style="color: #16a34a;">${roleLabel}</strong>.
        </p>
        
        <!-- Invite Code Box -->
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; text-align: center; border: 2px solid #bbf7d0; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #166534; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            🔑 Seu Código de Convite
          </p>
          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #16a34a; letter-spacing: 3px;">
            ${inviteCode}
          </p>
        </div>
        
        <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
          Complete seu cadastro para acessar o sistema:
        </p>
        
        <!-- Benefits -->
        <ul style="margin: 0 0 32px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 2;">
          <li>⏰ Sistema de ponto digital</li>
          <li>📅 Agenda e atividades das turmas</li>
          <li>💬 Chat interno com a equipe</li>
          <li>📝 Registro de atividades diárias</li>
        </ul>
        
        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
            Completar Meu Cadastro
          </a>
        </div>
        
        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px; text-align: center;">
          Ou copie: <a href="${signupUrl}" style="color: #16a34a;">${signupUrl}</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-align: center;">
          ⏳ Este convite expira em <strong>7 dias</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Creche Pimpolinhos
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
    `;

    logger.info("email_prepared", { subject });

    const result = await sendEmailViaGHL(
      email,
      employeeName || "Funcionário",
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
      template_type: "employee_invite",
      to_address: email,
      subject: subject,
      ghl_contact_id: result.contactId || null,
      ghl_message_id: result.messageId || null,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      direction: "outbound",
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        inviteCode, 
        role,
        employeeName: employeeName || null,
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
        message: "E-mail de convite enviado com sucesso via GHL",
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
        template_type: "employee_invite",
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
