import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  parentId: string;
  parentName: string;
  approvalType: "parent" | "child";
  childName?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-approval-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
      return new Response(
        JSON.stringify({ error: "Sem permissão de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ApprovalEmailRequest = await req.json();
    console.log("Request body:", body);

    const { parentId, parentName, approvalType, childName } = body;

    if (!parentId || !parentName || !approvalType) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get parent email
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: userData, error: userDataError } = await adminClient.auth.admin.getUserById(parentId);
    
    if (userDataError || !userData?.user?.email) {
      console.error("Error fetching parent email:", userDataError);
      return new Response(
        JSON.stringify({ error: "Não foi possível obter o email do responsável" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parentEmail = userData.user.email;
    const appUrl = req.headers.get("origin") || "https://www.crechepimpolinhos.com.br";

    let subject: string;
    let bodyHtml: string;

    if (approvalType === "parent") {
      subject = "✅ Seu cadastro foi aprovado na Creche Pimpolinhos!";
      bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎈 Creche Pimpolinhos</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Cadastro Aprovado!</p>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${parentName}! 👋</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Temos o prazer de informar que <strong style="color: #22c55e;">seu cadastro foi aprovado</strong> na Creche Pimpolinhos!
              </p>
              
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; margin: 0 0 10px; font-size: 16px;">✅ Próximos passos</h3>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
                  Agora você pode acessar o sistema e cadastrar seu(s) filho(s) para matrícula. Assim que o cadastro da criança for aprovado, você receberá outro e-mail de confirmação.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/painel-pais" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Acessar Meu Painel
                </a>
              </div>
              
              <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                Em caso de dúvidas, entre em contato pelo telefone <strong>(51) 99999-9999</strong>.
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
    } else {
      subject = `🎉 ${childName} foi aprovado(a) na Creche Pimpolinhos!`;
      bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎈 Creche Pimpolinhos</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Matrícula Aprovada!</p>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${parentName}! 🎉</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Temos o prazer de informar que o cadastro de <strong>${childName}</strong> foi <strong style="color: #22c55e;">aprovado</strong> na Creche Pimpolinhos!
              </p>
              
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="color: #166534; margin: 0 0 10px; font-size: 16px;">📋 O que acontece agora?</h3>
                <ul style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Você receberá o contrato de matrícula por e-mail para assinatura digital</li>
                  <li>Após assinatura, a matrícula estará confirmada</li>
                  <li>Você já pode acompanhar tudo pelo painel de responsáveis</li>
                </ul>
              </div>

              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                No painel você poderá:
              </p>
              <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
                <li>📅 Acompanhar a agenda diária</li>
                <li>📊 Visualizar o crescimento e desenvolvimento</li>
                <li>💬 Comunicar-se diretamente com a escola</li>
                <li>📷 Receber fotos e atualizações</li>
                <li>🍽️ Ver o cardápio semanal</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/painel-pais" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Acessar Painel do Responsável
                </a>
              </div>
              
              <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                Em caso de dúvidas, entre em contato pelo telefone <strong>(51) 99999-9999</strong>.
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
    }

    console.log("Sending approval email to:", parentEmail, "Type:", approvalType);

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [parentEmail],
      subject,
      html: bodyHtml,
    });

    console.log("Approval email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de aprovação enviado com sucesso" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-approval-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
