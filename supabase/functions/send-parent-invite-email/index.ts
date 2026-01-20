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

    const { email, inviteCode, childName, parentName } = body;

    if (!email || !inviteCode) {
      return new Response(
        JSON.stringify({ error: "Email e código de convite são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const appUrl = "https://crechepimpolinhos.lovable.app";
    const signupUrl = `${appUrl}/auth?mode=signup&invite=${inviteCode}`;
    const logoUrl = `${appUrl}/logo-email.png`;

    const greeting = parentName ? `Olá, ${parentName}!` : "Olá!";
    const childText = childName ? ` como responsável de <strong>${childName}</strong>` : "";

    const plainText = `
${greeting}

🎉 Você foi convidado(a) para fazer parte da família Creche Pimpolinhos${childName ? ` como responsável de ${childName}` : ""}!

Seu código de convite é: ${inviteCode}

Ao se cadastrar, você terá acesso a:
- 📱 Agenda diária do seu filho
- 📸 Fotos e momentos especiais
- 🍽️ Cardápio semanal nutritivo
- 💬 Comunicação direta com as professoras
- 📊 Acompanhamento do desenvolvimento

Crie sua conta acessando: ${signupUrl}

Este convite expira em 30 dias. Se você não solicitou este convite, pode ignorar este e-mail.

Com carinho,
Equipe Creche Pimpolinhos 💚

© ${new Date().getFullYear()} Creche Pimpolinhos - Todos os direitos reservados
    `.trim();

    console.log("Sending invite email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [email],
      subject: `🎈 ${parentName || "Você"} foi convidado(a) para a Creche Pimpolinhos!`,
      text: plainText,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Convite Especial - Creche Pimpolinhos</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #fef7ed; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; color: transparent;">
    🎉 Seu convite para acompanhar a jornada do seu filho na Creche Pimpolinhos está aqui!
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #fef7ed 0%, #fef3c7 50%, #dcfce7 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">
          
          <!-- Decorative Top Banner -->
          <tr>
            <td style="text-align: center; padding-bottom: 20px;">
              <span style="font-size: 40px;">🎈✨🌈✨🎈</span>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.12);">
                
                <!-- Colorful Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); padding: 40px 40px 50px; text-align: center; position: relative;">
                    <!-- Logo -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="background: #ffffff; border-radius: 20px; padding: 16px 24px; display: inline-block; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                            <img src="${logoUrl}" alt="Creche Pimpolinhos" width="120" style="display: block; height: auto; border: 0;">
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <h1 style="margin: 24px 0 0; color: #ffffff; font-size: 28px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Bem-vindo(a) à Família!
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                      Uma jornada de aprendizado e amor começa aqui
                    </p>
                  </td>
                </tr>
                
                <!-- Curved Separator -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); height: 30px;">
                    <div style="background: #ffffff; height: 30px; border-radius: 30px 30px 0 0;"></div>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 10px 40px 40px;">
                    
                    <!-- Greeting -->
                    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px; font-weight: 700;">
                      ${greeting} 👋
                    </h2>
                    
                    <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.7;">
                      Você foi convidado(a) para fazer parte da <strong style="color: #2563eb;">Creche Pimpolinhos</strong>${childText}. Estamos muito felizes em tê-lo(a) conosco!
                    </p>
                    
                    <!-- Invite Code Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 28px; text-align: center; border: 3px dashed #f59e0b;">
                          <p style="margin: 0 0 8px; color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                            ✨ Seu Código Mágico ✨
                          </p>
                          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #1e293b; letter-spacing: 4px; text-shadow: 2px 2px 0 #fde68a;">
                            ${inviteCode}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Benefits Section -->
                    <p style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 700;">
                      🌟 O que você terá acesso:
                    </p>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px;">
                      <tr>
                        <td style="padding: 14px 16px; background: #f0f9ff; border-radius: 12px; margin-bottom: 8px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 24px;">📱</span>
                              </td>
                              <td style="color: #0369a1; font-size: 15px; font-weight: 600;">
                                Agenda diária completa do seu filho
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height: 8px;"></td></tr>
                      <tr>
                        <td style="padding: 14px 16px; background: #fdf4ff; border-radius: 12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 24px;">📸</span>
                              </td>
                              <td style="color: #a21caf; font-size: 15px; font-weight: 600;">
                                Fotos e momentos especiais em tempo real
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height: 8px;"></td></tr>
                      <tr>
                        <td style="padding: 14px 16px; background: #f0fdf4; border-radius: 12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 24px;">🍽️</span>
                              </td>
                              <td style="color: #15803d; font-size: 15px; font-weight: 600;">
                                Cardápio semanal nutritivo e balanceado
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height: 8px;"></td></tr>
                      <tr>
                        <td style="padding: 14px 16px; background: #fef2f2; border-radius: 12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 24px;">💬</span>
                              </td>
                              <td style="color: #dc2626; font-size: 15px; font-weight: 600;">
                                Chat direto com as professoras
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 18px; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                            🚀 Criar Minha Conta
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <p style="margin: 24px 0 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
                      Se o botão não funcionar, copie e cole este link:<br>
                      <a href="${signupUrl}" style="color: #2563eb; word-break: break-all;">${signupUrl}</a>
                    </p>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px 40px; border-top: 2px solid #e2e8f0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                            ⏰ Este convite expira em <strong>30 dias</strong>
                          </p>
                          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 12px;">
                            Se você não solicitou este convite, pode ignorar este e-mail.
                          </p>
                          <p style="margin: 0; font-size: 20px;">
                            💚💛❤️💙
                          </p>
                          <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">
                            © ${new Date().getFullYear()} Creche Pimpolinhos • Onde cada criança brilha!
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Bottom Decorations -->
          <tr>
            <td style="text-align: center; padding-top: 24px;">
              <span style="font-size: 32px;">🧸🎨🌻🦋🌈</span>
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

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);

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
