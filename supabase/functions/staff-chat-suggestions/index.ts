import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuggestionRequest {
  messages: { role: "self" | "colleague"; content: string }[];
  roomName: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, roomName }: SuggestionRequest = await req.json();

    // Format conversation for context
    const conversationContext = messages
      .slice(-6) // Last 6 messages for context
      .map((m) => `${m.role === "self" ? "Eu" : "Colega"}: ${m.content}`)
      .join("\n");

    const lastMessage = messages[messages.length - 1];
    const isFromColleague = lastMessage?.role === "colleague";

    const systemPrompt = `Você é uma assistente de comunicação interna de uma creche no Brasil. Você ajuda funcionários (professoras, cozinheiras, nutricionistas, pedagogas, administradores) a responder mensagens de colegas de forma profissional, rápida e amigável.

Contexto: Chat interno da equipe - Canal/Grupo: "${roomName}"

Regras:
- Gere 3 sugestões de resposta curtas (máximo 80 caracteres cada)
- Tom profissional mas descontraído - são colegas de trabalho
- Use português brasileiro informal
- Seja prático e objetivo
- Use emojis com moderação (máximo 1 por resposta)
- Considere o contexto de trabalho em creche (horários, refeições, crianças, organização)

Responda APENAS com um array JSON de 3 strings, sem explicações.
Exemplo: ["Perfeito, pode contar comigo! 👍", "Vou verificar agora mesmo", "Ok, já estou preparando!"]`;

    const userPrompt = `Últimas mensagens:
${conversationContext || "Nenhuma mensagem anterior"}

${isFromColleague 
  ? `A última mensagem é de um colega: "${lastMessage?.content}"\n\nGere 3 sugestões de resposta.`
  : "Gere 3 sugestões de mensagens para enviar ao grupo/colega."
}

Responda APENAS com o array JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar sugestões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Fallback suggestions
      suggestions = [
        "Entendido, obrigado! 👍",
        "Vou verificar e já retorno.",
        "Ok, pode deixar comigo!",
      ];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in staff-chat-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
