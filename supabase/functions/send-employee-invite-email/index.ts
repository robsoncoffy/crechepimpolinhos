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

serve(async (req: Request): Promise<Response> => {
  console.log("send-employee-invite-email function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Sem permissão de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: InviteEmailRequest = await req.json();
    console.log("Request body:", body);

    const { email, inviteCode, role, employeeName } = body;

    // Validate inputs
    if (!email || !inviteCode) {
      return new Response(
        JSON.stringify({ error: "Email e código de convite são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always use the production URL
    const appUrl = "https://crechepimpolinhos.lovable.app";
    const signupUrl = `${appUrl}/cadastro-funcionario?code=${inviteCode}`;
    const roleLabel = roleLabels[role] || role;

    console.log("Sending employee invite email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [email],
      subject: `🎓 Convite para Trabalhar na Creche Pimpolinhos - ${roleLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎓 Creche Pimpolinhos</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Convite para Funcionário</p>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá${employeeName ? `, ${employeeName}` : ""}! 👋</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Você foi convidado(a) para fazer parte da equipe da <strong>Creche Pimpolinhos</strong> como <strong>${roleLabel}</strong>.
              </p>
              
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="color: #166534; margin: 0 0 10px; font-size: 16px;">🔑 Seu Código de Convite</h3>
                <p style="font-family: monospace; font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; letter-spacing: 2px;">
                  ${inviteCode}
                </p>
              </div>

              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Complete seu cadastro para acessar o sistema e começar a trabalhar conosco:
              </p>
              <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
                <li>📋 Preencha seus dados pessoais e documentos</li>
                <li>🏦 Informe seus dados bancários para pagamento</li>
                <li>📅 Acesse a agenda e registros diários</li>
                <li>💬 Comunique-se com a equipe</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Completar Meu Cadastro
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; text-align: center;">
                Este convite expira em 7 dias. Se você não solicitou este convite, pode ignorar este e-mail.
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
      `,
    });

    console.log("Employee invite email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de convite enviado com sucesso" 
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
