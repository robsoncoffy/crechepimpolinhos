import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GHL Pipeline Configuration - Jornada de Matrícula
const GHL_PIPELINE = {
  id: "gfqyCfBI23CDEkJk9gwC",
  stages: {
    AGUARDANDO_APROVACAO: "53392148-570b-449f-8326-e88ddb69751a",
  },
};

interface InviteEmailRequest {
  email: string;
  phone?: string;
  inviteCode: string;
  childName?: string;
  parentName?: string;
  couponCode?: string;
  couponDiscountType?: "percentage" | "fixed";
  couponDiscountValue?: number;
  ghlContactId?: string; // Direct GHL contact ID for reliable WhatsApp delivery
  isPreEnrollment?: boolean; // Whether this invite comes from an approved pre-enrollment
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
  logger: ReturnType<typeof createLogger>,
  phone?: string // Add phone to update contact if needed
): Promise<{ success: boolean; contactId?: string; messageId?: string; error?: string }> {
  const searchStart = Date.now();
  
  // Normalize phone number for GHL
  let normalizedPhone: string | undefined;
  if (phone) {
    normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = normalizedPhone.substring(1);
    }
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }
    normalizedPhone = "+" + normalizedPhone;
  }
  
  // First, find or create contact
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
      logger.info("ghl_contact_found", { 
        ghlContactId: contactId,
        metadata: { searchDuration: Date.now() - searchStart }
      });
      
      // IMPORTANT: Update the contact's phone number if we have one and it's different
      if (normalizedPhone) {
        const existingPhone = searchResult.contact.phone;
        if (!existingPhone || existingPhone !== normalizedPhone) {
          const nameParts = name.trim().split(" ");
          const firstName = nameParts[0] || "Usuário";
          const lastName = nameParts.slice(1).join(" ") || "";
          
          const updateResponse = await fetch(
            `https://services.leadconnectorhq.com/contacts/${contactId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Version: "2021-07-28",
              },
              body: JSON.stringify({
                phone: normalizedPhone,
                firstName,
                lastName,
                tags: ["convite-pais"],
              }),
            }
          );
          
          if (updateResponse.ok) {
            logger.info("ghl_contact_phone_updated", { 
              ghlContactId: contactId,
              metadata: { phone: normalizedPhone }
            });
          } else {
            const updateError = await updateResponse.text();
            logger.warn("ghl_contact_phone_update_failed", { error: updateError });
          }
        }
      }
    } else {
      // Create new contact
      const createStart = Date.now();
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "Usuário";
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
            phone: normalizedPhone, // Include phone when creating
            source: "Sistema Pimpolinhos",
            tags: ["convite-pais", "transacional"],
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
        metadata: { createDuration: Date.now() - createStart, hasPhone: !!normalizedPhone }
      });
    }
  } else {
    const errorText = await searchResponse.text();
    logger.error("ghl_contact_search_failed", errorText, {
      metadata: { status: searchResponse.status }
    });
    return { success: false, error: `Failed to search contact: ${searchResponse.status}` };
  }

  // Send email via GHL Conversations API
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
    metadata: { 
      sendDuration: Date.now() - sendStart,
      wasContactCreated: wasCreated
    }
  });

  return { success: true, contactId, messageId };
}

// Send WhatsApp message via GHL using direct contact ID (preferred) or phone search (fallback)
async function sendWhatsAppViaGHL(
  phoneOrContactId: string,
  message: string,
  apiKey: string,
  locationId: string,
  logger: ReturnType<typeof createLogger>,
  useDirectContactId: boolean = false
): Promise<{ success: boolean; contactId?: string; messageId?: string; error?: string }> {
  let contactId: string | undefined;

  if (useDirectContactId) {
    // Direct contact ID provided - no search needed
    contactId = phoneOrContactId;
    logger.info("ghl_whatsapp_using_direct_contact", { ghlContactId: contactId });
  } else {
    // Normalize phone number (remove non-digits, add country code if needed)
    let normalizedPhone = phoneOrContactId.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = normalizedPhone.substring(1);
    }
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }
    normalizedPhone = "+" + normalizedPhone;

    // Use the contacts lookup endpoint (not duplicate search which doesn't accept phone)
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

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.contacts && searchResult.contacts.length > 0) {
        contactId = searchResult.contacts[0].id;
        logger.info("ghl_whatsapp_contact_found", { ghlContactId: contactId });
      } else {
        logger.warn("ghl_whatsapp_contact_not_found", { metadata: { phone: normalizedPhone } });
        return { success: false, error: "Contact not found for WhatsApp" };
      }
    } else {
      const errorText = await searchResponse.text();
      logger.error("ghl_whatsapp_search_failed", errorText);
      return { success: false, error: `Failed to search contact: ${searchResponse.status}` };
    }
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
    logger.warn("ghl_whatsapp_send_failed", { error: errorText, metadata: { status: sendResponse.status } });
    return { success: false, contactId, error: `Failed to send WhatsApp: ${sendResponse.status}` };
  }

  const sendResult = await sendResponse.json();
  const messageId = sendResult.messageId || sendResult.id;
  
  logger.info("ghl_whatsapp_sent", {
    ghlContactId: contactId,
    ghlMessageId: messageId,
  });

  return { success: true, contactId, messageId };
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("send-parent-invite-email");
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
      throw new Error("GHL credentials not configured");
    }
    logger.info("credentials_validated");

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
      logger.error("auth_failed", "User is not admin", { metadata: { userId: user.id } });
      return new Response(JSON.stringify({ error: "Sem permissão de administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logger.info("admin_verified", { metadata: { adminId: user.id } });

    const body: InviteEmailRequest = await req.json();
    const { email, phone, inviteCode, childName, parentName, couponCode, couponDiscountType, couponDiscountValue, ghlContactId, isPreEnrollment } = body;

    logger.info("request_parsed", { 
      to: email, 
      templateType: "parent_invite",
      metadata: { inviteCode, parentName: parentName || null, hasCoupon: !!couponCode, hasPhone: !!phone, hasGhlContactId: !!ghlContactId, isPreEnrollment: !!isPreEnrollment }
    });

    if (!email || !inviteCode) {
      logger.error("validation_failed", "Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email e código de convite são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedCouponCode = couponCode?.trim().toUpperCase() || undefined;
    let resolvedCouponDiscountType = couponDiscountType;
    let resolvedCouponDiscountValue = couponDiscountValue;

    // Fallback: if frontend didn't send metadata, fetch it server-side
    if (normalizedCouponCode && (!resolvedCouponDiscountType || typeof resolvedCouponDiscountValue !== "number")) {
      try {
        const { data: couponRow, error: couponErr } = await adminClient
          .from("discount_coupons")
          .select("discount_type, discount_value")
          .eq("code", normalizedCouponCode)
          .maybeSingle();

        if (couponErr) {
          logger.warn("coupon_lookup_failed", { error: couponErr.message });
        }

        if (couponRow) {
          resolvedCouponDiscountType = couponRow.discount_type === "percentage" ? "percentage" : "fixed";
          resolvedCouponDiscountValue = couponRow.discount_value;
          logger.info("coupon_resolved", { metadata: { couponCode: normalizedCouponCode, discountType: resolvedCouponDiscountType, discountValue: resolvedCouponDiscountValue } });
        }
      } catch (e) {
        logger.warn("coupon_lookup_error", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    const appUrl = "https://www.crechepimpolinhos.com.br";
    let signupUrl = `${appUrl}/auth?mode=signup&invite=${inviteCode}`;
    if (normalizedCouponCode) {
      signupUrl += `&cupom=${encodeURIComponent(normalizedCouponCode)}`;
    }
    const logoUrl = `${appUrl}/logo-email.png`;

    const greeting = parentName ? `Olá, ${parentName}!` : "Olá!";
    const contactName = parentName || email.split("@")[0]; // Use parentName for GHL contact

    // Format discount HTML
    let discountHtml = "";
    if (
      normalizedCouponCode &&
      typeof resolvedCouponDiscountValue === "number" &&
      resolvedCouponDiscountValue > 0
    ) {
      if (resolvedCouponDiscountType === "percentage") {
        discountHtml = `
          <div style="padding: 20px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 16px; text-align: center; border: 2px solid #22c55e; margin-bottom: 24px;">
            <span style="font-size: 32px; display: block; margin-bottom: 8px;">🎁</span>
            <p style="margin: 0 0 4px; color: #15803d; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              Bônus Especial para Você!
            </p>
            <p style="margin: 0 0 8px; color: #166534; font-size: 28px; font-weight: 900;">
              ${resolvedCouponDiscountValue}% OFF
            </p>
            <p style="margin: 0; color: #15803d; font-size: 14px;">
              nas mensalidades com o cupom <strong style="background: #fff; padding: 2px 8px; border-radius: 4px;">${normalizedCouponCode}</strong>
            </p>
          </div>`;
      } else {
        const formattedValue = resolvedCouponDiscountValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        discountHtml = `
          <div style="padding: 20px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 16px; text-align: center; border: 2px solid #22c55e; margin-bottom: 24px;">
            <span style="font-size: 32px; display: block; margin-bottom: 8px;">🎁</span>
            <p style="margin: 0 0 4px; color: #15803d; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              Bônus Especial para Você!
            </p>
            <p style="margin: 0 0 8px; color: #166534; font-size: 28px; font-weight: 900;">
              ${formattedValue} OFF
            </p>
            <p style="margin: 0; color: #15803d; font-size: 14px;">
              nas mensalidades com o cupom <strong style="background: #fff; padding: 2px 8px; border-radius: 4px;">${normalizedCouponCode}</strong>
            </p>
          </div>`;
      }
    }

    const subject = `🎈 ${parentName || "Você"} foi convidado(a) para a Creche Pimpolinhos!`;
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fef7ed; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.12);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); padding: 40px; text-align: center;">
        <div style="background: #ffffff; border-radius: 20px; padding: 16px 24px; display: inline-block; margin-bottom: 16px;">
          <img src="${logoUrl}" alt="Creche Pimpolinhos" width="120" style="display: block; height: auto;">
        </div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">Bem-vindo(a) à Família!</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 40px;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">${greeting} 👋</h2>
        
        <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.7;">
          Você foi convidado(a) para fazer parte da <strong style="color: #2563eb;">Creche Pimpolinhos</strong>. Estamos muito felizes em tê-lo(a) conosco!
        </p>
        
        <!-- Invite Code -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 28px; text-align: center; border: 3px dashed #f59e0b; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
            ✨ Seu Código Mágico ✨
          </p>
          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #1e293b; letter-spacing: 4px;">
            ${inviteCode}
          </p>
        </div>
        
        ${discountHtml}
        
        <!-- Benefits -->
        <p style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 700;">🌟 O que você terá acesso:</p>
        <ul style="margin: 0 0 32px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 2;">
          <li>📱 Agenda diária completa do seu filho</li>
          <li>📸 Fotos e momentos especiais em tempo real</li>
          <li>🍽️ Cardápio semanal nutritivo e balanceado</li>
          <li>💬 Chat direto com as professoras</li>
        </ul>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);">
            🎈 Criar Minha Conta
          </a>
        </div>
        
        <p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center;">
          Este convite expira em 30 dias.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Creche Pimpolinhos 💜</p>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Todos os direitos reservados</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    logger.info("email_prepared", { subject });

    // Send email via GHL - now also passing phone to update contact
    const result = await sendEmailViaGHL(
      email,
      parentName || "Usuário",
      subject,
      html,
      GHL_API_KEY,
      GHL_LOCATION_ID,
      logger,
      phone // Pass phone to update/create contact with it
    );

    // Persist to email_logs
    const { error: logError } = await adminClient.from("email_logs").insert({
      request_id: logger.requestId,
      provider: "ghl",
      template_type: "parent_invite",
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
        inviteCode, 
        childName: childName || null, 
        parentName: parentName || null,
        couponCode: normalizedCouponCode || null,
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

    // Send WhatsApp notification - prefer contactId from email result, then ghlContactId param, then phone search
    let whatsappSent = false;
    const effectiveContactId = result.contactId || ghlContactId;
    
    if (effectiveContactId || phone) {
      const discountText = normalizedCouponCode && resolvedCouponDiscountValue
        ? (resolvedCouponDiscountType === "percentage" 
            ? `🎁 Use o cupom *${normalizedCouponCode}* e ganhe *${resolvedCouponDiscountValue}% OFF*!\n\n`
            : `🎁 Use o cupom *${normalizedCouponCode}* e ganhe *R$ ${resolvedCouponDiscountValue.toFixed(2)} OFF*!\n\n`)
        : "";
      
      // Different message for pre-enrollment vs direct invite
      const statusLine = isPreEnrollment 
        ? `✅ Sua pré-matrícula foi *aprovada*! 🎉\n\n`
        : ``;
      
      const whatsappMessage = `🎈 *Olá${parentName ? `, ${parentName}` : ""}!*

Você foi convidado(a) para finalizar o cadastro na *Creche Pimpolinhos*${childName ? ` como responsável de *${childName}*` : ""}!

${statusLine}${discountText}👉 *Clique para completar seu cadastro:*
${signupUrl}

📋 Use o código *${inviteCode}* se solicitado.

💜 Creche Pimpolinhos`;

      // Priority: 1) contactId from email result, 2) ghlContactId param, 3) phone search
      let whatsappResult;
      if (effectiveContactId) {
        logger.info("whatsapp_using_email_contact", { ghlContactId: effectiveContactId });
        whatsappResult = await sendWhatsAppViaGHL(effectiveContactId, whatsappMessage, GHL_API_KEY, GHL_LOCATION_ID, logger, true);
      } else {
        whatsappResult = await sendWhatsAppViaGHL(phone!, whatsappMessage, GHL_API_KEY, GHL_LOCATION_ID, logger, false);
      }
      
      whatsappSent = whatsappResult.success;
      const finalContactId = whatsappResult.contactId || effectiveContactId;
      
      // Log WhatsApp message to whatsapp_message_logs for tracking and retry
      try {
        const messageLogData: Record<string, unknown> = {
          ghl_contact_id: finalContactId,
          ghl_message_id: whatsappResult.messageId || null,
          phone: phone || "",
          message_preview: whatsappMessage.substring(0, 200),
          template_type: "parent_invite",
          status: whatsappResult.success ? "sent" : "error",
          error_message: whatsappResult.success ? null : whatsappResult.error,
          metadata: {
            full_message: whatsappMessage,
            invite_code: inviteCode,
            parent_name: parentName,
            child_name: childName,
            coupon_code: normalizedCouponCode,
          },
        };

        // Find parent_invite_id if available
        const { data: inviteData } = await adminClient
          .from("parent_invites")
          .select("id")
          .eq("invite_code", inviteCode)
          .maybeSingle();
        
        if (inviteData?.id) {
          messageLogData.parent_invite_id = inviteData.id;
        }

        await adminClient.from("whatsapp_message_logs").insert(messageLogData);
        logger.info("whatsapp_log_saved", { metadata: { status: whatsappResult.success ? "sent" : "error" } });
      } catch (logErr) {
        logger.warn("whatsapp_log_failed", { error: logErr instanceof Error ? logErr.message : String(logErr) });
      }
      
      if (whatsappResult.success) {
        logger.info("whatsapp_invite_sent", { metadata: { phone, contactId: effectiveContactId } });
      } else {
        logger.warn("whatsapp_invite_failed", { error: whatsappResult.error });
      }

      // Move opportunity to "Aguardando Aprovação" stage in pipeline
      if (finalContactId) {
        try {
          // Search for existing opportunity or create one
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
                contactId: finalContactId,
                pipelineId: GHL_PIPELINE.id,
              }),
            }
          );

          if (oppSearchResponse.ok) {
            const oppSearchResult = await oppSearchResponse.json();
            const opportunities = oppSearchResult.opportunities || [];

            if (opportunities.length > 0) {
              // Move existing opportunity
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
                    pipelineStageId: GHL_PIPELINE.stages.AGUARDANDO_APROVACAO,
                    pipelineId: GHL_PIPELINE.id,
                  }),
                }
              );
              logger.info("opportunity_moved", { metadata: { stage: "Aguardando Aprovação", oppId } });
            } else {
              // Create new opportunity
              const createOppResponse = await fetch(
                `https://services.leadconnectorhq.com/opportunities/`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${GHL_API_KEY}`,
                    "Content-Type": "application/json",
                    Version: "2021-07-28",
                  },
                  body: JSON.stringify({
                    locationId: GHL_LOCATION_ID,
                    contactId: finalContactId,
                    pipelineId: GHL_PIPELINE.id,
                    pipelineStageId: GHL_PIPELINE.stages.AGUARDANDO_APROVACAO,
                    name: `Matrícula - ${parentName || email}`,
                    status: "open",
                  }),
                }
              );

              if (createOppResponse.ok) {
                logger.info("opportunity_created", { metadata: { stage: "Aguardando Aprovação" } });
              }
            }
          }
        } catch (oppError) {
          logger.warn("opportunity_update_failed", { error: oppError instanceof Error ? oppError.message : String(oppError) });
        }
      }
    }

    logger.info("request_completed", { 
      metadata: { totalDuration: Date.now() - logger.startTime, whatsappSent }
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
    
    // Try to log the failure
    try {
      await adminClient.from("email_logs").insert({
        request_id: logger.requestId,
        provider: "ghl",
        template_type: "parent_invite",
        status: "error",
        error_message: error.message,
        direction: "outbound",
        metadata: { duration: Date.now() - logger.startTime }
      });
    } catch (logErr) {
      logger.warn("db_error_log_failed", { error: logErr instanceof Error ? logErr.message : String(logErr) });
    }
    
    // Handle domain not verified error
    if (error.message?.includes("domain")) {
      return new Response(
        JSON.stringify({ error: "Erro de configuração do GHL. Verifique as credenciais." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
