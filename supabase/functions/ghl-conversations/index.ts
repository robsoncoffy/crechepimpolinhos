import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    let limit = "20";

    if (req.method === "POST") {
      const body = await req.json();
      action = body.action || "list";
      conversationId = body.conversationId || "";
      limit = body.limit || "20";
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

      const response = await fetch(
        `${baseUrl}/conversations/search?${searchParams.toString()}`,
        { method: "GET", headers }
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
      const response = await fetch(
        `${baseUrl}/conversations/${conversationId}/messages?limit=${limit}`,
        { method: "GET", headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL API Error:", response.status, errorText);
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("=== GHL MESSAGES RESPONSE ===");
      console.log("Type of data:", typeof data);
      console.log("Is array:", Array.isArray(data));
      console.log("Keys:", data ? Object.keys(data) : "null");
      console.log("Full response:", JSON.stringify(data, null, 2));
      
      // GHL API can return messages in different formats
      let rawMessages: any[] = [];
      
      try {
        if (Array.isArray(data)) {
          console.log("Format: Direct array");
          rawMessages = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.messages)) {
            console.log("Format: data.messages array");
            rawMessages = data.messages;
          } else if (Array.isArray(data.data)) {
            console.log("Format: data.data array");
            rawMessages = data.data;
          } else if (data.conversations && Array.isArray(data.conversations)) {
            console.log("Format: data.conversations array");
            rawMessages = data.conversations;
          } else {
            console.error("Unknown format - no array found in response");
            console.error("Available keys:", Object.keys(data));
          }
        } else {
          console.error("Invalid response type:", typeof data);
        }
        
        console.log("Extracted messages count:", rawMessages.length);
      } catch (parseError) {
        console.error("Error parsing messages:", parseError);
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

      // Get conversation details for contact info
      const convResponse = await fetch(
        `${baseUrl}/conversations/${conversationId}`,
        { method: "GET", headers }
      );
      
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

    throw new Error("Invalid action or missing parameters");

  } catch (error) {
    console.error("Error in ghl-conversations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
