import { Badge } from '@/components/ui/badge';
import { TacoFood } from '@/hooks/useTacoSearch';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SelectedFood extends TacoFood {
  quantity: number;
}

interface MealNutritionSummaryProps {
  foods: SelectedFood[];
  compact?: boolean;
}

export function MealNutritionSummary({ foods, compact = false }: MealNutritionSummaryProps) {
  if (!foods || foods.length === 0) return null;

  const totals = foods.reduce(
    (acc, food) => {
      const multiplier = food.quantity / food.base_qty;
      const attrs = food.attributes;
      
      return {
        energy: acc.energy + (attrs.energy?.qty || 0) * multiplier,
        protein: acc.protein + (attrs.protein?.qty || 0) * multiplier,
        lipid: acc.lipid + (attrs.lipid?.qty || 0) * multiplier,
        carbohydrate: acc.carbohydrate + (attrs.carbohydrate?.qty || 0) * multiplier,
        fiber: acc.fiber + (attrs.fiber?.qty || 0) * multiplier,
        calcium: acc.calcium + (attrs.calcium?.qty || 0) * multiplier,
        iron: acc.iron + (attrs.iron?.qty || 0) * multiplier,
        sodium: acc.sodium + (attrs.sodium?.qty || 0) * multiplier,
        vitamin_c: acc.vitamin_c + (attrs.vitamin_c?.qty || 0) * multiplier,
        vitamin_a: acc.vitamin_a + (attrs.vitamin_a?.qty || 0) * multiplier,
      };
    },
    {
      energy: 0,
      protein: 0,
      lipid: 0,
      carbohydrate: 0,
      fiber: 0,
      calcium: 0,
      iron: 0,
      sodium: 0,
      vitamin_c: 0,
      vitamin_a: 0,
    }
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
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
              <Info className="w-3 h-3 text-muted-foreground ml-1" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-xs space-y-1">
              <p className="font-medium">Detalhes nutricionais:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>Fibras: {totals.fiber.toFixed(1)}g</span>
                <span>Cálcio: {totals.calcium.toFixed(1)}mg</span>
                <span>Ferro: {totals.iron.toFixed(1)}mg</span>
                <span>Sódio: {totals.sodium.toFixed(1)}mg</span>
                <span>Vit. C: {totals.vitamin_c.toFixed(1)}mg</span>
                <span>Vit. A: {totals.vitamin_a.toFixed(1)}µg</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {foods.length} alimento(s) selecionado(s)
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        📊 Informação Nutricional ({foods.length} item{foods.length > 1 ? 's' : ''})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-background p-2 rounded text-center">
          <span className="text-muted-foreground block">Energia</span>
          <span className="font-bold text-primary">{totals.energy.toFixed(0)} kcal</span>
        </div>
        <div className="bg-background p-2 rounded text-center">
          <span className="text-muted-foreground block">Proteínas</span>
          <span className="font-bold text-destructive">{totals.protein.toFixed(1)}g</span>
        </div>
        <div className="bg-background p-2 rounded text-center">
          <span className="text-muted-foreground block">Carboidratos</span>
          <span className="font-bold text-primary">{totals.carbohydrate.toFixed(1)}g</span>
        </div>
        <div className="bg-background p-2 rounded text-center">
          <span className="text-muted-foreground block">Lipídios</span>
          <span className="font-bold text-secondary-foreground">{totals.lipid.toFixed(1)}g</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2 justify-center">
        <Badge variant="outline" className="text-xs">Fibra: {totals.fiber.toFixed(1)}g</Badge>
        <Badge variant="outline" className="text-xs">Ca: {totals.calcium.toFixed(0)}mg</Badge>
        <Badge variant="outline" className="text-xs">Fe: {totals.iron.toFixed(1)}mg</Badge>
        <Badge variant="outline" className="text-xs">Na: {totals.sodium.toFixed(0)}mg</Badge>
        <Badge variant="outline" className="text-xs">Vit.C: {totals.vitamin_c.toFixed(1)}mg</Badge>
        <Badge variant="outline" className="text-xs">Vit.A: {totals.vitamin_a.toFixed(0)}µg</Badge>
      </div>
    </div>
  );
}
