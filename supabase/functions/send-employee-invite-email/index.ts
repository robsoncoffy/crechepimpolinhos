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

serve(async (req: Request): Promise<Response> => {
  console.log("send-employee-invite-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User error:", userError);
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
      console.error("User is not admin");
      return new Response(
        JSON.stringify({ error: "Sem permissão de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: InviteEmailRequest = await req.json();
    console.log("Request body:", body);

    const { email, inviteCode, role, employeeName } = body;

    if (!email || !inviteCode) {
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

    const plainText = `
${greeting}

Você foi convidado(a) para fazer parte da equipe da Creche Pimpolinhos como ${roleLabel}.

Seu código de convite é: ${inviteCode}

Complete seu cadastro acessando: ${signupUrl}

Ao fazer seu cadastro, você terá acesso a:
- Sistema de ponto digital
- Agenda das turmas
- Comunicação com a equipe
- Registro de atividades

Este convite expira em 7 dias.

Atenciosamente,
Equipe Creche Pimpolinhos

© ${new Date().getFullYear()} Creche Pimpolinhos - Todos os direitos reservados
    `.trim();

    console.log("Sending employee invite email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [email],
      subject: `${roleEmoji} Convite para Trabalhar na Creche Pimpolinhos`,
      text: plainText,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Convite para Funcionário - Creche Pimpolinhos</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 40px; text-align: center;">
              <img src="${logoUrl}" alt="Creche Pimpolinhos" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 12px; background: white; padding: 8px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Creche Pimpolinhos</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Convite para Nossa Equipe</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600;">${greeting} 👋</h2>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Temos o prazer de convidá-lo(a) para fazer parte da nossa equipe como <strong style="color: #16a34a;">${roleLabel}</strong>.
              </p>
              
              <!-- Invite Code Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; text-align: center; border: 2px solid #bbf7d0;">
                    <p style="margin: 0 0 8px; color: #166534; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      🔑 Seu Código de Convite
                    </p>
                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #16a34a; letter-spacing: 3px;">
                      ${inviteCode}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Complete seu cadastro para acessar o sistema e começar a trabalhar conosco:
              </p>
              
              <!-- Benefits List -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; width: 32px; text-align: center; font-size: 18px;">⏰</span>
                    <span style="color: #475569; font-size: 15px;">Sistema de ponto digital</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; width: 32px; text-align: center; font-size: 18px;">📅</span>
                    <span style="color: #475569; font-size: 15px;">Agenda e atividades das turmas</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; width: 32px; text-align: center; font-size: 18px;">💬</span>
                    <span style="color: #475569; font-size: 15px;">Chat interno com a equipe</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="display: inline-block; width: 32px; text-align: center; font-size: 18px;">📝</span>
                    <span style="color: #475569; font-size: 15px;">Registro de atividades diárias</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
                      Completar Meu Cadastro
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">
                Ou copie e cole este link no navegador:<br>
                <a href="${signupUrl}" style="color: #16a34a; word-break: break-all;">${signupUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-align: center;">
                ⏳ Este convite expira em <strong>7 dias</strong>
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Creche Pimpolinhos - Todos os direitos reservados
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

    console.log("Employee invite email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de convite enviado com sucesso",
        emailId: emailResponse.data?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-employee-invite-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
