import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendWhatsAppRequest {
  inviteType: "parent" | "employee";
  inviteCode: string;
  phone: string;
  parentName?: string;
  employeeName?: string;
  role?: string;
  couponCode?: string;
  isPreEnrollment?: boolean; // Whether this invite comes from an approved pre-enrollment
}

function createLogger(functionName: string) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
    const entry = {
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
    info: (step: string, data?: Record<string, unknown>) => log("info", step, data),
    warn: (step: string, data?: Record<string, unknown>) => log("warn", step, data),
    error: (step: string, error: Error | string, data?: Record<string, unknown>) =>
      log("error", step, { error: typeof error === "string" ? error : error.message, ...data }),
  };
}

async function sendWhatsAppViaGHL(
  phone: string,
  message: string,
  apiKey: string,
  locationId: string,
  logger: ReturnType<typeof createLogger>
): Promise<{ success: boolean; contactId?: string; messageId?: string; error?: string }> {
  // Normalize phone number
  let normalizedPhone = phone.replace(/\D/g, "");
  if (normalizedPhone.startsWith("0")) {
    normalizedPhone = normalizedPhone.substring(1);
  }
  if (!normalizedPhone.startsWith("55")) {
    normalizedPhone = "55" + normalizedPhone;
  }
  normalizedPhone = "+" + normalizedPhone;

  // Search for contact by phone
  const searchResponse = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(normalizedPhone)}&limit=1`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
      },
    }
  );

  let contactId: string | undefined;

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.contacts && searchResult.contacts.length > 0) {
      contactId = searchResult.contacts[0].id;
      logger.info("ghl_contact_found", { contactId });
    } else {
      logger.warn("ghl_contact_not_found", { phone: normalizedPhone });
      return { success: false, error: "Contato não encontrado no GHL" };
    }
  } else {
    const errorText = await searchResponse.text();
    logger.error("ghl_search_failed", errorText);
    return { success: false, error: `Erro ao buscar contato: ${searchResponse.status}` };
  }

  // Send WhatsApp message
  const sendResponse = await fetch(
    "https://services.leadconnectorhq.com/conversations/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify({
        type: "WhatsApp",
        contactId,
        message,
        body: message,
      }),
    }
  );

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    logger.error("ghl_whatsapp_failed", errorText, { status: sendResponse.status });
    return { success: false, contactId, error: `Erro ao enviar WhatsApp: ${sendResponse.status}` };
  }

  const sendResult = await sendResponse.json();
  const messageId = sendResult.messageId || sendResult.id;

  logger.info("ghl_whatsapp_sent", { contactId, messageId });

  return { success: true, contactId, messageId };
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("resend-invite-whatsapp");
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
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      logger.error("config_error", "GHL credentials not configured");
      return new Response(JSON.stringify({ error: "Credenciais GHL não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("auth_failed", userError?.message || "User not authenticated");
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      logger.error("auth_failed", "User is not admin");
      return new Response(JSON.stringify({ error: "Sem permissão de administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ResendWhatsAppRequest = await req.json();
    const { inviteType, inviteCode, phone, parentName, employeeName, role, couponCode, isPreEnrollment } = body;

    logger.info("request_parsed", { inviteType, inviteCode, hasPhone: !!phone, isPreEnrollment: !!isPreEnrollment });

    if (!inviteCode || !phone) {
      logger.error("validation_failed", "Missing required fields");
      return new Response(
        JSON.stringify({ error: "Código do convite e telefone são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = "https://www.crechepimpolinhos.com.br";
    let message: string;
    let templateType: string;

    if (inviteType === "parent") {
      let signupUrl = `${appUrl}/auth?mode=signup&invite=${inviteCode}`;
      if (couponCode) {
        signupUrl += `&cupom=${encodeURIComponent(couponCode)}`;
      }

      const couponText = couponCode ? `\n🎁 Use o cupom *${couponCode}* para um desconto especial!\n` : "";
      
      // Only mention "pré-matrícula aprovada" if this comes from a pre-enrollment
      const statusLine = isPreEnrollment ? `\n✅ Sua pré-matrícula foi *aprovada*! 🎉\n` : "";

      message = `🎈 *Olá${parentName ? `, ${parentName}` : ""}!*

Você foi convidado(a) para a *Creche Pimpolinhos*!
${statusLine}${couponText}
👉 *Clique para completar seu cadastro:*
${signupUrl}

📋 Use o código *${inviteCode}* se solicitado.

💜 Creche Pimpolinhos`;

      templateType = "parent_invite_resend";
    } else {
      const roleLabels: Record<string, string> = {
        admin: "Administrador(a)",
        teacher: "Professor(a)",
        cook: "Cozinheira",
        nutritionist: "Nutricionista",
        pedagogue: "Pedagoga",
        auxiliar: "Auxiliar de Sala",
      };

      const roleLabel = roleLabels[role || "teacher"] || role || "Funcionário";
      const registrationUrl = `${appUrl}/cadastro-funcionario?code=${inviteCode}`;

      message = `🎈 *Olá${employeeName ? `, ${employeeName}` : ""}!*

Você foi convidado(a) para fazer parte da equipe da *Creche Pimpolinhos* como *${roleLabel}*!

👉 *Clique para completar seu cadastro:*
${registrationUrl}

📋 Código: *${inviteCode}*

💜 Creche Pimpolinhos`;

      templateType = "employee_invite_resend";
    }

    const result = await sendWhatsAppViaGHL(phone, message, GHL_API_KEY, GHL_LOCATION_ID, logger);

    // Log to whatsapp_message_logs
    try {
      await adminClient.from("whatsapp_message_logs").insert({
        ghl_contact_id: result.contactId || null,
        ghl_message_id: result.messageId || null,
        phone,
        message_preview: message.substring(0, 200),
        template_type: templateType,
        status: result.success ? "sent" : "error",
        error_message: result.success ? null : result.error,
        metadata: {
          full_message: message,
          invite_code: inviteCode,
          invite_type: inviteType,
          resent: true,
        },
      });
      logger.info("whatsapp_log_saved");
    } catch (logErr) {
      logger.warn("whatsapp_log_failed", { error: logErr instanceof Error ? logErr.message : String(logErr) });
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "Erro ao enviar WhatsApp" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("request_completed", { duration: Date.now() - logger.startTime });

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp reenviado com sucesso!",
        requestId: logger.requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("request_failed", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
