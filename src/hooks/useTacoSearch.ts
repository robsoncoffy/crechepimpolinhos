import { useState, useCallback } from 'react';

export interface TacoFood {
  id: number;
  description: string;
  category: string;
  base_qty: number;
  base_unit: string;
  attributes: {
    energy?: { qty: number; unit: string } | null;
    protein?: { qty: number; unit: string } | null;
    lipid?: { qty: number; unit: string } | null;
    carbohydrate?: { qty: number; unit: string } | null;
    fiber?: { qty: number; unit: string } | null;
    calcium?: { qty: number; unit: string } | null;
    iron?: { qty: number; unit: string } | null;
    sodium?: { qty: number; unit: string } | null;
    potassium?: { qty: number; unit: string } | null;
    vitamin_c?: { qty: number; unit: string } | null;
    vitamin_a?: { qty: number; unit: string } | null;
    cholesterol?: { qty: number; unit: string } | null;
    saturated?: { qty: number; unit: string } | null;
    magnesium?: { qty: number; unit: string } | null;
    phosphorus?: { qty: number; unit: string } | null;
    zinc?: { qty: number; unit: string } | null;
  };
}

interface TacoSearchResult {
  foods: TacoFood[];
  loading: boolean;
  error: string | null;
  searchFoods: (query: string) => Promise<void>;
  getFoodById: (id: number) => Promise<TacoFood | null>;
}

// Use Edge Function proxy to avoid CORS issues
const TACO_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/taco-proxy`;

export function useTacoSearch(): TacoSearchResult {
  const [foods, setFoods] = useState<TacoFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchFoods = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setFoods([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${TACO_PROXY_URL}?action=search&q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar alimentos');
      }

      const data = await response.json();
      setFoods(data || []);
    } catch (err) {
      console.error('TACO API error:', err);
      setError('Erro ao buscar dados nutricionais');
      setFoods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getFoodById = useCallback(async (id: number): Promise<TacoFood | null> => {
    try {
      const response = await fetch(`${TACO_PROXY_URL}?action=get&id=${id}`);
      
      if (!response.ok) {
        throw new Error('Alimento não encontrado');
      }

      return await response.json();
    } catch (err) {
      console.error('TACO API error:', err);
      return null;
    }
  }, []);

  return {
    foods,
    loading,
    error,
    searchFoods,
    getFoodById,
  };
}

// Utility function to format nutrient value
export function formatNutrient(value: { qty: number; unit: string } | null | undefined): string {
  if (!value || value.qty === null || value.qty === undefined) return '-';
  return `${value.qty.toFixed(2)} ${value.unit}`;
}

// Nutrient labels in Portuguese
export const nutrientLabels: Record<string, string> = {
  energy: 'Energia',
  protein: 'Proteínas',
  lipid: 'Lipídios',
  carbohydrate: 'Carboidratos',
  fiber: 'Fibra',
  calcium: 'Cálcio',
  iron: 'Ferro',
  sodium: 'Sódio',
  potassium: 'Potássio',
  vitamin_c: 'Vitamina C',
  vitamin_a: 'Vitamina A',
  cholesterol: 'Colesterol',
  saturated: 'Gordura Saturada',
  magnesium: 'Magnésio',
  phosphorus: 'Fósforo',
  zinc: 'Zinco',
};
