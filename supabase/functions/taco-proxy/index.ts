import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Primary: TACO API (taco.deno.dev)
const TACO_API_BASE = "https://taco.deno.dev/api/v1";

// Secondary: IBGE/POF API (fallback for foods not in TACO)
const IBGE_API_BASE = "http://132.226.248.2/api";

// Extra foods not in TACO/IBGE databases - values per 100g from USDA references
const EXTRA_FOODS = [
  {
    id: 90001,
    description: "Chia, semente",
    category: "Sementes",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 486, unit: "kcal" },
      protein: { qty: 16.5, unit: "g" },
      lipid: { qty: 30.7, unit: "g" },
      carbohydrate: { qty: 42.1, unit: "g" },
      fiber: { qty: 34.4, unit: "g" },
      calcium: { qty: 631, unit: "mg" },
      iron: { qty: 7.7, unit: "mg" },
      sodium: { qty: 16, unit: "mg" },
      potassium: { qty: 407, unit: "mg" },
      magnesium: { qty: 335, unit: "mg" },
      phosphorus: { qty: 860, unit: "mg" },
      zinc: { qty: 4.6, unit: "mg" },
      copper: { qty: 0.9, unit: "mg" },
      manganese: { qty: 2.7, unit: "mg" },
      vitamin_c: { qty: 1.6, unit: "mg" },
      vitamin_a: { qty: 54, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.6, unit: "mg" },
      riboflavin: { qty: 0.2, unit: "mg" },
      pyridoxine: { qty: 0.1, unit: "mg" },
      niacin: { qty: 8.8, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 3.3, unit: "g" },
      monounsaturated: { qty: 2.3, unit: "g" },
      polyunsaturated: { qty: 23.7, unit: "g" },
    },
  },
  {
    id: 90002,
    description: "Quinoa, grão cozido",
    category: "Cereais",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 120, unit: "kcal" },
      protein: { qty: 4.4, unit: "g" },
      lipid: { qty: 1.9, unit: "g" },
      carbohydrate: { qty: 21.3, unit: "g" },
      fiber: { qty: 2.8, unit: "g" },
      calcium: { qty: 17, unit: "mg" },
      iron: { qty: 1.5, unit: "mg" },
      sodium: { qty: 7, unit: "mg" },
      potassium: { qty: 172, unit: "mg" },
      magnesium: { qty: 64, unit: "mg" },
      phosphorus: { qty: 152, unit: "mg" },
      zinc: { qty: 1.1, unit: "mg" },
      copper: { qty: 0.2, unit: "mg" },
      manganese: { qty: 0.6, unit: "mg" },
      vitamin_c: { qty: 0, unit: "mg" },
      vitamin_a: { qty: 1, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.1, unit: "mg" },
      riboflavin: { qty: 0.1, unit: "mg" },
      pyridoxine: { qty: 0.1, unit: "mg" },
      niacin: { qty: 0.4, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 0.2, unit: "g" },
      monounsaturated: { qty: 0.5, unit: "g" },
      polyunsaturated: { qty: 1.1, unit: "g" },
    },
  },
  {
    id: 90003,
    description: "Quinoa, grão cru",
    category: "Cereais",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 368, unit: "kcal" },
      protein: { qty: 14.1, unit: "g" },
      lipid: { qty: 6.1, unit: "g" },
      carbohydrate: { qty: 64.2, unit: "g" },
      fiber: { qty: 7.0, unit: "g" },
      calcium: { qty: 47, unit: "mg" },
      iron: { qty: 4.6, unit: "mg" },
      sodium: { qty: 5, unit: "mg" },
      potassium: { qty: 563, unit: "mg" },
      magnesium: { qty: 197, unit: "mg" },
      phosphorus: { qty: 457, unit: "mg" },
      zinc: { qty: 3.1, unit: "mg" },
      copper: { qty: 0.6, unit: "mg" },
      manganese: { qty: 2.0, unit: "mg" },
      vitamin_c: { qty: 0, unit: "mg" },
      vitamin_a: { qty: 1, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.4, unit: "mg" },
      riboflavin: { qty: 0.3, unit: "mg" },
      pyridoxine: { qty: 0.5, unit: "mg" },
      niacin: { qty: 1.5, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 0.7, unit: "g" },
      monounsaturated: { qty: 1.6, unit: "g" },
      polyunsaturated: { qty: 3.3, unit: "g" },
    },
  },
  {
    id: 90004,
    description: "Aveia, flocos integrais",
    category: "Cereais",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 389, unit: "kcal" },
      protein: { qty: 16.9, unit: "g" },
      lipid: { qty: 6.9, unit: "g" },
      carbohydrate: { qty: 66.3, unit: "g" },
      fiber: { qty: 10.6, unit: "g" },
      calcium: { qty: 54, unit: "mg" },
      iron: { qty: 4.7, unit: "mg" },
      sodium: { qty: 2, unit: "mg" },
      potassium: { qty: 429, unit: "mg" },
      magnesium: { qty: 177, unit: "mg" },
      phosphorus: { qty: 523, unit: "mg" },
      zinc: { qty: 4.0, unit: "mg" },
      copper: { qty: 0.6, unit: "mg" },
      manganese: { qty: 4.9, unit: "mg" },
      vitamin_c: { qty: 0, unit: "mg" },
      vitamin_a: { qty: 0, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.8, unit: "mg" },
      riboflavin: { qty: 0.1, unit: "mg" },
      pyridoxine: { qty: 0.1, unit: "mg" },
      niacin: { qty: 1.0, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 1.2, unit: "g" },
      monounsaturated: { qty: 2.2, unit: "g" },
      polyunsaturated: { qty: 2.5, unit: "g" },
    },
  },
  {
    id: 90005,
    description: "Amaranto, grão",
    category: "Cereais",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 371, unit: "kcal" },
      protein: { qty: 13.6, unit: "g" },
      lipid: { qty: 7.0, unit: "g" },
      carbohydrate: { qty: 65.3, unit: "g" },
      fiber: { qty: 6.7, unit: "g" },
      calcium: { qty: 159, unit: "mg" },
      iron: { qty: 7.6, unit: "mg" },
      sodium: { qty: 4, unit: "mg" },
      potassium: { qty: 508, unit: "mg" },
      magnesium: { qty: 248, unit: "mg" },
      phosphorus: { qty: 557, unit: "mg" },
      zinc: { qty: 2.9, unit: "mg" },
      copper: { qty: 0.5, unit: "mg" },
      manganese: { qty: 3.3, unit: "mg" },
      vitamin_c: { qty: 4.2, unit: "mg" },
      vitamin_a: { qty: 2, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.1, unit: "mg" },
      riboflavin: { qty: 0.2, unit: "mg" },
      pyridoxine: { qty: 0.6, unit: "mg" },
      niacin: { qty: 0.9, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 1.5, unit: "g" },
      monounsaturated: { qty: 1.7, unit: "g" },
      polyunsaturated: { qty: 2.8, unit: "g" },
    },
  },
  {
    id: 90006,
    description: "Gergelim, semente",
    category: "Sementes",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 573, unit: "kcal" },
      protein: { qty: 17.7, unit: "g" },
      lipid: { qty: 49.7, unit: "g" },
      carbohydrate: { qty: 23.5, unit: "g" },
      fiber: { qty: 11.8, unit: "g" },
      calcium: { qty: 975, unit: "mg" },
      iron: { qty: 14.6, unit: "mg" },
      sodium: { qty: 11, unit: "mg" },
      potassium: { qty: 468, unit: "mg" },
      magnesium: { qty: 351, unit: "mg" },
      phosphorus: { qty: 629, unit: "mg" },
      zinc: { qty: 7.8, unit: "mg" },
      copper: { qty: 4.1, unit: "mg" },
      manganese: { qty: 2.5, unit: "mg" },
      vitamin_c: { qty: 0, unit: "mg" },
      vitamin_a: { qty: 9, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.8, unit: "mg" },
      riboflavin: { qty: 0.2, unit: "mg" },
      pyridoxine: { qty: 0.8, unit: "mg" },
      niacin: { qty: 4.5, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 7.0, unit: "g" },
      monounsaturated: { qty: 18.8, unit: "g" },
      polyunsaturated: { qty: 21.8, unit: "g" },
    },
  },
  {
    id: 90007,
    description: "Girassol, semente sem casca",
    category: "Sementes",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 584, unit: "kcal" },
      protein: { qty: 20.8, unit: "g" },
      lipid: { qty: 51.5, unit: "g" },
      carbohydrate: { qty: 20.0, unit: "g" },
      fiber: { qty: 8.6, unit: "g" },
      calcium: { qty: 78, unit: "mg" },
      iron: { qty: 5.3, unit: "mg" },
      sodium: { qty: 9, unit: "mg" },
      potassium: { qty: 645, unit: "mg" },
      magnesium: { qty: 325, unit: "mg" },
      phosphorus: { qty: 660, unit: "mg" },
      zinc: { qty: 5.0, unit: "mg" },
      copper: { qty: 1.8, unit: "mg" },
      manganese: { qty: 1.9, unit: "mg" },
      vitamin_c: { qty: 1.4, unit: "mg" },
      vitamin_a: { qty: 3, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 1.5, unit: "mg" },
      riboflavin: { qty: 0.4, unit: "mg" },
      pyridoxine: { qty: 1.3, unit: "mg" },
      niacin: { qty: 8.3, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 4.5, unit: "g" },
      monounsaturated: { qty: 18.5, unit: "g" },
      polyunsaturated: { qty: 23.1, unit: "g" },
    },
  },
  {
    id: 90008,
    description: "Abóbora, semente",
    category: "Sementes",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 559, unit: "kcal" },
      protein: { qty: 30.2, unit: "g" },
      lipid: { qty: 49.1, unit: "g" },
      carbohydrate: { qty: 10.7, unit: "g" },
      fiber: { qty: 6.0, unit: "g" },
      calcium: { qty: 46, unit: "mg" },
      iron: { qty: 8.8, unit: "mg" },
      sodium: { qty: 7, unit: "mg" },
      potassium: { qty: 809, unit: "mg" },
      magnesium: { qty: 592, unit: "mg" },
      phosphorus: { qty: 1233, unit: "mg" },
      zinc: { qty: 7.8, unit: "mg" },
      copper: { qty: 1.3, unit: "mg" },
      manganese: { qty: 4.5, unit: "mg" },
      vitamin_c: { qty: 1.9, unit: "mg" },
      vitamin_a: { qty: 16, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.3, unit: "mg" },
      riboflavin: { qty: 0.2, unit: "mg" },
      pyridoxine: { qty: 0.1, unit: "mg" },
      niacin: { qty: 4.9, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 8.7, unit: "g" },
      monounsaturated: { qty: 16.2, unit: "g" },
      polyunsaturated: { qty: 21.0, unit: "g" },
    },
  },
  {
    id: 90009,
    description: "Granola, tradicional",
    category: "Cereais",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 421, unit: "kcal" },
      protein: { qty: 10.4, unit: "g" },
      lipid: { qty: 12.5, unit: "g" },
      carbohydrate: { qty: 68.0, unit: "g" },
      fiber: { qty: 6.8, unit: "g" },
      calcium: { qty: 39, unit: "mg" },
      iron: { qty: 3.6, unit: "mg" },
      sodium: { qty: 26, unit: "mg" },
      potassium: { qty: 318, unit: "mg" },
      magnesium: { qty: 107, unit: "mg" },
      phosphorus: { qty: 308, unit: "mg" },
      zinc: { qty: 2.7, unit: "mg" },
      copper: { qty: 0.4, unit: "mg" },
      manganese: { qty: 2.4, unit: "mg" },
      vitamin_c: { qty: 0.5, unit: "mg" },
      vitamin_a: { qty: 1, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.4, unit: "mg" },
      riboflavin: { qty: 0.2, unit: "mg" },
      pyridoxine: { qty: 0.2, unit: "mg" },
      niacin: { qty: 1.2, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 2.1, unit: "g" },
      monounsaturated: { qty: 5.3, unit: "g" },
      polyunsaturated: { qty: 3.8, unit: "g" },
    },
  },
  {
    id: 90010,
    description: "Açaí, polpa congelada",
    category: "Frutas",
    base_qty: 100,
    base_unit: "g",
    attributes: {
      energy: { qty: 58, unit: "kcal" },
      protein: { qty: 0.8, unit: "g" },
      lipid: { qty: 3.9, unit: "g" },
      carbohydrate: { qty: 6.2, unit: "g" },
      fiber: { qty: 2.6, unit: "g" },
      calcium: { qty: 35, unit: "mg" },
      iron: { qty: 1.5, unit: "mg" },
      sodium: { qty: 0, unit: "mg" },
      potassium: { qty: 124, unit: "mg" },
      magnesium: { qty: 17, unit: "mg" },
      phosphorus: { qty: 16, unit: "mg" },
      zinc: { qty: 0.3, unit: "mg" },
      copper: { qty: 0.2, unit: "mg" },
      manganese: { qty: 2.2, unit: "mg" },
      vitamin_c: { qty: 9.6, unit: "mg" },
      vitamin_a: { qty: 74, unit: "µg" },
      retinol: { qty: 0, unit: "µg" },
      thiamine: { qty: 0.1, unit: "mg" },
      riboflavin: { qty: 0.1, unit: "mg" },
      pyridoxine: { qty: 0.1, unit: "mg" },
      niacin: { qty: 0.4, unit: "mg" },
      cholesterol: { qty: 0, unit: "mg" },
      saturated: { qty: 1.0, unit: "g" },
      monounsaturated: { qty: 2.1, unit: "g" },
      polyunsaturated: { qty: 0.6, unit: "g" },
    },
  },
];

