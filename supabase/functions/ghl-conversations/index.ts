import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache for conversations (5 minute TTL)
const conversationsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Timeout wrapper for fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL_API_KEY or GHL_LOCATION_ID not configured");
    }

    // Parse request body for action and params
    let action = "list";
    let conversationId = "";
    let contactId = "";
    let limit = "20";
    let messageContent = "";
    let messageType = "SMS";
    let pipelineId = "";
    let opportunityId = "";
    let stageId = "";
    let skipCache = false;

    if (req.method === "POST") {
      const body = await req.json();
      action = body.action || "list";
      conversationId = body.conversationId || "";
      contactId = body.contactId || "";
      limit = body.limit || "20";
      messageContent = body.message || "";
      messageType = body.type || "SMS";
      pipelineId = body.pipelineId || "";
      opportunityId = body.opportunityId || "";
      stageId = body.stageId || "";
      skipCache = body.skipCache || false;
    }

    const baseUrl = "https://services.leadconnectorhq.com";
    const headers = {
      "Authorization": `Bearer ${GHL_API_KEY}`,
      "Version": "2021-07-28",
      "Content-Type": "application/json",
    };

    // List conversations
    if (action === "list") {
      const searchParams = new URLSearchParams({
        locationId: GHL_LOCATION_ID,
        limit: limit,
        sort: "desc",
        sortBy: "last_message_date",
      });

      const response = await fetchWithTimeout(
        `${baseUrl}/conversations/search?${searchParams.toString()}`,
        { method: "GET", headers },
        10000 // 10s timeout for list
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL API Error:", response.status, errorText);
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Format conversations for frontend
      const conversations = (data.conversations || []).map((conv: any) => ({
        id: conv.id,
        contactId: conv.contactId,
        contactName: conv.fullName || conv.contactName || conv.email || conv.phone || "Contato",
        email: conv.email,
        phone: conv.phone,
        lastMessage: conv.lastMessageBody || "",
        lastMessageDate: conv.lastMessageDate,
        type: conv.type || "SMS",
        unreadCount: conv.unreadCount || 0,
      }));

      return new Response(
        JSON.stringify({ conversations, total: data.total || conversations.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get messages for a specific conversation
    if (action === "messages" && conversationId) {
      // Fetch messages and conversation details in PARALLEL
      const [messagesResponse, convResponse] = await Promise.all([
        fetchWithTimeout(
          `${baseUrl}/conversations/${conversationId}/messages?limit=${limit}`,
          { method: "GET", headers },
          8000
        ),
        fetchWithTimeout(
          `${baseUrl}/conversations/${conversationId}`,
          { method: "GET", headers },
          8000
        ),
      ]);

      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        console.error("GHL API Error:", messagesResponse.status, errorText);
        throw new Error(`GHL API error: ${messagesResponse.status}`);
      }

      const data = await messagesResponse.json();
      
      // GHL API returns: { messages: { lastMessageId, nextPage, messages: [...] }, traceId }
      let rawMessages: any[] = [];
      
      if (data?.messages?.messages && Array.isArray(data.messages.messages)) {
        // Primary format: nested messages object
        rawMessages = data.messages.messages;
      } else if (Array.isArray(data?.messages)) {
        // Fallback: direct messages array
        rawMessages = data.messages;
      } else if (Array.isArray(data)) {
        // Fallback: direct array response
        rawMessages = data;
      }
      
      // Format messages for frontend
      const messages = (rawMessages || []).map((msg: any) => ({
        id: msg.id,
        body: msg.body || "",
        dateAdded: msg.dateAdded,
        direction: msg.direction, // "inbound" or "outbound"
        type: msg.type, // "SMS", "WhatsApp", "Email", etc.
        status: msg.status,
        contentType: msg.contentType,
      }));

      // Get contact info from parallel request
      let contactInfo = null;
      if (convResponse.ok) {
        const convData = await convResponse.json();
        contactInfo = {
          name: convData.fullName || convData.contactName || "Contato",
          email: convData.email,
          phone: convData.phone,
        };
      }

      return new Response(
        JSON.stringify({ 
          messages: messages.reverse(), // Oldest first
          contact: contactInfo,
          total: data.total || messages.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send a message in a conversation
    if (action === "send" && conversationId && contactId) {
      if (!messageContent) {
        throw new Error("Message content is required");
      }

      // Normalize type to valid GHL API enum values
      const validTypes: Record<string, string> = {
        whatsapp: "WhatsApp",
        sms: "SMS",
        email: "Email",
        gmb: "GMB",
        fb: "FB",
        ig: "IG",
        live_chat: "LiveChat",
        livechat: "LiveChat",
      };
      const normalizedType = validTypes[messageType.toLowerCase()] || "SMS";

      // GHL API validation for SMS/WhatsApp commonly expects `message` (and/or attachments).
      // To be compatible across API variants, we send BOTH `message` and `body`.
      const payload = {
        type: normalizedType,
        message: messageContent,
        body: messageContent,
        conversationId: conversationId,
        contactId: contactId,
      };

      console.log("Sending message to GHL:", {
        endpoint: `${baseUrl}/conversations/messages`,
        type: normalizedType,
        conversationId,
        contactId,
        messageLength: messageContent.length,
      });

      const response = await fetchWithTimeout(
        `${baseUrl}/conversations/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
        15000 // 15s timeout for sending
      );

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error("GHL Send Error:", response.status, responseText);
        
        // Try to parse error for better feedback
        let errorDetail = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetail = errorJson.message || errorJson.error || responseText;
        } catch {
          // Keep original text
        }
        
        throw new Error(`Falha ao enviar mensagem: ${errorDetail}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { id: null };
      }
      
      console.log("GHL Send Success:", { messageId: result.id || result.messageId });
      
      return new Response(
        JSON.stringify({ success: true, messageId: result.id || result.messageId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pipelines
    if (action === "pipelines") {
      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
        { method: "GET", headers },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Pipelines Error:", response.status, errorText);
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      
      const pipelines = (data.pipelines || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          position: s.position || 0,
        })),
      }));

      return new Response(
        JSON.stringify({ pipelines }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get opportunities for a pipeline
    if (action === "opportunities") {
      // GHL API v2 requires POST with body for search (camelCase keys)
      const searchBody: Record<string, any> = {
        locationId: GHL_LOCATION_ID,
        limit: 100,
      };
      
      if (pipelineId) {
        searchBody.pipelineId = pipelineId;
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/search`,
        { 
          method: "POST", 
          headers,
          body: JSON.stringify(searchBody),
        },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Opportunities Error:", response.status, errorText);
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      
      const opportunities = (data.opportunities || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        status: o.status,
        monetaryValue: o.monetaryValue || 0,
        pipelineStageId: o.pipelineStageId,
        assignedTo: o.assignedTo,
        contact: o.contact ? {
          id: o.contact.id,
          name: o.contact.name || o.contact.firstName || "Contato",
          email: o.contact.email,
          phone: o.contact.phone,
        } : null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));

      return new Response(
        JSON.stringify({ opportunities, total: data.meta?.total || opportunities.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Move opportunity to a different stage
    if (action === "moveOpportunity") {
      if (!opportunityId || !stageId) {
        throw new Error("opportunityId and stageId are required");
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/${opportunityId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            pipelineStageId: stageId,
            pipelineId: pipelineId,
          }),
        },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Move Opportunity Error:", response.status, errorText);
        throw new Error(`Failed to move opportunity: ${response.status}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action or missing parameters");

  } catch (error) {
    console.error("Error in ghl-conversations:", error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "Tempo limite excedido. A API do GHL está lenta. Tente novamente." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
