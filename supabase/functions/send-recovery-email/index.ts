import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryEmailRequest {
  email: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-recovery-email function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      // Don't reveal if email exists or not for security
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

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [email],
      subject: "🔐 Recuperação de Senha - Creche Pimpolinhos",
      html: `
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
      `,
    });

    console.log("Recovery email sent:", emailResponse);

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