// Normalize text for search matching
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Search extra foods
function searchExtraFoods(query: string) {
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  
  return EXTRA_FOODS.filter(food => {
    const desc = normalizeText(food.description);
    return queryWords.some(qWord => desc.includes(qWord));
  });
}

// Get extra food by ID
function getExtraFoodById(id: number) {
  return EXTRA_FOODS.find(f => f.id === id);
}

// Convert IBGE food format to our standard format
interface IbgeFood {
  code?: string;
  description?: string;
  category?: { description?: string };
  attributes?: {
    energy?: { qty: number; unit: string };
    protein?: { qty: number; unit: string };
    lipid?: { qty: number; unit: string };
    carbohydrate?: { qty: number; unit: string };
    fiber?: { qty: number; unit: string };
    calcium?: { qty: number; unit: string };
    iron?: { qty: number; unit: string };
    sodium?: { qty: number; unit: string };
    potassium?: { qty: number; unit: string };
    magnesium?: { qty: number; unit: string };
    phosphorus?: { qty: number; unit: string };
    zinc?: { qty: number; unit: string };
    copper?: { qty: number; unit: string };
    vitamin_c?: { qty: number; unit: string };
    retinol?: { qty: number; unit: string };
    thiamine?: { qty: number; unit: string };
    riboflavin?: { qty: number; unit: string };
    pyridoxine?: { qty: number; unit: string };
    niacin?: { qty: number; unit: string };
    cholesterol?: { qty: number; unit: string };
    saturated?: { qty: number; unit: string };
    monounsaturated?: { qty: number; unit: string };
    polyunsaturated?: { qty: number; unit: string };
  };
}

