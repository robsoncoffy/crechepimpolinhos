import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Sparkles, Apple } from 'lucide-react';
import type { IngredientWithNutrition, NutritionTotals } from '@/components/admin/IngredientQuantityEditor';

interface IngredientNutritionTableProps {
  ingredients: IngredientWithNutrition[];
  totals: NutritionTotals | null;
  loading?: boolean;
}

const format = (value: unknown, decimals: number) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toFixed(decimals);
};

// Individual ingredient nutrition display
function IngredientNutritionCard({ ingredient }: { ingredient: IngredientWithNutrition }) {
  const [expanded, setExpanded] = useState(false);
  
  const multiplier = ingredient.quantity / 100;
  
  // Calculate actual values based on quantity
  const getValue = (value: number | undefined) => (value || 0) * multiplier;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="border border-border/60 rounded-lg bg-background/60 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Apple className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">{ingredient.name}</span>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                {ingredient.quantity}g
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(getValue(ingredient.energy), 0)} kcal
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t border-border/40">
            {/* Macros */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Energia:</span>
                <span className="font-medium">{format(getValue(ingredient.energy), 0)} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proteínas:</span>
                <span className="font-medium">{format(getValue(ingredient.protein), 1)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carboidratos:</span>
                <span className="font-medium">{format(getValue(ingredient.carbohydrate), 1)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lipídios:</span>
                <span className="font-medium">{format(getValue(ingredient.lipid), 1)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fibras:</span>
                <span className="font-medium">{format(getValue(ingredient.fiber), 1)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cálcio:</span>
                <span className="font-medium">{format(getValue(ingredient.calcium), 1)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ferro:</span>
                <span className="font-medium">{format(getValue(ingredient.iron), 2)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sódio:</span>
                <span className="font-medium">{format(getValue(ingredient.sodium), 1)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vitamina C:</span>
                <span className="font-medium">{format(getValue(ingredient.vitamin_c), 1)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vitamina A:</span>
                <span className="font-medium">{format(getValue(ingredient.vitamin_a), 1)} µg</span>
              </div>
            </div>

            {/* Detailed sections */}
            <div className="mt-3 space-y-2">
              {/* Minerals */}
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">Minerais</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potássio:</span>
                    <span>{format(getValue(ingredient.potassium), 1)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Magnésio:</span>
                    <span>{format(getValue(ingredient.magnesium), 1)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fósforo:</span>
                    <span>{format(getValue(ingredient.phosphorus), 1)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zinco:</span>
                    <span>{format(getValue(ingredient.zinc), 2)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cobre:</span>
                    <span>{format(getValue(ingredient.copper), 2)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manganês:</span>
                    <span>{format(getValue(ingredient.manganese), 2)} mg</span>
                  </div>
                </div>
              </div>

              {/* Vitamins */}
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">Vitaminas</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retinol:</span>
                    <span>{format(getValue(ingredient.retinol), 0)} µg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vit. B1 (Tiamina):</span>
                    <span>{format(getValue(ingredient.thiamine), 2)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vit. B2 (Riboflavina):</span>
                    <span>{format(getValue(ingredient.riboflavin), 2)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vit. B3 (Niacina):</span>
                    <span>{format(getValue(ingredient.niacin), 2)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vit. B6 (Piridoxina):</span>
                    <span>{format(getValue(ingredient.pyridoxine), 2)} mg</span>
                  </div>
                </div>
              </div>

              {/* Lipids */}
              <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">Lipídios</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Colesterol:</span>
                    <span>{format(getValue(ingredient.cholesterol), 0)} mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gord. saturada:</span>
                    <span>{format(getValue(ingredient.saturated), 2)} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gord. monoinsaturada:</span>
                    <span>{format(getValue(ingredient.monounsaturated), 2)} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gord. poli-insaturada:</span>
                    <span>{format(getValue(ingredient.polyunsaturated), 2)} g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Totals nutrition table
function TotalsNutritionTable({ totals, foodCount }: { totals: NutritionTotals; foodCount: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-primary/20">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-primary">Informação Nutricional (TACO)</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {foodCount} alimento(s)
        </Badge>
      </div>
      
      {/* Base nutrients */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Energia:</span>
          <span className="font-medium">{format(totals.energy, 0)} kcal</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Proteínas:</span>
          <span className="font-medium">{format(totals.protein, 1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Carboidratos:</span>
          <span className="font-medium">{format(totals.carbohydrate, 1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lipídios:</span>
          <span className="font-medium">{format(totals.lipid, 1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fibras:</span>
          <span className="font-medium">{format(totals.fiber, 1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cálcio:</span>
          <span className="font-medium">{format(totals.calcium, 1)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ferro:</span>
          <span className="font-medium">{format(totals.iron, 2)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sódio:</span>
          <span className="font-medium">{format(totals.sodium, 1)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vitamina C:</span>
          <span className="font-medium">{format(totals.vitamin_c, 1)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vitamina A:</span>
          <span className="font-medium">{format(totals.vitamin_a, 1)} µg</span>
        </div>
      </div>

      {/* Expand/collapse button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs mt-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>Menos nutrientes <ChevronUp className="ml-1 h-3 w-3" /></>
        ) : (
          <>Mais nutrientes <ChevronDown className="ml-1 h-3 w-3" /></>
        )}
      </Button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Minerals */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] font-semibold text-muted-foreground mb-2">Minerais</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Potássio:</span>
                <span>{format(totals.potassium, 1)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Magnésio:</span>
                <span>{format(totals.magnesium, 1)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fósforo:</span>
                <span>{format(totals.phosphorus, 1)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zinco:</span>
                <span>{format(totals.zinc, 2)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cobre:</span>
                <span>{format(totals.copper, 2)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manganês:</span>
                <span>{format(totals.manganese, 2)} mg</span>
              </div>
            </div>
          </div>

          {/* Vitamins */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] font-semibold text-muted-foreground mb-2">Vitaminas</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retinol:</span>
                <span>{format(totals.retinol, 0)} µg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vit. B1 (Tiamina):</span>
                <span>{format(totals.thiamine, 2)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vit. B2 (Riboflavina):</span>
                <span>{format(totals.riboflavin, 2)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vit. B3 (Niacina):</span>
                <span>{format(totals.niacin, 2)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vit. B6 (Piridoxina):</span>
                <span>{format(totals.pyridoxine, 2)} mg</span>
              </div>
            </div>
          </div>

          {/* Lipids */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] font-semibold text-muted-foreground mb-2">Lipídios</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Colesterol:</span>
                <span>{format(totals.cholesterol, 0)} mg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gord. saturada:</span>
                <span>{format(totals.saturated, 2)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gord. monoinsaturada:</span>
                <span>{format(totals.monounsaturated, 2)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gord. poli-insaturada:</span>
                <span>{format(totals.polyunsaturated, 2)} g</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function IngredientNutritionTable({ ingredients, totals, loading }: IngredientNutritionTableProps) {
  const [showIngredients, setShowIngredients] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Calculando informações nutricionais...
      </div>
    );
  }

  if (!totals || ingredients.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Ingredients breakdown (collapsible) */}
      <Collapsible open={showIngredients} onOpenChange={setShowIngredients}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between h-9">
            <span className="flex items-center gap-2">
              <Apple className="w-4 h-4" />
              Nutrição por ingrediente ({ingredients.length})
            </span>
            {showIngredients ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 space-y-2">
          {ingredients.map((ingredient, index) => (
            <IngredientNutritionCard key={index} ingredient={ingredient} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Totals table */}
      <TotalsNutritionTable totals={totals} foodCount={ingredients.length} />
    </div>
  );
}
