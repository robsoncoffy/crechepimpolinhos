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

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

function extractEmailBody(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";

  function parsePayload(part: any) {
    if (part.mimeType === "text/html" && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/plain" && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      for (const p of part.parts) {
        parsePayload(p);
      }
    }
  }

  if (payload.body?.data) {
    if (payload.mimeType === "text/html") {
      html = decodeBase64Url(payload.body.data);
    } else {
      text = decodeBase64Url(payload.body.data);
    }
  } else if (payload.parts) {
    for (const part of payload.parts) {
      parsePayload(part);
    }
  }

  return { html, text };
}

function getHeader(headers: any[], name: string): string {
  const header = headers?.find(
    (h: any) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || "";
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

    // Check if user is staff
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });

    if (!isStaff) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const maxResults = parseInt(url.searchParams.get("maxResults") || "20");
    const pageToken = url.searchParams.get("pageToken") || "";
    const query = url.searchParams.get("q") || "";
    const labelIds = url.searchParams.get("labelIds") || "INBOX";

    // Get access token
    const accessToken = await getAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Gmail não está configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch messages list from Gmail
    const listParams = new URLSearchParams({
      maxResults: maxResults.toString(),
      labelIds: labelIds,
    });
    if (pageToken) listParams.set("pageToken", pageToken);
    if (query) listParams.set("q", query);

    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const listData = await listResponse.json();

    if (listData.error) {
      console.error("Gmail API error:", listData.error);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar e-mails", details: listData.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full message details for each message
    const messages = [];
    for (const msg of listData.messages || []) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const msgData = await msgResponse.json();

      if (msgData.error) {
        console.error("Error fetching message:", msgData.error);
        continue;
      }

      const headers = msgData.payload?.headers || [];
      const { html, text } = extractEmailBody(msgData.payload);

      messages.push({
        id: msgData.id,
        threadId: msgData.threadId,
        snippet: msgData.snippet,
        labelIds: msgData.labelIds || [],
        subject: getHeader(headers, "Subject"),
        from: getHeader(headers, "From"),
        to: getHeader(headers, "To"),
        cc: getHeader(headers, "Cc"),
        date: getHeader(headers, "Date"),
        internalDate: msgData.internalDate,
        isRead: !msgData.labelIds?.includes("UNREAD"),
        isStarred: msgData.labelIds?.includes("STARRED"),
        bodyHtml: html,
        bodyText: text,
      });
    }

    return new Response(
      JSON.stringify({
        messages,
        nextPageToken: listData.nextPageToken || null,
        resultSizeEstimate: listData.resultSizeEstimate || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Gmail inbox error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
