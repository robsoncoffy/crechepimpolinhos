import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteCode: string;
  childName?: string;
  parentName?: string;
  couponCode?: string;
  couponDiscountType?: "percentage" | "fixed";
  couponDiscountValue?: number;
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

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.contact?.id) {
      contactId = searchResult.contact.id;
      console.log("Found existing GHL contact:", contactId);
    } else {
      // Create new contact
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
            source: "Sistema Pimpolinhos",
            tags: ["convite-pais", "transacional"],
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Failed to create GHL contact:", errorText);
        return { success: false, error: `Failed to create contact: ${createResponse.status}` };
      }

      const createResult = await createResponse.json();
      contactId = createResult.contact.id;
      console.log("Created new GHL contact:", contactId);
    }
  } else {
    return { success: false, error: `Failed to search contact: ${searchResponse.status}` };
  }

  // Send email via GHL Conversations API
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
    console.error("GHL email send failed:", errorText);
    return { success: false, error: `Failed to send email: ${emailResponse.status}` };
  }

  console.log("Email sent via GHL successfully");
  return { success: true };
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-parent-invite-email function called (GHL)");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
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
      console.error("User is not admin");
      return new Response(JSON.stringify({ error: "Sem permissão de administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: InviteEmailRequest = await req.json();
    console.log("Request body:", body);

    const { email, inviteCode, childName, parentName, couponCode, couponDiscountType, couponDiscountValue } = body;

    if (!email || !inviteCode) {
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
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        const { data: couponRow, error: couponErr } = await adminClient
          .from("discount_coupons")
          .select("discount_type, discount_value")
          .eq("code", normalizedCouponCode)
          .maybeSingle();

        if (couponErr) {
          console.error("Error fetching coupon details:", couponErr);
        }

        if (couponRow) {
          resolvedCouponDiscountType = couponRow.discount_type === "percentage" ? "percentage" : "fixed";
          resolvedCouponDiscountValue = couponRow.discount_value;
        }
      } catch (e) {
        console.error("Error resolving coupon details:", e);
      }
    }

    const appUrl = "https://www.crechepimpolinhos.com.br";
    let signupUrl = `${appUrl}/auth?mode=signup&invite=${inviteCode}`;
    if (normalizedCouponCode) {
      signupUrl += `&cupom=${encodeURIComponent(normalizedCouponCode)}`;
    }
    const logoUrl = `${appUrl}/logo-email.png`;

    const greeting = parentName ? `Olá, ${parentName}!` : "Olá!";
    const childText = childName ? ` como responsável de <strong>${childName}</strong>` : "";

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
          Você foi convidado(a) para fazer parte da <strong style="color: #2563eb;">Creche Pimpolinhos</strong>${childText}. Estamos muito felizes em tê-lo(a) conosco!
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

    console.log("Sending invite email to:", email);

    const result = await sendEmailViaGHL(
      email,
      parentName || "Usuário",
      subject,
      html,
      GHL_API_KEY,
      GHL_LOCATION_ID
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to send email via GHL");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de convite enviado com sucesso via GHL"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-parent-invite-email:", error);
    
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
