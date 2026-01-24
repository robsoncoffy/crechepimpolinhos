import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="mt-2 space-y-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-wrap items-center gap-1">
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
              {foodCount > 0 && (
                <p className="text-muted-foreground">
                  {foodCount} alimento(s) identificado(s)
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showExtended && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{isOpen ? 'Ocultar' : 'Ver todos'} nutrientes</span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 p-2 bg-muted/30 rounded-md text-[10px] text-muted-foreground space-y-0.5">
              <p><span className="font-medium">Energia:</span> {totals.energy.toFixed(0)} kcal | <span className="font-medium">Proteínas:</span> {totals.protein.toFixed(1)}g | <span className="font-medium">Carboidratos:</span> {totals.carbohydrate.toFixed(1)}g | <span className="font-medium">Lipídios:</span> {totals.lipid.toFixed(1)}g</p>
              <p><span className="font-medium">Fibras:</span> {totals.fiber.toFixed(1)}g | <span className="font-medium">Cálcio:</span> {totals.calcium.toFixed(1)}mg | <span className="font-medium">Ferro:</span> {totals.iron.toFixed(2)}mg | <span className="font-medium">Sódio:</span> {totals.sodium.toFixed(1)}mg</p>
              <p><span className="font-medium">Vit. C:</span> {totals.vitamin_c.toFixed(1)}mg | <span className="font-medium">Vit. A:</span> {totals.vitamin_a.toFixed(1)}µg RAE</p>
              {foodCount > 0 && (
                <p className="pt-1 border-t border-muted text-muted-foreground/70">
                  ✨ {foodCount} alimento(s) identificado(s) via IA/TACO
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
