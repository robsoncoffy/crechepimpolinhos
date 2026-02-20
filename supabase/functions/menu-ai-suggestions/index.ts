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

    // Portion guidelines based on age and meal type
    const portionGuide = menuType === "bercario" 
      ? {
          breakfast: "80-120ml ou 50-80g",
          morning_snack: "50-80g ou 80-100ml",
          lunch: "100-150g total",
          bottle: "120-180ml",
          snack: "50-80g ou 80-100ml",
          pre_dinner: "50-80g",
          dinner: "100-150g total"
        }
      : {
          breakfast: "150-200ml ou 80-120g",
          morning_snack: "80-100g ou 150ml",
          lunch: "200-300g total",
          bottle: "200ml",
          snack: "80-100g ou 150ml",
          pre_dinner: "80-100g",
          dinner: "200-250g total"
        };

    const portionForMeal = portionGuide[mealType as keyof typeof portionGuide] || "100g";

    const systemPrompt = `Você é uma nutricionista especializada em alimentação infantil para creches no Brasil.
Gere sugestões de refeições saudáveis, nutritivas e adequadas para a faixa etária.
IMPORTANTE: Cada sugestão DEVE incluir a quantidade/porção apropriada.
Responda APENAS com um array JSON de objetos, sem explicações.`;

    const ingredientInstruction = ingredient 
      ? `IMPORTANTE: Todas as sugestões DEVEM incluir "${ingredient}" como ingrediente principal ou secundário.`
      : "";

    const userPrompt = `Gere 4 sugestões de ${mealLabel} para ${ageGroup}. 
${ingredientInstruction}
Porção recomendada para esta refeição: ${portionForMeal}
${menuType === "bercario" && mealType === "bottle" ? "Inclua opções de fórmulas e leites." : ""}
${mealType === "breakfast" ? "Inclua opções com carboidratos, proteínas e frutas." : ""}
${mealType === "lunch" || mealType === "dinner" ? "Inclua proteína, carboidrato, legumes." : ""}
${mealType === "snack" || mealType === "morning_snack" || mealType === "pre_dinner" ? "Opções leves como frutas ou vitaminas." : ""}

Responda APENAS com o array JSON no formato:
[{"description": "Nome da refeição (max 50 chars)", "qty": "quantidade ex: 100g, 150ml"}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
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
    let suggestions: Array<{description: string, qty: string}> = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Handle both old format (strings) and new format (objects)
        suggestions = parsed.map((item: string | {description: string, qty: string}) => {
          if (typeof item === 'string') {
            return { description: item, qty: portionForMeal.split(' ou ')[0] };
          }
          return item;
        });
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Fallback suggestions with quantities
      suggestions = [
        { description: "Arroz, feijão e frango grelhado", qty: menuType === "bercario" ? "120g" : "250g" },
        { description: "Macarrão com carne moída", qty: menuType === "bercario" ? "100g" : "200g" },
        { description: "Purê de batata com legumes", qty: menuType === "bercario" ? "100g" : "180g" },
        { description: "Sopa de legumes com frango", qty: menuType === "bercario" ? "150ml" : "250ml" },
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
