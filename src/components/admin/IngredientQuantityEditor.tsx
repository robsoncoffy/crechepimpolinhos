import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Scale, Trash2, RefreshCw, Search, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface IngredientWithNutrition extends ParsedIngredient {
  id?: number;
  description?: string;
  // Macros
  energy?: number;
  protein?: number;
  lipid?: number;
  carbohydrate?: number;
  fiber?: number;
  // Minerals
  calcium?: number;
  iron?: number;
  sodium?: number;
  potassium?: number;
  magnesium?: number;
  phosphorus?: number;
  zinc?: number;
  copper?: number;
  manganese?: number;
  // Vitamins
  vitamin_c?: number;
  vitamin_a?: number;
  retinol?: number;
  thiamine?: number;
  riboflavin?: number;
  pyridoxine?: number;
  niacin?: number;
  // Lipid composition
  cholesterol?: number;
  saturated?: number;
  monounsaturated?: number;
  polyunsaturated?: number;
}

export interface NutritionTotals {
  // Macros
  energy: number;
  protein: number;
  lipid: number;
  carbohydrate: number;
  fiber: number;
  // Minerals
  calcium: number;
  iron: number;
  sodium: number;
  potassium: number;
  magnesium: number;
  phosphorus: number;
  zinc: number;
  copper: number;
  manganese: number;
  // Vitamins
  vitamin_c: number;
  vitamin_a: number;
  retinol: number;
  thiamine: number;
  riboflavin: number;
  pyridoxine: number;
  niacin: number;
  // Lipid composition
  cholesterol: number;
  saturated: number;
  monounsaturated: number;
  polyunsaturated: number;
}

const EMPTY_TOTALS: NutritionTotals = {
  energy: 0, protein: 0, lipid: 0, carbohydrate: 0, fiber: 0,
  calcium: 0, iron: 0, sodium: 0, potassium: 0, magnesium: 0,
  phosphorus: 0, zinc: 0, copper: 0, manganese: 0,
  vitamin_c: 0, vitamin_a: 0, retinol: 0, thiamine: 0,
  riboflavin: 0, pyridoxine: 0, niacin: 0,
  cholesterol: 0, saturated: 0, monounsaturated: 0, polyunsaturated: 0
};

interface TacoSearchResult {
  id: number;
  description: string;
  category: string;
  attributes: {
    energy?: { qty: number };
    protein?: { qty: number };
    lipid?: { qty: number };
    carbohydrate?: { qty: number };
    fiber?: { qty: number };
    calcium?: { qty: number };
    iron?: { qty: number };
    sodium?: { qty: number };
    potassium?: { qty: number };
    magnesium?: { qty: number };
    phosphorus?: { qty: number };
    zinc?: { qty: number };
    copper?: { qty: number };
    manganese?: { qty: number };
    vitamin_c?: { qty: number };
    vitamin_a?: { qty: number };
    retinol?: { qty: number };
    thiamine?: { qty: number };
    riboflavin?: { qty: number };
    pyridoxine?: { qty: number };
    niacin?: { qty: number };
    cholesterol?: { qty: number };
    saturated?: { qty: number };
    monounsaturated?: { qty: number };
    polyunsaturated?: { qty: number };
  };
}

interface IngredientQuantityEditorProps {
  mealDescription: string;
  ingredients: IngredientWithNutrition[];
  onIngredientsChange: (ingredients: IngredientWithNutrition[]) => void;
  onTotalsCalculated: (totals: NutritionTotals | null, ingredients?: IngredientWithNutrition[]) => void;
  loading?: boolean;
}

