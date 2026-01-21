import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuggestionRequest {
  mealType: "breakfast" | "morning_snack" | "lunch" | "bottle" | "snack" | "pre_dinner" | "dinner";
  menuType: "bercario" | "maternal";
  dayOfWeek: number;
}

const mealLabels: Record<string, string> = {
  breakfast: "café da manhã",
  morning_snack: "lanche da manhã",
  lunch: "almoço",
  bottle: "mamadeira",
  snack: "lanche da tarde",
  pre_dinner: "pré-janta",
  dinner: "jantar",
};

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

    const { mealType, menuType, ingredient }: SuggestionRequest & { ingredient?: string } = await req.json();

    const mealLabel = mealLabels[mealType] || mealType;
    const ageGroup = menuType === "bercario" ? "bebês de 4 meses a 1 ano" : "crianças de 1 a 5 anos";

    const systemPrompt = `Você é uma nutricionista especializada em alimentação infantil para creches no Brasil. 
Gere sugestões de refeições saudáveis, nutritivas e adequadas para a faixa etária.
Responda APENAS com um array JSON de 4 strings curtas (máximo 60 caracteres cada), sem explicações.
As sugestões devem ser variadas e realistas para uma creche brasileira.`;

    const ingredientInstruction = ingredient 
      ? `IMPORTANTE: Todas as sugestões DEVEM incluir "${ingredient}" como ingrediente principal ou secundário.`
      : "";

    const userPrompt = `Gere 4 sugestões de ${mealLabel} para ${ageGroup}. 
${ingredientInstruction}
${menuType === "bercario" && mealType === "bottle" ? "Inclua opções de fórmulas e papinhas líquidas." : ""}
${mealType === "breakfast" ? "Inclua opções com carboidratos, proteínas e frutas." : ""}
${mealType === "lunch" || mealType === "dinner" ? "Inclua proteína, carboidrato, legumes e salada quando apropriado." : ""}
${mealType === "snack" || mealType === "morning_snack" || mealType === "pre_dinner" ? "Opções leves e nutritivas como frutas, biscoitos saudáveis ou vitaminas." : ""}

Responda APENAS com o array JSON, exemplo: ["Sugestão 1", "Sugestão 2", "Sugestão 3", "Sugestão 4"]`;

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
        temperature: 0.8,
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
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Fallback suggestions
      suggestions = [
        "Arroz, feijão e frango grelhado",
        "Macarrão com carne moída",
        "Purê de batata com legumes",
        "Sopa de legumes com frango",
      ];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in menu-ai-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
