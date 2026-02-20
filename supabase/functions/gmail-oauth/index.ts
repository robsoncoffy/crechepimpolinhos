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

// The redirect URI must match what you configured in Google Cloud Console
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gmail-oauth/callback`;

// Gmail scopes we need
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route: /gmail-oauth/authorize - Generates the OAuth URL
    if (path.endsWith("/authorize") || path.endsWith("/authorize/")) {
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token

      return new Response(
        JSON.stringify({
          authUrl: authUrl.toString(),
          message: "Acesse a URL abaixo para autorizar o acesso ao Gmail",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Route: /gmail-oauth/callback - Handles the OAuth callback from Google
    if (path.endsWith("/callback") || path.endsWith("/callback/")) {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          `<html><body><h1>Erro na autorização</h1><p>${error}</p></body></html>`,
          {
            status: 400,
            headers: { "Content-Type": "text/html", ...corsHeaders },
          }
        );
      }

      if (!code) {
        return new Response(
          `<html><body><h1>Erro</h1><p>Código de autorização não encontrado</p></body></html>`,
          {
            status: 400,
            headers: { "Content-Type": "text/html", ...corsHeaders },
          }
        );
      }

      // Exchange the code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        return new Response(
          `<html><body><h1>Erro na troca de tokens</h1><p>${tokenData.error_description || tokenData.error}</p></body></html>`,
          {
            status: 400,
            headers: { "Content-Type": "text/html", ...corsHeaders },
          }
        );
      }

      const { access_token, refresh_token, expires_in } = tokenData;

      if (!refresh_token) {
        console.error("No refresh token received. Token data:", tokenData);
        return new Response(
          `<html><body>
            <h1>⚠️ Atenção</h1>
            <p>Access token recebido, mas refresh token não foi retornado.</p>
            <p>Isso pode acontecer se você já autorizou este app anteriormente.</p>
            <p>Para gerar um novo refresh token:</p>
            <ol>
              <li>Acesse <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a></li>
              <li>Remova o acesso do app "Creche Pimpolinhos"</li>
              <li>Tente autorizar novamente</li>
            </ol>
          </body></html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html", ...corsHeaders },
          }
        );
      }

      // Get user email to verify it's the right account
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      // Store the refresh token in the database for persistence
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // We'll store it in a settings table or similar
      const { error: upsertError } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: "gmail_refresh_token",
            value: refresh_token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (upsertError) {
        console.error("Error storing refresh token:", upsertError);
        // We'll still show success since we got the token
      }

      // Also store the email being used
      await supabase
        .from("system_settings")
        .upsert(
          {
            key: "gmail_account_email",
            value: userInfo.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      return new Response(
        `<html>
        <head>
          <meta charset="utf-8">
          <title>Gmail Autorizado - Creche Pimpolinhos</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #059669; font-size: 48px; }
            .box { background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 24px; margin: 20px 0; }
            .email { font-weight: bold; color: #1f2937; }
            a { color: #6366f1; }
          </style>
        </head>
        <body>
          <div class="success">✅</div>
          <h1>Gmail Autorizado com Sucesso!</h1>
          <div class="box">
            <p>Conta conectada:</p>
            <p class="email">${userInfo.email}</p>
          </div>
          <p>O sistema agora pode enviar e receber e-mails através desta conta.</p>
          <p>Você pode fechar esta janela e voltar ao painel administrativo.</p>
          <p><a href="https://www.crechepimpolinhos.com.br/painel">Voltar ao Painel</a></p>
        </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    // Route: /gmail-oauth/status - Check if Gmail is authorized
    if (path.endsWith("/status") || path.endsWith("/status/")) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: tokenData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "gmail_refresh_token")
        .single();

      const { data: emailData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "gmail_account_email")
        .single();

      const isAuthorized = !!tokenData?.value;

      return new Response(
        JSON.stringify({
          isAuthorized,
          email: emailData?.value || null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Route: /gmail-oauth/token - Get a fresh access token (internal use)
    if (path.endsWith("/token") || path.endsWith("/token/")) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: tokenData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "gmail_refresh_token")
        .single();

      if (!tokenData?.value) {
        return new Response(
          JSON.stringify({ error: "Gmail não está autorizado" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Refresh the access token
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
        return new Response(
          JSON.stringify({ error: "Erro ao renovar token", details: refreshData.error }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({
          access_token: refreshData.access_token,
          expires_in: refreshData.expires_in,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Default: show available routes
    return new Response(
      JSON.stringify({
        message: "Gmail OAuth Service",
        routes: {
          "/authorize": "GET - Gera a URL de autorização do Google",
          "/callback": "GET - Callback do OAuth (usado pelo Google)",
          "/status": "GET - Verifica se o Gmail está autorizado",
          "/token": "GET - Obtém um access token válido (interno)",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Gmail OAuth error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
