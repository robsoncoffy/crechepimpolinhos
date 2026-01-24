import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
}

export function AutoNutritionBadges({ totals, loading, foodCount = 0 }: AutoNutritionBadgesProps) {
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <Sparkles className="w-3 h-3 text-primary mr-0.5" />
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary font-medium">
              {totals.energy.toFixed(0)} kcal
            </Badge>
            <Badge variant="outline" className="text-xs">
              P: {totals.protein.toFixed(1)}g
            </Badge>
            <Badge variant="outline" className="text-xs">
              C: {totals.carbohydrate.toFixed(1)}g
            </Badge>
            <Badge variant="outline" className="text-xs">
              L: {totals.lipid.toFixed(1)}g
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Calculado automaticamente via TACO
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <span>Energia: {totals.energy.toFixed(0)} kcal</span>
              <span>Proteínas: {totals.protein.toFixed(1)}g</span>
              <span>Carboidratos: {totals.carbohydrate.toFixed(1)}g</span>
              <span>Lipídios: {totals.lipid.toFixed(1)}g</span>
              <span>Fibras: {totals.fiber.toFixed(1)}g</span>
              <span>Cálcio: {totals.calcium.toFixed(1)}mg</span>
              <span>Ferro: {totals.iron.toFixed(1)}mg</span>
              <span>Sódio: {totals.sodium.toFixed(1)}mg</span>
              <span>Vit. C: {totals.vitamin_c.toFixed(1)}mg</span>
              <span>Vit. A: {totals.vitamin_a.toFixed(1)}µg</span>
            </div>
            {foodCount > 0 && (
              <p className="text-muted-foreground mt-1 pt-1 border-t">
                {foodCount} alimento(s) identificado(s)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