function normalizeIbgeFood(food: IbgeFood) {
  // IBGE uses different field names, normalize to our format
  const code = food.code || '';
  return {
    id: parseInt(code) || Math.random() * 100000 + 80000,
    description: food.description || '',
    category: food.category?.description || 'IBGE',
    base_qty: 100,
    base_unit: 'g',
    source: 'IBGE',
    attributes: food.attributes || {},
  };
}

// Search IBGE API
async function searchIbge(query: string): Promise<unknown[]> {
  try {
    // IBGE API uses pagination, fetch first page with search
    const response = await fetch(`${IBGE_API_BASE}/foods?search=${encodeURIComponent(query)}&paginate=20`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    
    if (!response.ok) {
      console.warn(`IBGE API returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // IBGE API returns paginated data
    const foods = data.data || data || [];
    return Array.isArray(foods) ? foods.map(normalizeIbgeFood) : [];
  } catch (e) {
    console.warn("IBGE API error:", e);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const query = url.searchParams.get("q");
    const foodId = url.searchParams.get("id");

    // Handle search
    if (action === "search" && query) {
      console.log(`Searching for: ${query}`);
      
      // 1. Search in extra foods first (highest priority)
      const extraResults = searchExtraFoods(query);
      console.log(`Found ${extraResults.length} in EXTRA_FOODS`);
      
      // 2. Search TACO API
      let tacoResults: unknown[] = [];
      try {
        const tacoUrl = `${TACO_API_BASE}/foods?q=${encodeURIComponent(query)}`;
        const response = await fetch(tacoUrl, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          tacoResults = await response.json() || [];
        }
      } catch (e) {
        console.warn("TACO API error:", e);
      }
      console.log(`Found ${tacoResults.length} in TACO`);
      
      // 3. Search IBGE API as fallback (for foods not in TACO)
      let ibgeResults: unknown[] = [];
      try {
        ibgeResults = await searchIbge(query);
      } catch (e) {
        console.warn("IBGE search failed:", e);
      }
      console.log(`Found ${ibgeResults.length} in IBGE`);
      
      // Combine results: Extra > TACO > IBGE (avoiding duplicates by description)
      const seenDescriptions = new Set<string>();
      const combined: unknown[] = [];
      
      for (const food of [...extraResults, ...tacoResults, ...ibgeResults]) {
        const desc = normalizeText((food as { description?: string }).description || '');
        if (!seenDescriptions.has(desc)) {
          seenDescriptions.add(desc);
          combined.push(food);
        }
      }
      
      console.log(`Total combined: ${combined.length} foods`);
      
      return new Response(JSON.stringify(combined), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Handle get by ID
    if (action === "get" && foodId) {
      const id = parseInt(foodId);
      
      // Check if it's an extra food ID (90000+)
      if (id >= 90000) {
        const extraFood = getExtraFoodById(id);
        if (extraFood) {
          return new Response(JSON.stringify(extraFood), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      // Check if it's an IBGE code (usually 7 digits starting with high numbers)
      if (id >= 1000000) {
        try {
          const response = await fetch(`${IBGE_API_BASE}/food/${foodId}`, {
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok) {
            const data = await response.json();
            return new Response(JSON.stringify(normalizeIbgeFood(data)), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.warn("IBGE get error:", e);
        }
      }
      
      // Otherwise fetch from TACO API
      try {
        const tacoUrl = `${TACO_API_BASE}/foods/${foodId}`;
        const response = await fetch(tacoUrl, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("TACO get error:", e);
      }
      
      return new Response(
        JSON.stringify({ error: "Food not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle all foods
    if (action === "all") {
      let tacoFoods: unknown[] = [];
      
      try {
        const tacoUrl = `${TACO_API_BASE}/foods`;
        const response = await fetch(tacoUrl, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          tacoFoods = await response.json() || [];
        }
      } catch (e) {
        console.warn("TACO API error:", e);
      }
      
      const combined = [...EXTRA_FOODS, ...tacoFoods];
      return new Response(JSON.stringify(combined), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'search', 'get', or 'all'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in taco-proxy:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
