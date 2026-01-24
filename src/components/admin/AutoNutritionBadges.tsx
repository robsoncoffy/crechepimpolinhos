import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import type { NutritionTotals } from './IngredientQuantityEditor';

type NutrientGroup = 'Minerais' | 'Vitaminas' | 'Lipídios';
type NutrientDef = {
  key: keyof NutritionTotals;
  label: string;
  unit: string;
  decimals: number;
  group: NutrientGroup;
};

const NUTRIENT_DEFS: NutrientDef[] = [
  // Minerals
  { key: 'potassium', label: 'Potássio', unit: 'mg', decimals: 1, group: 'Minerais' },
  { key: 'magnesium', label: 'Magnésio', unit: 'mg', decimals: 1, group: 'Minerais' },
  { key: 'phosphorus', label: 'Fósforo', unit: 'mg', decimals: 1, group: 'Minerais' },
  { key: 'zinc', label: 'Zinco', unit: 'mg', decimals: 2, group: 'Minerais' },
  { key: 'copper', label: 'Cobre', unit: 'mg', decimals: 2, group: 'Minerais' },
  { key: 'manganese', label: 'Manganês', unit: 'mg', decimals: 2, group: 'Minerais' },

  // Vitamins
  { key: 'retinol', label: 'Retinol', unit: 'µg', decimals: 0, group: 'Vitaminas' },
  { key: 'thiamine', label: 'Vit. B1 (Tiamina)', unit: 'mg', decimals: 2, group: 'Vitaminas' },
  { key: 'riboflavin', label: 'Vit. B2 (Riboflavina)', unit: 'mg', decimals: 2, group: 'Vitaminas' },
  { key: 'niacin', label: 'Vit. B3 (Niacina)', unit: 'mg', decimals: 2, group: 'Vitaminas' },
  { key: 'pyridoxine', label: 'Vit. B6 (Piridoxina)', unit: 'mg', decimals: 2, group: 'Vitaminas' },

  // Lipid composition
  { key: 'cholesterol', label: 'Colesterol', unit: 'mg', decimals: 0, group: 'Lipídios' },
  { key: 'saturated', label: 'Gord. saturada', unit: 'g', decimals: 2, group: 'Lipídios' },
  { key: 'monounsaturated', label: 'Gord. monoinsaturada', unit: 'g', decimals: 2, group: 'Lipídios' },
  { key: 'polyunsaturated', label: 'Gord. poli-insaturada', unit: 'g', decimals: 2, group: 'Lipídios' },
];

const GROUP_ORDER: NutrientGroup[] = ['Minerais', 'Vitaminas', 'Lipídios'];

interface AutoNutritionBadgesProps {
  totals: NutritionTotals | null;
  loading?: boolean;
  foodCount?: number;
  showExtended?: boolean;
}

export function AutoNutritionBadges({ totals, loading, foodCount = 0, showExtended = true }: AutoNutritionBadgesProps) {
  const [expanded, setExpanded] = useState<boolean>(showExtended);

  const format = (value: unknown, decimals: number) => {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return n.toFixed(decimals);
  };

  const grouped: Record<NutrientGroup, NutrientDef[]> = {
    Minerais: [],
    Vitaminas: [],
    Lipídios: [],
  };
  for (const def of NUTRIENT_DEFS) grouped[def.group].push(def);

  if (loading) {
    return (
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Calculando nutrientes...</span>
      </div>
    );
  }

  if (!totals) return null;

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-primary/20">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary">Informação Nutricional (TACO)</span>
        {foodCount > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {foodCount} alimento(s)
          </Badge>
        )}
      </div>
      
      {/* Base nutrients (sempre visíveis) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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

      {showExtended && (
        <div className="mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                Menos nutrientes <ChevronUp className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Mais nutrientes <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>

          {expanded && (
            <div className="mt-2 space-y-3">
              {GROUP_ORDER.map((groupName) => (
                <div key={groupName} className="rounded-md border border-border/60 bg-background/40 p-2">
                  <div className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {groupName}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {grouped[groupName].map((d) => (
                      <div key={String(d.key)} className="flex justify-between">
                        <span className="text-muted-foreground">{d.label}:</span>
                        <span className="font-medium">
                          {format((totals as any)?.[d.key], d.decimals)} {d.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
