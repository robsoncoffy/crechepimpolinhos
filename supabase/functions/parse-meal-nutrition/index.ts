import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the marcelosanto/tabela_taco JSON which is more stable
const TACO_JSON_URL = 'https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/tabela_alimentos.json';

interface TacoFoodRaw {
  id: number;
  description: string;
  category: string;
  energy_kcal: number | string;
  protein_g: number | string;
  lipid_g: number | string;
  carbohydrate_g: number | string;
  fiber_g: number | string;
  calcium_mg: number | string;
  iron_mg: number | string;
  sodium_mg: number | string;
  potassium_mg: number | string;
  magnesium_mg: number | string;
  phosphorus_mg: number | string;
  zinc_mg: number | string;
  copper_mg: number | string;
  manganese_mg: number | string;
  vitaminC_mg: number | string;
  rae_mcg: number | string;
  retinol_mcg: number | string;
  thiamine_mg: number | string;
  riboflavin_mg: number | string;
  pyridoxine_mg: number | string;
  niacin_mg: number | string;
  cholesterol_mg: number | string;
  saturated_g: number | string;
  monounsaturated_g: number | string;
  polyunsaturated_g: number | string;
}

interface ParsedFood {
  name: string;
  quantity: number;
  unit: string;
}

interface NutrientValue {
  qty: number;
  unit: string;
}

interface NormalizedFood {
  id: number;
  description: string;
  category: string;
  base_qty: number;
  base_unit: string;
  attributes: {
    energy: NutrientValue;
    protein: NutrientValue;
    lipid: NutrientValue;
    carbohydrate: NutrientValue;
    fiber: NutrientValue;
    calcium: NutrientValue;
    iron: NutrientValue;
    sodium: NutrientValue;
    potassium: NutrientValue;
    magnesium: NutrientValue;
    phosphorus: NutrientValue;
    zinc: NutrientValue;
    copper: NutrientValue;
    manganese: NutrientValue;
    vitamin_c: NutrientValue;
    vitamin_a: NutrientValue;
    retinol: NutrientValue;
    thiamine: NutrientValue;
    riboflavin: NutrientValue;
    pyridoxine: NutrientValue;
    niacin: NutrientValue;
    cholesterol: NutrientValue;
    saturated: NutrientValue;
    monounsaturated: NutrientValue;
    polyunsaturated: NutrientValue;
  };
  quantity: number;
}

