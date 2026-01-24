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
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Try exact match first
  let match = foods.find(f => 
    f.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedQuery)
  );
  
  if (!match) {
    // Try partial matches with individual words
    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      match = foods.find(f => 
        f.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(word)
      );
      if (match) break;
    }
  }
  
  return match || null;
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
2. Se a descrição incluir quantidade explícita (ex: "100g", "150ml", "200 gramas"), USE ESSA QUANTIDADE
3. Se não houver quantidade explícita, estime a quantidade em gramas (porção típica infantil)
4. Use nomes simples em português que possam ser encontrados na tabela TACO
5. Se for uma preparação (ex: "arroz com feijão"), separe em ingredientes
6. Ignore artigos, conectivos e descrições genéricas

Retorne APENAS um JSON válido no formato:
{"foods": [{"name": "nome do alimento", "quantity": 100, "unit": "g"}]}

Exemplos de porções infantis típicas (use APENAS se não houver quantidade informada):
- Arroz: 60g
- Feijão: 50g
- Frango: 50g
- Carne: 50g
- Leite: 150ml
- Frutas: 80g
- Legumes: 40g
- Pão: 25g
- Suco: 100ml

IMPORTANTE: Se o usuário informar quantidade total (ex: "Arroz com feijão (120g)"), distribua proporcionalmente entre os alimentos.`
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
