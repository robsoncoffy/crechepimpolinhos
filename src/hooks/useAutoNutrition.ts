import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TacoFood } from './useTacoSearch';

interface SelectedFood extends TacoFood {
  quantity: number;
}

interface NutritionTotals {
  energy: number;
  protein: number;
  lipid: number;
  carbohydrate: number;
  fiber: number;
  calcium: number;
  iron: number;
  sodium: number;
  vitamin_c: number;
  vitamin_a: number;
}

interface AutoNutritionResult {
  foods: SelectedFood[];
  totals: NutritionTotals | null;
  parsed?: { name: string; quantity: number; unit: string }[];
}

export function useAutoNutrition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, AutoNutritionResult>>(new Map());

  const parseNutrition = useCallback(async (mealDescription: string): Promise<AutoNutritionResult> => {
    const trimmed = mealDescription.trim();
    
    // Check cache first
    if (cacheRef.current.has(trimmed)) {
      return cacheRef.current.get(trimmed)!;
    }

    if (trimmed.length < 3) {
      return { foods: [], totals: null };
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-meal-nutrition', {
        body: { mealDescription: trimmed }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result: AutoNutritionResult = {
        foods: data?.foods || [],
        totals: data?.totals || null,
        parsed: data?.parsed || []
      };

      // Cache the result
      cacheRef.current.set(trimmed, result);
      
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { foods: [], totals: null };
      }
      const message = err instanceof Error ? err.message : 'Erro ao analisar nutrição';
      setError(message);
      console.error('Auto nutrition error:', err);
      return { foods: [], totals: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    parseNutrition,
    loading,
    error,
    clearCache
  };
}
