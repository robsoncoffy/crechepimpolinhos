import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface SendEmailRequest {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

async function getAccessToken(supabase: any): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "gmail_refresh_token")
    .single();

  if (!tokenData?.value) {
    return null;
  }

  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokenData.value,
      grant_type: "refresh_token",
    }),
  });

  const refreshData = await refreshResponse.json();
  
  if (refreshData.error) {
    console.error("Token refresh error:", refreshData);
    return null;
  }

  return refreshData.access_token;
}

async function getGmailAccountEmail(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "gmail_account_email")
    .single();
  
  return data?.value || "noreply@crechepimpolinhos.com.br";
}

function encodeBase64Url(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createRawEmail(
  from: string,
  to: string,
  subject: string,
  bodyHtml: string,
  bodyText?: string,
  cc?: string,
  bcc?: string,
  inReplyTo?: string,
  references?: string
): string {
  const boundary = "boundary_" + Date.now();
  
  let email = "";
  email += `From: Creche Pimpolinhos <${from}>\r\n`;
  email += `To: ${to}\r\n`;
  if (cc) email += `Cc: ${cc}\r\n`;
  if (bcc) email += `Bcc: ${bcc}\r\n`;
  email += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\n`;
  if (inReplyTo) email += `In-Reply-To: ${inReplyTo}\r\n`;
  if (references) email += `References: ${references}\r\n`;
  email += `MIME-Version: 1.0\r\n`;
  email += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

  // Text part
  if (bodyText) {
    email += `--${boundary}\r\n`;
    email += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    email += `Content-Transfer-Encoding: base64\r\n\r\n`;
    email += btoa(unescape(encodeURIComponent(bodyText))) + "\r\n\r\n";
  }

  // HTML part
  email += `--${boundary}\r\n`;
  email += `Content-Type: text/html; charset="UTF-8"\r\n`;
  email += `Content-Transfer-Encoding: base64\r\n\r\n`;
  email += btoa(unescape(encodeURIComponent(bodyHtml))) + "\r\n\r\n";

  email += `--${boundary}--`;

  return email;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await supabase.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem enviar e-mails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SendEmailRequest = await req.json();
    const { to, cc, bcc, subject, bodyHtml, bodyText, threadId, inReplyTo, references } = body;

    if (!to || !subject || !bodyHtml) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: to, subject, bodyHtml" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
    const accessToken = await getAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Gmail não está configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the configured Gmail account
    const fromEmail = await getGmailAccountEmail(supabase);

    // Create raw email
    const rawEmail = createRawEmail(
      fromEmail,
      to,
      subject,
      bodyHtml,
      bodyText,
      cc,
      bcc,
      inReplyTo,
      references
    );

    // Encode for Gmail API
    const encodedEmail = encodeBase64Url(rawEmail);

    // Send via Gmail API
    const sendUrl = threadId
      ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
      : `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

    const sendBody: any = { raw: encodedEmail };
    if (threadId) sendBody.threadId = threadId;

    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    });

    const sendData = await sendResponse.json();

    if (sendData.error) {
      console.error("Gmail send error:", sendData.error);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar e-mail", details: sendData.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the sent email
    await supabase.from("email_logs").insert({
      gmail_id: sendData.id,
      thread_id: sendData.threadId,
      subject,
      from_address: fromEmail,
      to_address: to,
      cc,
      body_html: bodyHtml,
      body_text: bodyText,
      direction: "outbound",
      is_read: true,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendData.id,
        threadId: sendData.threadId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Gmail send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