// Cache for TACO data
let tacoDataCache: TacoFoodRaw[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchTacoData(): Promise<TacoFoodRaw[]> {
  const now = Date.now();
  if (tacoDataCache && (now - lastFetchTime) < CACHE_TTL) {
    return tacoDataCache;
  }

  try {
    console.log('Fetching TACO data from GitHub...');
    const response = await fetch(TACO_JSON_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch TACO data: ${response.status}`);
    }
    const data = await response.json();
    tacoDataCache = data;
    lastFetchTime = now;
    console.log(`Loaded ${data.length} foods from TACO`);
    return data;
  } catch (error) {
    console.error('Error fetching TACO data:', error);
    return tacoDataCache || [];
  }
}

function parseNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '' || value === 'NA' || value === 'Tr') {
    return 0;
  }
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  return isNaN(num) ? 0 : num;
}

function searchFood(foods: TacoFoodRaw[], query: string): TacoFoodRaw | null {
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Helper to normalize food descriptions
  const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Try exact match (description starts with or equals query)
  let match = foods.find(f => {
    const desc = normalize(f.description);
    return desc === normalizedQuery || desc.startsWith(normalizedQuery + ',') || desc.startsWith(normalizedQuery + ' ');
  });

  if (match) return match;

  // 2. Try matching as a whole word (not substring)
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  const mainWord = queryWords[0] || normalizedQuery;

  // Score-based matching for better accuracy
  let bestMatch: TacoFoodRaw | null = null;
  let bestScore = 0;

  for (const food of foods) {
    const desc = normalize(food.description);
    const descWords = desc.split(/[\s,]+/);

    let score = 0;

    // Check if description starts with the main query word
    if (descWords[0]?.startsWith(mainWord)) {
      score += 10;
    }

    // Check for exact word matches
    for (const qWord of queryWords) {
      if (descWords.some(dw => dw === qWord)) {
        score += 5;
      } else if (descWords.some(dw => dw.startsWith(qWord))) {
        score += 3;
      }
    }

    // Penalize if main word is found but not at start
    if (score === 0 && desc.includes(mainWord)) {
      score = 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = food;
    }
  }

  return bestMatch;
}

function normalizeFood(raw: TacoFoodRaw, quantity: number): NormalizedFood {
  return {
    id: raw.id,
    description: raw.description,
    category: raw.category,
    base_qty: 100, // TACO data is per 100g
    base_unit: 'g',
    attributes: {
      // Macros
      energy: { qty: parseNumber(raw.energy_kcal), unit: 'kcal' },
      protein: { qty: parseNumber(raw.protein_g), unit: 'g' },
      lipid: { qty: parseNumber(raw.lipid_g), unit: 'g' },
      carbohydrate: { qty: parseNumber(raw.carbohydrate_g), unit: 'g' },
      fiber: { qty: parseNumber(raw.fiber_g), unit: 'g' },

      // Minerals
      calcium: { qty: parseNumber(raw.calcium_mg), unit: 'mg' },
      iron: { qty: parseNumber(raw.iron_mg), unit: 'mg' },
      sodium: { qty: parseNumber(raw.sodium_mg), unit: 'mg' },
      potassium: { qty: parseNumber(raw.potassium_mg), unit: 'mg' },
      magnesium: { qty: parseNumber(raw.magnesium_mg), unit: 'mg' },
      phosphorus: { qty: parseNumber(raw.phosphorus_mg), unit: 'mg' },
      zinc: { qty: parseNumber(raw.zinc_mg), unit: 'mg' },
      copper: { qty: parseNumber(raw.copper_mg), unit: 'mg' },
      manganese: { qty: parseNumber(raw.manganese_mg), unit: 'mg' },

      // Vitamins
      vitamin_c: { qty: parseNumber(raw.vitaminC_mg), unit: 'mg' },
      vitamin_a: { qty: parseNumber(raw.rae_mcg), unit: 'µg' },
      retinol: { qty: parseNumber(raw.retinol_mcg), unit: 'µg' },
      thiamine: { qty: parseNumber(raw.thiamine_mg), unit: 'mg' },
      riboflavin: { qty: parseNumber(raw.riboflavin_mg), unit: 'mg' },
      pyridoxine: { qty: parseNumber(raw.pyridoxine_mg), unit: 'mg' },
      niacin: { qty: parseNumber(raw.niacin_mg), unit: 'mg' },

      // Lipid composition
      cholesterol: { qty: parseNumber(raw.cholesterol_mg), unit: 'mg' },
      saturated: { qty: parseNumber(raw.saturated_g), unit: 'g' },
      monounsaturated: { qty: parseNumber(raw.monounsaturated_g), unit: 'g' },
      polyunsaturated: { qty: parseNumber(raw.polyunsaturated_g), unit: 'g' },
    },
    quantity,
  };
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

    // Use the fastest model for quick parsing
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // fastest model
        messages: [
          {
            role: 'system',
            content: `Você é um nutricionista especialista em identificar ingredientes para análise nutricional usando a Tabela TACO.
Sua tarefa é analisar a descrição de uma refeição e extrair os ingredientes individuais em formato JSON.

FORMATO DE RESPOSTA (JSON puro):
{"foods":[{"name":"nome_do_alimento","quantity":100,"unit":"g"}]}

REGRAS CRÍTICAS:
1. Separe pratos compostos em seus ingredientes básicos. Ex: "Arroz com feijão e carne" vira 3 itens: "arroz", "feijão", "carne".
2. Simplifique os nomes para facilitar a busca na tabela nutricional. Evite marcas ou preparos complexos. Ex: "beterraba ralada crua" -> "beterraba crua".
3. Use sempre gramas (g) ou mililitros (ml).
4. Se a quantidade não for informada, use estas PORÇÕES PADRÃO PARA CRIANÇAS:
   - Arroz/Massas/Cereais: 60g
   - Feijão/Leguminosas: 50g
   - Carnes/Ovos/Peixes: 50g
   - Legumes/Verduras: 40g
   - Frutas: 80g
   - Leite/Iogurte: 150ml
   - Pão/Biscoito: 30g
   - Manteiga/Requeijão: 10g
   - Sopas/Caldos: 150ml

EXEMPLOS:
Entrada: "Picadinho de carne com legumes (cenoura e batata)"
Saída: {"foods":[{"name":"carne bovina cozida","quantity":50,"unit":"g"},{"name":"cenoura cozida","quantity":20,"unit":"g"},{"name":"batata cozida","quantity":20,"unit":"g"}]}

Entrada: "Banana amassada com aveia"
Saída: {"foods":[{"name":"banana","quantity":80,"unit":"g"},{"name":"aveia em flocos","quantity":15,"unit":"g"}]}`
          },
          {
            role: 'user',
            content: mealDescription
          }
        ],
        temperature: 0,
        max_tokens: 300
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
        JSON.stringify({ foods: [], totals: null, parsed: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch TACO data
    const tacoData = await fetchTacoData();

    if (tacoData.length === 0) {
      console.error('No TACO data available');
      return new Response(
        JSON.stringify({ foods: [], totals: null, parsed: parsedFoods, error: 'TACO data unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search TACO for each food and get nutritional data
    const foodsWithNutrition: NormalizedFood[] = [];

    for (const parsedFood of parsedFoods) {
      const match = searchFood(tacoData, parsedFood.name);
      if (match) {
        foodsWithNutrition.push(normalizeFood(match, parsedFood.quantity));
      } else {
        // Fallback for not found items: return with zero nutrition but keep quantity and name
        foodsWithNutrition.push({
          id: -1, // Invalid ID to signal it's raw
          description: parsedFood.name, // Keep original name
          category: 'Não encontrado',
          base_qty: 100,
          base_unit: 'g',
          quantity: parsedFood.quantity,
          attributes: {
            energy: { qty: 0, unit: 'kcal' },
            protein: { qty: 0, unit: 'g' },
            lipid: { qty: 0, unit: 'g' },
            carbohydrate: { qty: 0, unit: 'g' },
            fiber: { qty: 0, unit: 'g' },
            calcium: { qty: 0, unit: 'mg' },
            iron: { qty: 0, unit: 'mg' },
            sodium: { qty: 0, unit: 'mg' },
            potassium: { qty: 0, unit: 'mg' },
            magnesium: { qty: 0, unit: 'mg' },
            phosphorus: { qty: 0, unit: 'mg' },
            zinc: { qty: 0, unit: 'mg' },
            copper: { qty: 0, unit: 'mg' },
            manganese: { qty: 0, unit: 'mg' },
            vitamin_c: { qty: 0, unit: 'mg' },
            vitamin_a: { qty: 0, unit: 'µg' },
            retinol: { qty: 0, unit: 'µg' },
            thiamine: { qty: 0, unit: 'mg' },
            riboflavin: { qty: 0, unit: 'mg' },
            pyridoxine: { qty: 0, unit: 'mg' },
            niacin: { qty: 0, unit: 'mg' },
            cholesterol: { qty: 0, unit: 'mg' },
            saturated: { qty: 0, unit: 'g' },
            monounsaturated: { qty: 0, unit: 'g' },
            polyunsaturated: { qty: 0, unit: 'g' },
          }
        });
      }
    }

    // Calculate totals for ALL nutrients
    const totals = foodsWithNutrition.reduce(
      (acc, food) => {
        const multiplier = food.quantity / food.base_qty;
        const attrs = food.attributes;

        return {
          // Macros
          energy: acc.energy + (attrs.energy.qty * multiplier),
          protein: acc.protein + (attrs.protein.qty * multiplier),
          lipid: acc.lipid + (attrs.lipid.qty * multiplier),
          carbohydrate: acc.carbohydrate + (attrs.carbohydrate.qty * multiplier),
          fiber: acc.fiber + (attrs.fiber.qty * multiplier),

          // Minerals
          calcium: acc.calcium + (attrs.calcium.qty * multiplier),
          iron: acc.iron + (attrs.iron.qty * multiplier),
          sodium: acc.sodium + (attrs.sodium.qty * multiplier),
          potassium: acc.potassium + (attrs.potassium.qty * multiplier),
          magnesium: acc.magnesium + (attrs.magnesium.qty * multiplier),
          phosphorus: acc.phosphorus + (attrs.phosphorus.qty * multiplier),
          zinc: acc.zinc + (attrs.zinc.qty * multiplier),
          copper: acc.copper + (attrs.copper.qty * multiplier),
          manganese: acc.manganese + (attrs.manganese.qty * multiplier),

          // Vitamins
          vitamin_c: acc.vitamin_c + (attrs.vitamin_c.qty * multiplier),
          vitamin_a: acc.vitamin_a + (attrs.vitamin_a.qty * multiplier),
          retinol: acc.retinol + (attrs.retinol.qty * multiplier),
          thiamine: acc.thiamine + (attrs.thiamine.qty * multiplier),
          riboflavin: acc.riboflavin + (attrs.riboflavin.qty * multiplier),
          pyridoxine: acc.pyridoxine + (attrs.pyridoxine.qty * multiplier),
          niacin: acc.niacin + (attrs.niacin.qty * multiplier),

          // Lipid composition
          cholesterol: acc.cholesterol + (attrs.cholesterol.qty * multiplier),
          saturated: acc.saturated + (attrs.saturated.qty * multiplier),
          monounsaturated: acc.monounsaturated + (attrs.monounsaturated.qty * multiplier),
          polyunsaturated: acc.polyunsaturated + (attrs.polyunsaturated.qty * multiplier),
        };
      },
      {
        // Macros
        energy: 0,
        protein: 0,
        lipid: 0,
        carbohydrate: 0,
        fiber: 0,
        // Minerals
        calcium: 0,
        iron: 0,
        sodium: 0,
        potassium: 0,
        magnesium: 0,
        phosphorus: 0,
        zinc: 0,
        copper: 0,
        manganese: 0,
        // Vitamins
        vitamin_c: 0,
        vitamin_a: 0,
        retinol: 0,
        thiamine: 0,
        riboflavin: 0,
        pyridoxine: 0,
        niacin: 0,
        // Lipid composition
        cholesterol: 0,
        saturated: 0,
        monounsaturated: 0,
        polyunsaturated: 0,
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
