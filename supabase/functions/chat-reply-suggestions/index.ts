import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuggestionRequest {
  messages: { role: "parent" | "teacher"; content: string }[];
  childName: string;
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

    const { messages, childName }: SuggestionRequest = await req.json();

    // Format conversation for context
    const conversationContext = messages
      .slice(-6) // Last 6 messages for context
      .map((m) => `${m.role === "parent" ? "Pai/Mãe" : "Escola"}: ${m.content}`)
      .join("\n");

    const lastMessage = messages[messages.length - 1];
    const isFromParent = lastMessage?.role === "parent";

    const systemPrompt = `Você é uma assistente de uma creche no Brasil que ajuda professoras a responder mensagens de pais de forma profissional, carinhosa e empática.

Regras:
- Gere 3 sugestões de resposta curtas (máximo 100 caracteres cada)
- Mantenha tom acolhedor e profissional
- Use português brasileiro informal mas respeitoso
- Nunca invente informações específicas (horários, datas, valores)
- Se a pergunta for sobre algo específico que você não sabe, sugira que a professora vai verificar
- Use emojis com moderação (máximo 1 por resposta)

Responda APENAS com um array JSON de 3 strings, sem explicações.
Exemplo: ["Olá! Vou verificar e te aviso 😊", "Boa tarde! Sim, tudo certo por aqui!", "Obrigada por avisar! Anotado."]`;

    const userPrompt = `Contexto: Conversa sobre a criança "${childName}"

Últimas mensagens:
${conversationContext || "Nenhuma mensagem anterior"}

${isFromParent 
  ? `A última mensagem é do pai/mãe: "${lastMessage?.content}"\n\nGere 3 sugestões de resposta da professora.`
  : "Gere 3 sugestões de mensagens para iniciar ou continuar a conversa com os pais."
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
        "Olá! Vou verificar e te retorno em breve 😊",
        "Obrigada por avisar! Anotado aqui.",
        "Tudo bem por aqui! Qualquer coisa aviso.",
      ];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-reply-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