// Component for searching and replacing an ingredient
function IngredientSearchReplace({
  currentIngredient,
  onReplace,
  onCancel,
}: {
  currentIngredient: IngredientWithNutrition;
  onReplace: (newIngredient: IngredientWithNutrition) => void;
  onCancel: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<TacoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('taco-search', {
        body: { query }
      });

      if (error) throw error;
      setResults(data?.foods || []);
    } catch (err) {
      console.error('Error searching TACO:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, handleSearch]);

  const handleSelect = (food: TacoSearchResult) => {
    const newIngredient: IngredientWithNutrition = {
      name: food.description,
      quantity: currentIngredient.quantity,
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
      potassium: food.attributes?.potassium?.qty || 0,
      magnesium: food.attributes?.magnesium?.qty || 0,
      phosphorus: food.attributes?.phosphorus?.qty || 0,
      zinc: food.attributes?.zinc?.qty || 0,
      copper: food.attributes?.copper?.qty || 0,
      manganese: food.attributes?.manganese?.qty || 0,
      vitamin_c: food.attributes?.vitamin_c?.qty || 0,
      vitamin_a: food.attributes?.vitamin_a?.qty || 0,
      retinol: food.attributes?.retinol?.qty || 0,
      thiamine: food.attributes?.thiamine?.qty || 0,
      riboflavin: food.attributes?.riboflavin?.qty || 0,
      pyridoxine: food.attributes?.pyridoxine?.qty || 0,
      niacin: food.attributes?.niacin?.qty || 0,
      cholesterol: food.attributes?.cholesterol?.qty || 0,
      saturated: food.attributes?.saturated?.qty || 0,
      monounsaturated: food.attributes?.monounsaturated?.qty || 0,
      polyunsaturated: food.attributes?.polyunsaturated?.qty || 0,
    };
    onReplace(newIngredient);
  };

  return (
    <div className="w-72 p-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alimento..."
            className="h-8 pl-7 text-xs"
            autoFocus
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {searching && (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Buscando...
        </div>
      )}

      {results.length > 0 && (
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {results.map((food) => (
              <button
                key={food.id}
                onClick={() => handleSelect(food)}
                className="w-full text-left p-2 rounded hover:bg-accent/50 transition-colors"
              >
                <p className="text-xs font-medium truncate">{food.description}</p>
                <p className="text-[10px] text-muted-foreground">{food.category}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {searchQuery.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">Nenhum alimento encontrado</p>
      )}
    </div>
  );
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
        // Macros
        energy: food.attributes?.energy?.qty || 0,
        protein: food.attributes?.protein?.qty || 0,
        lipid: food.attributes?.lipid?.qty || 0,
        carbohydrate: food.attributes?.carbohydrate?.qty || 0,
        fiber: food.attributes?.fiber?.qty || 0,
        // Minerals
        calcium: food.attributes?.calcium?.qty || 0,
        iron: food.attributes?.iron?.qty || 0,
        sodium: food.attributes?.sodium?.qty || 0,
        potassium: food.attributes?.potassium?.qty || 0,
        magnesium: food.attributes?.magnesium?.qty || 0,
        phosphorus: food.attributes?.phosphorus?.qty || 0,
        zinc: food.attributes?.zinc?.qty || 0,
        copper: food.attributes?.copper?.qty || 0,
        manganese: food.attributes?.manganese?.qty || 0,
        // Vitamins
        vitamin_c: food.attributes?.vitamin_c?.qty || 0,
        vitamin_a: food.attributes?.vitamin_a?.qty || 0,
        retinol: food.attributes?.retinol?.qty || 0,
        thiamine: food.attributes?.thiamine?.qty || 0,
        riboflavin: food.attributes?.riboflavin?.qty || 0,
        pyridoxine: food.attributes?.pyridoxine?.qty || 0,
        niacin: food.attributes?.niacin?.qty || 0,
        // Lipid composition
        cholesterol: food.attributes?.cholesterol?.qty || 0,
        saturated: food.attributes?.saturated?.qty || 0,
        monounsaturated: food.attributes?.monounsaturated?.qty || 0,
        polyunsaturated: food.attributes?.polyunsaturated?.qty || 0,
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

  const handleReplaceIngredient = (index: number, newIngredient: IngredientWithNutrition) => {
    const updated = localIngredients.map((ing, i) => 
      i === index ? newIngredient : ing
    );
    setLocalIngredients(updated);
    onIngredientsChange(updated);
    recalculateTotals(updated);
    setEditingIndex(null);
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
        // Macros
        energy: acc.energy + (item.energy || 0) * multiplier,
        protein: acc.protein + (item.protein || 0) * multiplier,
        lipid: acc.lipid + (item.lipid || 0) * multiplier,
        carbohydrate: acc.carbohydrate + (item.carbohydrate || 0) * multiplier,
        fiber: acc.fiber + (item.fiber || 0) * multiplier,
        // Minerals
        calcium: acc.calcium + (item.calcium || 0) * multiplier,
        iron: acc.iron + (item.iron || 0) * multiplier,
        sodium: acc.sodium + (item.sodium || 0) * multiplier,
        potassium: acc.potassium + (item.potassium || 0) * multiplier,
        magnesium: acc.magnesium + (item.magnesium || 0) * multiplier,
        phosphorus: acc.phosphorus + (item.phosphorus || 0) * multiplier,
        zinc: acc.zinc + (item.zinc || 0) * multiplier,
        copper: acc.copper + (item.copper || 0) * multiplier,
        manganese: acc.manganese + (item.manganese || 0) * multiplier,
        // Vitamins
        vitamin_c: acc.vitamin_c + (item.vitamin_c || 0) * multiplier,
        vitamin_a: acc.vitamin_a + (item.vitamin_a || 0) * multiplier,
        retinol: acc.retinol + (item.retinol || 0) * multiplier,
        thiamine: acc.thiamine + (item.thiamine || 0) * multiplier,
        riboflavin: acc.riboflavin + (item.riboflavin || 0) * multiplier,
        pyridoxine: acc.pyridoxine + (item.pyridoxine || 0) * multiplier,
        niacin: acc.niacin + (item.niacin || 0) * multiplier,
        // Lipid composition
        cholesterol: acc.cholesterol + (item.cholesterol || 0) * multiplier,
        saturated: acc.saturated + (item.saturated || 0) * multiplier,
        monounsaturated: acc.monounsaturated + (item.monounsaturated || 0) * multiplier,
        polyunsaturated: acc.polyunsaturated + (item.polyunsaturated || 0) * multiplier,
      };
    }, { ...EMPTY_TOTALS });

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
    <div className="mt-2 p-3 bg-accent/30 rounded-lg border border-border min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Scale className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            Quantidades por ingrediente
          </span>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {localIngredients.length} itens
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs flex-shrink-0"
          onClick={handleRefresh}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Reidentificar</span>
          <span className="sm:hidden">↻</span>
        </Button>
      </div>

      <div className="space-y-2">
        {localIngredients.map((ingredient, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] items-center gap-2 bg-background/50 p-2 rounded-md min-w-0"
          >
            <span className="text-xs truncate min-w-0" title={ingredient.description || ingredient.name}>
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
            <Popover 
              open={editingIndex === index} 
              onOpenChange={(open) => setEditingIndex(open ? index : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                  title="Buscar alimento correto"
                >
                  <Search className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="end">
                <IngredientSearchReplace
                  currentIngredient={ingredient}
                  onReplace={(newIng) => handleReplaceIngredient(index, newIng)}
                  onCancel={() => setEditingIndex(null)}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive justify-self-end"
              onClick={() => handleRemoveIngredient(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        💡 Clique na 🔍 para buscar e substituir ingredientes identificados incorretamente
      </p>
    </div>
  );
}
