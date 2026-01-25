import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function normalizeFood(raw: TacoFoodRaw) {
  return {
    id: raw.id,
    description: raw.description,
    category: raw.category,
    base_qty: 100,
    base_unit: 'g',
    attributes: {
      energy: { qty: parseNumber(raw.energy_kcal), unit: 'kcal' },
      protein: { qty: parseNumber(raw.protein_g), unit: 'g' },
      lipid: { qty: parseNumber(raw.lipid_g), unit: 'g' },
      carbohydrate: { qty: parseNumber(raw.carbohydrate_g), unit: 'g' },
      fiber: { qty: parseNumber(raw.fiber_g), unit: 'g' },
      calcium: { qty: parseNumber(raw.calcium_mg), unit: 'mg' },
      iron: { qty: parseNumber(raw.iron_mg), unit: 'mg' },
      sodium: { qty: parseNumber(raw.sodium_mg), unit: 'mg' },
      potassium: { qty: parseNumber(raw.potassium_mg), unit: 'mg' },
      magnesium: { qty: parseNumber(raw.magnesium_mg), unit: 'mg' },
      phosphorus: { qty: parseNumber(raw.phosphorus_mg), unit: 'mg' },
      zinc: { qty: parseNumber(raw.zinc_mg), unit: 'mg' },
      copper: { qty: parseNumber(raw.copper_mg), unit: 'mg' },
      manganese: { qty: parseNumber(raw.manganese_mg), unit: 'mg' },
      vitamin_c: { qty: parseNumber(raw.vitaminC_mg), unit: 'mg' },
      vitamin_a: { qty: parseNumber(raw.rae_mcg), unit: 'µg' },
      retinol: { qty: parseNumber(raw.retinol_mcg), unit: 'µg' },
      thiamine: { qty: parseNumber(raw.thiamine_mg), unit: 'mg' },
      riboflavin: { qty: parseNumber(raw.riboflavin_mg), unit: 'mg' },
      pyridoxine: { qty: parseNumber(raw.pyridoxine_mg), unit: 'mg' },
      niacin: { qty: parseNumber(raw.niacin_mg), unit: 'mg' },
      cholesterol: { qty: parseNumber(raw.cholesterol_mg), unit: 'mg' },
      saturated: { qty: parseNumber(raw.saturated_g), unit: 'g' },
      monounsaturated: { qty: parseNumber(raw.monounsaturated_g), unit: 'g' },
      polyunsaturated: { qty: parseNumber(raw.polyunsaturated_g), unit: 'g' },
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ foods: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tacoData = await fetchTacoData();
    
    if (tacoData.length === 0) {
      return new Response(
        JSON.stringify({ foods: [], error: 'TACO data unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize search query
    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const queryWords = normalizedQuery.split(/\s+/).filter((w: string) => w.length > 1);

    // Score-based search
    const scoredResults = tacoData.map(food => {
      const desc = food.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const descWords = desc.split(/[\s,]+/);
      
      let score = 0;
      
      // Exact description match
      if (desc === normalizedQuery) score += 100;
      
      // Description starts with query
      if (desc.startsWith(normalizedQuery)) score += 50;
      
      // First word matches
      if (descWords[0]?.startsWith(queryWords[0] || '')) score += 20;
      
      // Word matches
      for (const qWord of queryWords) {
        if (descWords.some(dw => dw === qWord)) score += 10;
        else if (descWords.some(dw => dw.startsWith(qWord))) score += 5;
        else if (desc.includes(qWord)) score += 2;
      }
      
      return { food, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

    const results = scoredResults.map(r => normalizeFood(r.food));

    return new Response(
      JSON.stringify({ foods: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in taco-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
