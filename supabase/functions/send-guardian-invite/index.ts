import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

// Send email via GHL
async function sendEmailViaGHL(
  email: string,
  name: string,
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
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "Responsável";
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
            tags: ["convite-responsavel", "segundo-responsavel"],
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
  console.log("send-guardian-invite function called (GHL)");

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

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: InviteRequest = await req.json();
    const { childRegistrationId, invitedEmail, invitedName, relationship, childName, inviterName } = body;

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
      return new Response(
        JSON.stringify({ error: "Cadastro não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (registration.parent_id !== user.id) {
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
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteUrl = `https://www.crechepimpolinhos.com.br/aceitar-convite?token=${invitation.token}`;

    const subject = `${inviterName} te convidou para ser responsável por ${childName}`;
    const html = `
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
    `;

    console.log("Sending guardian invite email to:", invitedEmail);

    const result = await sendEmailViaGHL(
      invitedEmail,
      invitedName,
      subject,
      html,
      GHL_API_KEY,
      GHL_LOCATION_ID
    );

    if (!result.success) {
      console.error("Failed to send via GHL:", result.error);
      // Don't fail the whole request - invitation was created
    }

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
