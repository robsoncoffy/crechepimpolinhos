import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    const { contactId, phone, name, message, testType } = await req.json();

    // Use known contact ID or search by phone
    let targetContactId = contactId;

    if (!targetContactId && phone) {
      // Format phone for GHL (international format)
      const formattedPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
      const phoneWithCountry = formattedPhone.startsWith("55") ? `+${formattedPhone}` : `+55${formattedPhone}`;
      
      // Search for contact by phone
      const searchResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&phone=${encodeURIComponent(phoneWithCountry)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            Version: "2021-07-28",
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.contact?.id) {
          targetContactId = searchData.contact.id;
          console.log("Found contact by phone:", targetContactId);
        }
      }

      // If no contact found, create one
      if (!targetContactId) {
        console.log("Contact not found, creating new contact...");
        const createResponse = await fetch(
          "https://services.leadconnectorhq.com/contacts",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GHL_API_KEY}`,
              "Content-Type": "application/json",
              Version: "2021-07-28",
            },
            body: JSON.stringify({
              locationId: GHL_LOCATION_ID,
              phone: phoneWithCountry,
              name: name || "Teste WhatsApp",
              tags: ["teste-whatsapp"],
            }),
          }
        );

        if (createResponse.ok) {
          const createData = await createResponse.json();
          targetContactId = createData.contact?.id;
          console.log("Created new contact:", targetContactId);
        } else {
          const errorText = await createResponse.text();
          console.error("Failed to create contact:", errorText);
        }
      }
    }

    if (!targetContactId) {
      return new Response(
        JSON.stringify({ success: false, error: "No contact found. Provide contactId or valid phone." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test message based on type
    let whatsappMessage = message;
    if (testType === "pre-enrollment-confirmation") {
      whatsappMessage = `🎈 *Olá!*

Recebemos sua pré-matrícula na *Creche Pimpolinhos*! 🎉

📋 *Próximos passos:*
1️⃣ Nossa equipe analisará sua solicitação
2️⃣ Entraremos em contato para agendar uma visita
3️⃣ Você receberá um convite para completar o cadastro

Qualquer dúvida, estamos à disposição!

_Creche Pimpolinhos - Cuidando com amor_ 💙`;
    } else if (testType === "invite-approval") {
      whatsappMessage = `🎊 *Parabéns! Sua pré-matrícula foi aprovada!*

Estamos muito felizes em receber você na família Pimpolinhos!

📲 *Complete seu cadastro agora:*
https://crechepimpolinhos.lovable.app/cadastro?invite=TESTE123

🎁 Você ganhou um cupom especial de desconto!

Até breve! 💙
_Creche Pimpolinhos_`;
    }

    if (!whatsappMessage) {
      whatsappMessage = "📱 Mensagem de teste da Creche Pimpolinhos!";
    }

    // Send WhatsApp message
    const sendResponse = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-04-15",
        },
        body: JSON.stringify({
          type: "WhatsApp",
          contactId: targetContactId,
          message: whatsappMessage,
          body: whatsappMessage,
        }),
      }
    );

    const responseText = await sendResponse.text();
    console.log("GHL WhatsApp response:", sendResponse.status, responseText);

    if (!sendResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `GHL API error: ${sendResponse.status}`,
          details: responseText,
          contactId: targetContactId
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { rawResponse: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId: targetContactId,
        messageId: result.messageId || result.id,
        result 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
