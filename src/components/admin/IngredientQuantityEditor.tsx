import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Scale, Trash2, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface IngredientWithNutrition extends ParsedIngredient {
  id?: number;
  description?: string;
  energy?: number;
  protein?: number;
  lipid?: number;
  carbohydrate?: number;
  fiber?: number;
  calcium?: number;
  iron?: number;
  sodium?: number;
  vitamin_c?: number;
  vitamin_a?: number;
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

interface IngredientQuantityEditorProps {
  mealDescription: string;
  ingredients: IngredientWithNutrition[];
  onIngredientsChange: (ingredients: IngredientWithNutrition[]) => void;
  onTotalsCalculated: (totals: NutritionTotals | null, ingredients?: IngredientWithNutrition[]) => void;
  loading?: boolean;
}

export function IngredientQuantityEditor({
  mealDescription,
  ingredients,
  onIngredientsChange,
  onTotalsCalculated,
  loading = false
}: IngredientQuantityEditorProps) {
  const [localIngredients, setLocalIngredients] = useState<IngredientWithNutrition[]>(ingredients);
  const [calculating, setCalculating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastDescriptionRef = useRef<string>('');

  // Sync with external ingredients
  useEffect(() => {
    setLocalIngredients(ingredients);
  }, [ingredients]);

  // Parse ingredients when meal description changes
  useEffect(() => {
    if (mealDescription === lastDescriptionRef.current) return;
    if (mealDescription.trim().length < 3) {
      setLocalIngredients([]);
      onIngredientsChange([]);
      onTotalsCalculated(null, []);
      return;
    }
    
    // Debounce parsing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      parseIngredients(mealDescription);
    }, 800);

    lastDescriptionRef.current = mealDescription;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mealDescription]);

  const parseIngredients = async (description: string) => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-meal-nutrition', {
        body: { 
          mealDescription: description,
          returnIngredients: true 
        }
      });

      if (error) throw error;

      const parsedIngredients: IngredientWithNutrition[] = (data?.foods || []).map((food: any) => ({
        name: food.description || food.name,
        quantity: food.quantity || 100,
        unit: 'g',
        id: food.id,
        description: food.description,
        energy: food.attributes?.energy?.qty || 0,
        protein: food.attributes?.protein?.qty || 0,
        lipid: food.attributes?.lipid?.qty || 0,
        carbohydrate: food.attributes?.carbohydrate?.qty || 0,
        fiber: food.attributes?.fiber?.qty || 0,
        calcium: food.attributes?.calcium?.qty || 0,
        iron: food.attributes?.iron?.qty || 0,
        sodium: food.attributes?.sodium?.qty || 0,
        vitamin_c: food.attributes?.vitamin_c?.qty || 0,
        vitamin_a: food.attributes?.vitamin_a?.qty || 0,
      }));

      setLocalIngredients(parsedIngredients);
      onIngredientsChange(parsedIngredients);

      // Always emit totals along with the ingredient list (avoids race with setState in parent)
      onTotalsCalculated(data?.totals ?? null, parsedIngredients);
    } catch (err) {
      console.error('Error parsing ingredients:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleQuantityChange = (index: number, newQty: string) => {
    const qty = parseFloat(newQty) || 0;
    const updated = localIngredients.map((ing, i) => 
      i === index ? { ...ing, quantity: qty } : ing
    );
    setLocalIngredients(updated);
    onIngredientsChange(updated);
    recalculateTotals(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = localIngredients.filter((_, i) => i !== index);
    setLocalIngredients(updated);
    onIngredientsChange(updated);
    recalculateTotals(updated);
  };

  const recalculateTotals = useCallback((items: IngredientWithNutrition[]) => {
    if (items.length === 0) {
      onTotalsCalculated(null, []);
      return;
    }

    const totals = items.reduce((acc, item) => {
      // TACO values are per 100g, so multiply by quantity/100
      const multiplier = item.quantity / 100;
      return {
        energy: acc.energy + (item.energy || 0) * multiplier,
        protein: acc.protein + (item.protein || 0) * multiplier,
        lipid: acc.lipid + (item.lipid || 0) * multiplier,
        carbohydrate: acc.carbohydrate + (item.carbohydrate || 0) * multiplier,
        fiber: acc.fiber + (item.fiber || 0) * multiplier,
        calcium: acc.calcium + (item.calcium || 0) * multiplier,
        iron: acc.iron + (item.iron || 0) * multiplier,
        sodium: acc.sodium + (item.sodium || 0) * multiplier,
        vitamin_c: acc.vitamin_c + (item.vitamin_c || 0) * multiplier,
        vitamin_a: acc.vitamin_a + (item.vitamin_a || 0) * multiplier,
      };
    }, {
      energy: 0, protein: 0, lipid: 0, carbohydrate: 0, fiber: 0,
      calcium: 0, iron: 0, sodium: 0, vitamin_c: 0, vitamin_a: 0
    });

    onTotalsCalculated(totals, items);
  }, [onTotalsCalculated]);

  const handleRefresh = () => {
    if (mealDescription.trim().length >= 3) {
      lastDescriptionRef.current = '';
      parseIngredients(mealDescription);
    }
  };

  if (loading || calculating) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Identificando ingredientes...</span>
      </div>
    );
  }

  if (localIngredients.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-accent/30 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Quantidades por ingrediente
          </span>
          <Badge variant="outline" className="text-[10px]">
            {localIngredients.length} itens
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleRefresh}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reidentificar
        </Button>
      </div>

      <div className="space-y-2">
        {localIngredients.map((ingredient, index) => (
          <div key={index} className="flex items-center gap-2 bg-background/50 p-2 rounded-md">
            <span className="flex-1 text-xs truncate" title={ingredient.description || ingredient.name}>
              {ingredient.name}
            </span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                step="5"
                value={ingredient.quantity}
                onChange={(e) => handleQuantityChange(index, e.target.value)}
                className="w-16 h-7 text-xs text-center"
              />
              <span className="text-xs text-muted-foreground w-6">g</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => handleRemoveIngredient(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        💡 Ajuste a gramagem de cada ingrediente para cálculo nutricional preciso
      </p>
    </div>
  );
}