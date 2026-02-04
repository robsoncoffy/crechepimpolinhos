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
    let filterType = ""; // Filter by conversation type (Email, SMS, etc.)

    let requestBody: Record<string, any> = {};
    
    if (req.method === "POST") {
      requestBody = await req.json();
      action = requestBody.action || "list";
      conversationId = requestBody.conversationId || "";
      contactId = requestBody.contactId || "";
      limit = requestBody.limit || "20";
      messageContent = requestBody.message || "";
      messageType = requestBody.type || "SMS";
      pipelineId = requestBody.pipelineId || "";
      opportunityId = requestBody.opportunityId || "";
      stageId = requestBody.stageId || "";
      skipCache = requestBody.skipCache || false;
      filterType = requestBody.filterType || "";
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
      
      // Filter by conversation type if specified (Email, SMS, WhatsApp, etc.)
      if (filterType) {
        searchParams.set("type", filterType);
      }

      // Fetch conversations, opportunities and pipelines in parallel
      const [conversationsResponse, opportunitiesResponse, pipelinesResponse] = await Promise.all([
        fetchWithTimeout(
          `${baseUrl}/conversations/search?${searchParams.toString()}`,
          { method: "GET", headers },
          10000
        ),
        fetchWithTimeout(
          `${baseUrl}/opportunities/search?location_id=${GHL_LOCATION_ID}&limit=100`,
          { method: "GET", headers },
          10000
        ).catch(() => null), // Don't fail if opportunities fetch fails
        fetchWithTimeout(
          `${baseUrl}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
          { method: "GET", headers },
          10000
        ).catch(() => null), // Don't fail if pipelines fetch fails
      ]);

      if (!conversationsResponse.ok) {
        const errorText = await conversationsResponse.text();
        console.error("GHL API Error:", conversationsResponse.status, errorText);
        throw new Error(`GHL API error: ${conversationsResponse.status}`);
      }

      const conversationsData = await conversationsResponse.json();
      
      // Build stage name map from pipelines
      const stageMap: Record<string, { name: string; pipelineName: string }> = {};
      if (pipelinesResponse?.ok) {
        try {
          const pipelinesData = await pipelinesResponse.json();
          for (const pipeline of pipelinesData.pipelines || []) {
            for (const stage of pipeline.stages || []) {
              stageMap[stage.id] = {
                name: stage.name,
                pipelineName: pipeline.name,
              };
            }
          }
        } catch (e) {
          console.error("Error parsing pipelines:", e);
        }
      }

      // Build opportunities map by contactId
      const opportunitiesMap: Record<string, {
        stageName: string;
        status: string;
        pipelineName: string;
        monetaryValue: number;
      }> = {};
      
      if (opportunitiesResponse?.ok) {
        try {
          const opportunitiesData = await opportunitiesResponse.json();
          for (const opp of opportunitiesData.opportunities || []) {
            const contactId = opp.contact?.id;
            if (contactId) {
              const stageInfo = stageMap[opp.pipelineStageId];
              opportunitiesMap[contactId] = {
                stageName: stageInfo?.name || "Novo Lead",
                status: opp.status || "open",
                pipelineName: stageInfo?.pipelineName || "",
                monetaryValue: opp.monetaryValue || 0,
              };
            }
          }
        } catch (e) {
          console.error("Error parsing opportunities:", e);
        }
      }
      
      // Format conversations for frontend
      const conversations = (conversationsData.conversations || []).map((conv: any) => ({
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
        JSON.stringify({ 
          conversations, 
          total: conversationsData.total || conversations.length,
          opportunitiesMap 
        }),
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
        // Include attachments for media messages
        attachments: msg.attachments || [],
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
      // GHL API v2 uses GET with query params for listing opportunities
      const searchParams = new URLSearchParams({
        location_id: GHL_LOCATION_ID,
        limit: "100",
      });
      
      if (pipelineId) {
        searchParams.set("pipeline_id", pipelineId);
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/search?${searchParams.toString()}`,
        { 
          method: "GET", 
          headers,
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

    // Update opportunity (name, value, stage)
    if (action === "updateOpportunity") {
      if (!opportunityId) {
        throw new Error("opportunityId is required");
      }

      const updateData: Record<string, any> = {};

      if (requestBody.name) updateData.name = requestBody.name;
      if (requestBody.monetaryValue !== undefined) updateData.monetaryValue = requestBody.monetaryValue;
      if (requestBody.stageId) {
        updateData.pipelineStageId = requestBody.stageId;
        updateData.pipelineId = pipelineId;
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/${opportunityId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updateData),
        },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Update Opportunity Error:", response.status, errorText);
        throw new Error(`Failed to update opportunity: ${response.status}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update opportunity status (won/lost/abandoned/open)
    if (action === "updateOpportunityStatus") {
      if (!opportunityId) {
        throw new Error("opportunityId is required");
      }

      const status = requestBody.status || "open";

      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/${opportunityId}/status`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ status }),
        },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Update Status Error:", response.status, errorText);
        throw new Error(`Failed to update opportunity status: ${response.status}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new opportunity
    if (action === "createOpportunity") {
      if (!requestBody.name || !requestBody.pipelineId || !requestBody.stageId) {
        throw new Error("name, pipelineId, and stageId are required");
      }

      // First, create or find contact if contact data provided
      let newContactId = requestBody.contactId;
      
      if (!newContactId && (requestBody.contactName || requestBody.contactEmail || requestBody.contactPhone)) {
        // Create a new contact
        const contactPayload: Record<string, any> = {
          locationId: GHL_LOCATION_ID,
        };

        if (requestBody.contactName) {
          const nameParts = requestBody.contactName.split(" ");
          contactPayload.firstName = nameParts[0];
          contactPayload.lastName = nameParts.slice(1).join(" ") || "";
          contactPayload.name = requestBody.contactName;
        }
        if (requestBody.contactEmail) contactPayload.email = requestBody.contactEmail;
        if (requestBody.contactPhone) contactPayload.phone = requestBody.contactPhone;

        const contactResponse = await fetchWithTimeout(
          `${baseUrl}/contacts/`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(contactPayload),
          },
          10000
        );

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          newContactId = contactData.contact?.id;
        }
      }

      // Create the opportunity
      const opportunityPayload: Record<string, any> = {
        name: requestBody.name,
        pipelineId: requestBody.pipelineId,
        pipelineStageId: requestBody.stageId,
        status: "open",
        monetaryValue: requestBody.monetaryValue || 0,
      };

      if (newContactId) {
        opportunityPayload.contactId = newContactId;
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/opportunities/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(opportunityPayload),
        },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Create Opportunity Error:", response.status, errorText);
        throw new Error(`Failed to create opportunity: ${response.status}`);
      }

      const result = await response.json();

      return new Response(
        JSON.stringify({ success: true, opportunity: result.opportunity }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List contacts
    if (action === "contacts") {
      const searchParams = new URLSearchParams({
        locationId: GHL_LOCATION_ID,
        limit: limit || "50",
      });

      // Optional search query
      if (conversationId) {
        // Using conversationId as search query for contacts
        searchParams.set("query", conversationId);
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/contacts/?${searchParams.toString()}`,
        { method: "GET", headers },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL Contacts Error:", response.status, errorText);
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Format contacts for frontend
      const contacts = (data.contacts || []).map((contact: any) => ({
        id: contact.id,
        name: contact.contactName || contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || contact.phone || "Contato",
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags || [],
        dateAdded: contact.dateAdded,
      }));

      return new Response(
        JSON.stringify({ contacts, total: data.meta?.total || contacts.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start new conversation with a contact
    if (action === "startConversation" && contactId) {
      if (!messageContent) {
        throw new Error("Message content is required");
      }

      // Normalize type
      const validTypes: Record<string, string> = {
        whatsapp: "WhatsApp",
        sms: "SMS",
        email: "Email",
      };
      const normalizedType = validTypes[messageType.toLowerCase()] || "SMS";

      // GHL uses the messages endpoint to create a conversation if one doesn't exist
      const payload = {
        type: normalizedType,
        message: messageContent,
        body: messageContent,
        contactId: contactId,
      };

      console.log("Starting conversation with contact:", {
        endpoint: `${baseUrl}/conversations/messages`,
        type: normalizedType,
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
        15000
      );

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error("GHL Start Conversation Error:", response.status, responseText);
        
        let errorDetail = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetail = errorJson.message || errorJson.error || responseText;
        } catch {
          // Keep original text
        }
        
        throw new Error(`Falha ao iniciar conversa: ${errorDetail}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { id: null };
      }
      
      console.log("Conversation started:", { messageId: result.id || result.messageId, conversationId: result.conversationId });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: result.id || result.messageId,
          conversationId: result.conversationId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark conversation as read
    if (action === "markAsRead" && conversationId) {
      // GHL API endpoint to mark conversation as read
      const response = await fetchWithTimeout(
        `${baseUrl}/conversations/${conversationId}/messages/status`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ status: "read" }),
        },
        8000
      );

      // Some GHL versions may not support this endpoint - fail gracefully
      if (!response.ok) {
        console.warn("GHL markAsRead may not be supported:", response.status);
        // Return success anyway to not break the UX
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
