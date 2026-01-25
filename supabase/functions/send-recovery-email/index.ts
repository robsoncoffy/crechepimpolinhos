import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryEmailRequest {
  email: string;
}

// Send email via GHL
async function sendEmailViaGHL(
  email: string,
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
      // Create new contact for recovery
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
        emailTo: [email],
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
  console.log("send-recovery-email function called (GHL)");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    const body: RecoveryEmailRequest = await req.json();
    const { email } = body;
    console.log("Recovery request for email:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Generate password reset link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: "https://www.crechepimpolinhos.com.br/redefinir-senha",
      },
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData?.properties?.action_link) {
      console.error("No action link generated");
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recoveryLink = linkData.properties.action_link;
    console.log("Recovery link generated successfully");

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
      <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Creche Pimpolinhos</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Recuperação de Senha</p>
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

    const result = await sendEmailViaGHL(
      email,
      subject,
      html,
      GHL_API_KEY,
      GHL_LOCATION_ID
    );

    if (!result.success) {
      console.error("Failed to send via GHL:", result.error);
      // Still return success to not reveal if email exists
    }

    console.log("Recovery email process completed");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de recuperação enviado com sucesso" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-recovery-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
