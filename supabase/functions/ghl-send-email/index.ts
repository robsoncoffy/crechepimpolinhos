import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string; // email address
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  templateType?: 
    | "parent_invite"
    | "employee_invite"
    | "welcome"
    | "approval"
    | "recovery"
    | "guardian_invite"
    | "generic";
  metadata?: Record<string, string>;
}

interface GHLContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// Find or create contact in GHL
async function findOrCreateContact(
  email: string,
  name: string,
  apiKey: string,
  locationId: string
): Promise<GHLContact> {
  // First, try to find existing contact by email
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

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.contact?.id) {
      console.log("Found existing GHL contact:", searchResult.contact.id);
      return {
        id: searchResult.contact.id,
        email: searchResult.contact.email,
        firstName: searchResult.contact.firstName,
        lastName: searchResult.contact.lastName,
      };
    }
  }

  // Contact not found, create new one
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
        tags: ["sistema", "transacional"],
      }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error("Failed to create GHL contact:", errorText);
    throw new Error(`Failed to create contact in GHL: ${createResponse.status}`);
  }

  const createResult = await createResponse.json();
  console.log("Created new GHL contact:", createResult.contact?.id);

  return {
    id: createResult.contact.id,
    email: createResult.contact.email,
    firstName: createResult.contact.firstName,
    lastName: createResult.contact.lastName,
  };
}

// Send email via GHL Conversations API
async function sendEmailViaGHL(
  contactId: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const response = await fetch(
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
        emailTo: [toEmail],
        subject,
        html: htmlContent,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("GHL email send failed:", result);
    return {
      success: false,
      error: result.message || `GHL API error: ${response.status}`,
    };
  }

  console.log("Email sent via GHL:", result);
  return {
    success: true,
    messageId: result.messageId || result.id,
  };
}

// Email template wrappers
function wrapEmailTemplate(content: string, subject: string): string {
  const logoUrl = "https://www.crechepimpolinhos.com.br/logo-email.png";
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <img src="${logoUrl}" alt="Creche Pimpolinhos" style="max-width: 180px; height: auto;" />
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Creche Pimpolinhos - Cuidando com amor 💜
      </p>
      <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">
        <a href="https://www.crechepimpolinhos.com.br" style="color: #6366f1; text-decoration: none;">www.crechepimpolinhos.com.br</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    const body: SendEmailRequest = await req.json();
    const { to, toName, subject, html, templateType, metadata } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create contact in GHL
    const recipientName = toName || metadata?.name || "Usuário";
    const contact = await findOrCreateContact(to, recipientName, GHL_API_KEY, GHL_LOCATION_ID);

    // Wrap HTML in template
    const wrappedHtml = wrapEmailTemplate(html, subject);

    // Send email via GHL
    const sendResult = await sendEmailViaGHL(
      contact.id,
      to,
      subject,
      wrappedHtml,
      GHL_API_KEY
    );

    if (!sendResult.success) {
      throw new Error(sendResult.error || "Failed to send email via GHL");
    }

    // Log the email send for tracking (optional - could save to Supabase)
    console.log(`Email sent successfully via GHL:`, {
      to,
      subject,
      templateType,
      contactId: contact.id,
      messageId: sendResult.messageId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado com sucesso via GHL",
        ghlContactId: contact.id,
        messageId: sendResult.messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ghl-send-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
