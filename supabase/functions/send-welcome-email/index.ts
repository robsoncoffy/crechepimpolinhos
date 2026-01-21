import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  parentId: string;
  parentName: string;
  childName: string;
  classType: "bercario" | "maternal" | "jardim";
  shiftType: "manha" | "tarde" | "integral";
}

const classLabels: Record<string, string> = {
  bercario: "Berçário (0-1 ano)",
  maternal: "Maternal (1-3 anos)",
  jardim: "Jardim (4-6 anos)",
};

const shiftLabels: Record<string, string> = {
  manha: "Manhã (7h às 11h)",
  tarde: "Tarde (15h às 19h)",
  integral: "Integral",
};

serve(async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");

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

    const body: WelcomeEmailRequest = await req.json();
    console.log("Request body:", body);

    const { parentId, parentName, childName, classType, shiftType } = body;

    // Validate inputs
    if (!parentId || !parentName || !childName || !classType || !shiftType) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to get parent email from auth.users
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
    console.log("Sending welcome email to:", parentEmail);

    const classLabel = classLabels[classType] || classType;
    const shiftLabel = shiftLabels[shiftType] || shiftType;
    const appUrl = req.headers.get("origin") || "https://www.crechepimpolinhos.com.br";

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <noreply@crechepimpolinhos.com.br>",
      to: [parentEmail],
      subject: `🎉 ${childName} foi aprovado(a) na Creche Pimpolinhos!`,
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
              <h1 style="color: white; margin: 0; font-size: 24px;">🎈 Creche Pimpolinhos</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Bem-vindo à nossa família!</p>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${parentName}! 🎉</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Temos o prazer de informar que o cadastro de <strong>${childName}</strong> foi <strong style="color: #22c55e;">aprovado</strong> na Creche Pimpolinhos!
              </p>
              
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="color: #166534; margin: 0 0 15px; font-size: 16px;">📋 Informações da Matrícula</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Criança:</strong></td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${childName}</td>
                  </tr>
                  <tr>
                    <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Turma:</strong></td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${classLabel}</td>
                  </tr>
                  <tr>
                    <td style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Turno:</strong></td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px;">${shiftLabel}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Agora você já pode acessar o painel de responsáveis para:
              </p>
              <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
                <li>📅 Acompanhar a agenda diária</li>
                <li>📊 Visualizar o crescimento e desenvolvimento</li>
                <li>💬 Comunicar-se diretamente com a escola</li>
                <li>📷 Receber fotos e atualizações</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/responsavel" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Acessar Painel do Responsável
                </a>
              </div>
              
              <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                Em caso de dúvidas, entre em contato conosco pelo telefone <strong>(51) 99999-9999</strong> ou responda este e-mail.
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

    console.log("Welcome email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de boas-vindas enviado com sucesso" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
