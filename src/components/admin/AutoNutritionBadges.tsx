import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';

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

interface AutoNutritionBadgesProps {
  totals: NutritionTotals | null;
  loading?: boolean;
  foodCount?: number;
  showExtended?: boolean;
}

export function AutoNutritionBadges({ totals, loading, foodCount = 0, showExtended = true }: AutoNutritionBadgesProps) {
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
      
      {/* Nutrients grid - always show extended by default */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Energia:</span>
          <span className="font-medium">{totals.energy.toFixed(0)} kcal</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Proteínas:</span>
          <span className="font-medium">{totals.protein.toFixed(1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Carboidratos:</span>
          <span className="font-medium">{totals.carbohydrate.toFixed(1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lipídios:</span>
          <span className="font-medium">{totals.lipid.toFixed(1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fibras:</span>
          <span className="font-medium">{totals.fiber.toFixed(1)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cálcio:</span>
          <span className="font-medium">{totals.calcium.toFixed(1)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ferro:</span>
          <span className="font-medium">{totals.iron.toFixed(2)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sódio:</span>
          <span className="font-medium">{totals.sodium.toFixed(1)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vitamina C:</span>
          <span className="font-medium">{totals.vitamin_c.toFixed(1)} mg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vitamina A:</span>
          <span className="font-medium">{totals.vitamin_a.toFixed(1)} µg</span>
        </div>
      </div>
    </div>
  );
}
