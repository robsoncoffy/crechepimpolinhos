import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteCode: string;
  childName?: string;
  parentName?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-parent-invite-email function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create backend client with user auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
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

    // Check if user is admin
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

    const { email, inviteCode, childName, parentName } = body;

    // Validate inputs
    if (!email || !inviteCode) {
      return new Response(
        JSON.stringify({ error: "Email e código de convite são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Always use the production URL for invite links
    const appUrl = "https://crechepimpolinhos.lovable.app";
    const signupUrl = `${appUrl}/auth?mode=signup&invite=${inviteCode}`;
    const logoUrl = `${appUrl}/logo-email.png`;

    const preheader = `Seu convite para a Creche Pimpolinhos — código ${inviteCode}`;

    console.log("Sending invite email to:", email);

    const plainText = `Olá${parentName ? `, ${parentName}` : ""}!

Você recebeu um convite para se cadastrar no sistema da Creche Pimpolinhos${childName ? ` como responsável de ${childName}` : ""}.

Código do convite: ${inviteCode}
Link para criar sua conta: ${signupUrl}

Este convite expira em 30 dias. Se você não solicitou este convite, pode ignorar este e-mail.`;

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [email],
      subject: `Convite para a Creche Pimpolinhos${childName ? ` - ${childName}` : ""}`,
      text: plainText,
      html: `
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Convite • Creche Pimpolinhos</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f6f7fb;">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08);">
            <tr>
              <td style="padding:22px 28px 0;">
                <img src="${logoUrl}" width="170" alt="Creche Pimpolinhos" style="display:block;border:0;outline:none;text-decoration:none;height:auto;" />
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px 0;">
                <h1 style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;line-height:1.25;color:#0f172a;">
                  Você foi convidado para acessar o sistema
                </h1>
                <p style="margin:10px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
                  Olá${parentName ? `, <strong>${parentName}</strong>` : ""}! Você recebeu um convite para se cadastrar na <strong>Creche Pimpolinhos</strong>${childName ? ` como responsável de <strong>${childName}</strong>` : ""}.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f1f5ff;border:1px solid #dbeafe;border-radius:14px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;letter-spacing:.12em;color:#1e40af;font-weight:700;">
                        CÓDIGO DO CONVITE
                      </div>
                      <div style="margin-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:28px;letter-spacing:3px;font-weight:800;color:#0f172a;">
                        ${inviteCode}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:22px 28px 0;">
                <a href="${signupUrl}" style="display:inline-block;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:14px 18px;border-radius:12px;font-weight:800;font-size:15px;">
                  Criar minha conta
                </a>

                <div style="margin-top:14px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#64748b;">
                  Se o botão não funcionar, copie e cole este link no navegador:
                  <br />
                  <a href="${signupUrl}" style="color:#1d4ed8;word-break:break-all;">${signupUrl}</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 28px 26px;">
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />

                <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.7;color:#64748b;">
                  Este convite expira em 30 dias. Se você não solicitou este convite, pode ignorar este e-mail.
                </p>

                <p style="margin:10px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.7;color:#64748b;">
                  © ${new Date().getFullYear()} Creche Pimpolinhos • Enviado para ${email}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    });

    console.log("Invite email sent:", emailResponse);

    // Check if there was an error from Resend
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);

      // Check for domain validation error
      if (emailResponse.error.message?.includes("verify a domain")) {
        return new Response(
          JSON.stringify({
            error:
              "Domínio de e-mail não verificado. Para enviar e-mails reais, é necessário verificar um domínio no provedor. Por enquanto, use o botão 'Copiar Link' para compartilhar o convite manualmente.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Erro ao enviar e-mail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id ?? null,
        message: "E-mail de convite enviado com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in send-parent-invite-email:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
