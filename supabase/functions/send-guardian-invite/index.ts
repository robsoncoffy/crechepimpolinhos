import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  childRegistrationId: string;
  invitedEmail: string;
  invitedName: string;
  relationship: string;
  childName: string;
  inviterName: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-guardian-invite function called");

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

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: InviteRequest = await req.json();
    console.log("Request body:", body);

    const { childRegistrationId, invitedEmail, invitedName, relationship, childName, inviterName } = body;

    // Validate inputs
    if (!childRegistrationId || !invitedEmail || !invitedName || !childName) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user owns the child registration
    const { data: registration, error: regError } = await supabase
      .from("child_registrations")
      .select("id, parent_id")
      .eq("id", childRegistrationId)
      .single();

    if (regError || !registration) {
      console.error("Registration not found:", regError);
      return new Response(
        JSON.stringify({ error: "Cadastro não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (registration.parent_id !== user.id) {
      console.error("User does not own this registration");
      return new Response(
        JSON.stringify({ error: "Sem permissão para este cadastro" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("guardian_invitations")
      .select("id")
      .eq("child_registration_id", childRegistrationId)
      .eq("invited_email", invitedEmail.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("guardian_invitations")
      .insert({
        child_registration_id: childRegistrationId,
        invited_by: user.id,
        invited_email: invitedEmail.toLowerCase(),
        invited_name: invitedName,
        relationship: relationship || "Responsável",
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invitation created:", invitation.id);

    // Send email
    const inviteUrl = `${req.headers.get("origin") || "https://crechepimpolinhos.lovable.app"}/aceitar-convite?token=${invitation.token}`;

    const emailResponse = await resend.emails.send({
      from: "Creche Pimpolinhos <onboarding@resend.dev>",
      to: [invitedEmail],
      subject: `${inviterName} te convidou para ser responsável por ${childName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎈 Creche Pimpolinhos</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá, ${invitedName}! 👋</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> te convidou para ser ${relationship || "responsável"} de <strong>${childName}</strong> na Creche Pimpolinhos.
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Ao aceitar este convite, você terá acesso ao painel do responsável onde poderá:
              </p>
              <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
                <li>📅 Acompanhar a agenda diária</li>
                <li>📊 Ver o crescimento e desenvolvimento</li>
                <li>💬 Comunicar-se com a escola</li>
                <li>📷 Receber fotos e atualizações</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Aceitar Convite
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Este convite expira em 7 dias. Se você não solicitou este convite, ignore este email.
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

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso",
        invitationId: invitation.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-guardian-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
