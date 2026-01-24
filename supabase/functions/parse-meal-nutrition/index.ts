import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TACO_API_BASE = 'https://taco.deno.dev/api/v1';

interface TacoFood {
  id: number;
  description: string;
  category: { id: number; description: string };
  base_qty: number;
  base_unit: string;
  attributes: Record<string, { qty: number; unit: string }>;
}

interface ParsedFood {
  name: string;
  quantity: number;
  unit: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mealDescription } = await req.json();

    if (!mealDescription || mealDescription.trim().length < 3) {
      return new Response(
        JSON.stringify({ foods: [], totals: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to parse the meal description into individual foods
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ foods: [], totals: null, error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente nutricional brasileiro especializado em identificar alimentos em descrições de refeições.
            
Sua tarefa é extrair os alimentos de uma descrição de refeição e retornar em formato JSON.

REGRAS:
1. Identifique cada alimento separadamente
2. Estime a quantidade em gramas (porção típica infantil)
3. Use nomes simples em português que possam ser encontrados na tabela TACO
4. Se for uma preparação (ex: "arroz com feijão"), separe em ingredientes
5. Ignore artigos, conectivos e descrições genéricas

Retorne APENAS um JSON válido no formato:
{"foods": [{"name": "nome do alimento", "quantity": 100, "unit": "g"}]}

Exemplos de porções infantis típicas:
- Arroz: 60g
- Feijão: 50g
- Frango: 50g
- Carne: 50g
- Leite: 150ml
- Frutas: 80g
- Legumes: 40g
- Pão: 25g
- Suco: 100ml`
          },
          {
            role: 'user',
            content: `Identifique os alimentos nesta refeição: "${mealDescription}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      return new Response(
        JSON.stringify({ foods: [], totals: null, error: 'AI parsing failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    // Extract JSON from AI response
    let parsedFoods: ParsedFood[] = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedFoods = parsed.foods || [];
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', aiContent);
    }

    if (parsedFoods.length === 0) {
      return new Response(
        JSON.stringify({ foods: [], totals: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search TACO for each food and get nutritional data
    const foodsWithNutrition: (TacoFood & { quantity: number })[] = [];
    
    for (const parsedFood of parsedFoods) {
      try {
        const searchResponse = await fetch(`${TACO_API_BASE}/foods?q=${encodeURIComponent(parsedFood.name)}`);
        if (searchResponse.ok) {
          // Some TACO endpoints return an array, others return an object like { foods: [...] }.
          const raw = await searchResponse.json();
          const searchResults: TacoFood[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.foods)
              ? raw.foods
              : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.results)
                  ? raw.results
                  : [];

          if (searchResults.length > 0) {
            // Get the first (best) match
            const bestMatch = searchResults[0];
            foodsWithNutrition.push({
              ...bestMatch,
              quantity: parsedFood.quantity,
            });
          }
        }
      } catch (searchError) {
        console.error('TACO search error for', parsedFood.name, ':', searchError);
      }
    }

    // Calculate totals
    const totals = foodsWithNutrition.reduce(
      (acc, food) => {
        const multiplier = food.quantity / food.base_qty;
        const attrs = food.attributes || {};
        
        return {
          energy: acc.energy + ((attrs.energy?.qty || 0) * multiplier),
          protein: acc.protein + ((attrs.protein?.qty || 0) * multiplier),
          lipid: acc.lipid + ((attrs.lipid?.qty || 0) * multiplier),
          carbohydrate: acc.carbohydrate + ((attrs.carbohydrate?.qty || 0) * multiplier),
          fiber: acc.fiber + ((attrs.fiber?.qty || 0) * multiplier),
          calcium: acc.calcium + ((attrs.calcium?.qty || 0) * multiplier),
          iron: acc.iron + ((attrs.iron?.qty || 0) * multiplier),
          sodium: acc.sodium + ((attrs.sodium?.qty || 0) * multiplier),
          vitamin_c: acc.vitamin_c + ((attrs.vitamin_c?.qty || 0) * multiplier),
          vitamin_a: acc.vitamin_a + ((attrs.vitamin_a?.qty || 0) * multiplier),
        };
      },
      {
        energy: 0,
        protein: 0,
        lipid: 0,
        carbohydrate: 0,
        fiber: 0,
        calcium: 0,
        iron: 0,
        sodium: 0,
        vitamin_c: 0,
        vitamin_a: 0,
      }
    );

    return new Response(
      JSON.stringify({
        foods: foodsWithNutrition,
        totals: foodsWithNutrition.length > 0 ? totals : null,
        parsed: parsedFoods
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-meal-nutrition:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
