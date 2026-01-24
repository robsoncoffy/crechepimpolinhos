import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChildAllergy {
  childName: string;
  allergies: string;
}

interface AllergyCheckBadgeProps {
  mealText: string;
  childrenWithAllergies: ChildAllergy[];
}

// Common allergen keywords to check against
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  leite: ["leite", "queijo", "iogurte", "manteiga", "nata", "creme de leite", "lactose", "whey"],
  ovo: ["ovo", "ovos", "gema", "clara", "maionese"],
  gluten: ["trigo", "pão", "macarrão", "biscoito", "bolo", "farinha", "glúten", "aveia"],
  amendoim: ["amendoim", "pasta de amendoim"],
  castanhas: ["castanha", "nozes", "amêndoas", "avelã", "pistache"],
  soja: ["soja", "tofu", "edamame", "molho shoyu"],
  peixe: ["peixe", "atum", "sardinha", "salmão", "bacalhau", "tilápia"],
  frutosdomar: ["camarão", "lagosta", "caranguejo", "marisco", "ostra", "lula"],
  morango: ["morango"],
  kiwi: ["kiwi"],
  abacaxi: ["abacaxi"],
  mel: ["mel"],
};

export function AllergyCheckBadge({ mealText, childrenWithAllergies }: AllergyCheckBadgeProps) {
  if (!mealText || childrenWithAllergies.length === 0) return null;

  const mealLower = mealText.toLowerCase();
  const conflicts: { child: string; allergen: string }[] = [];

  childrenWithAllergies.forEach((child) => {
    if (!child.allergies) return;
    
    const childAllergens = child.allergies.toLowerCase();
    
    // Check each allergen category
    Object.entries(ALLERGEN_KEYWORDS).forEach(([allergenType, keywords]) => {
      // Check if child is allergic to this category
      const isAllergic = keywords.some(kw => childAllergens.includes(kw)) || 
                         childAllergens.includes(allergenType);
      
      if (isAllergic) {
        // Check if meal contains this allergen
        const mealContains = keywords.some(kw => mealLower.includes(kw));
        if (mealContains) {
          conflicts.push({
            child: child.childName,
            allergen: allergenType,
          });
        }
      }
    });
  });

  if (conflicts.length === 0) return null;

  // Group by allergen
  const groupedConflicts = conflicts.reduce((acc, c) => {
    if (!acc[c.allergen]) acc[c.allergen] = [];
    if (!acc[c.allergen].includes(c.child)) {
      acc[c.allergen].push(c.child);
    }
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className="gap-1 cursor-help animate-pulse"
          >
            <AlertTriangle className="w-3 h-3" />
            {conflicts.length} alerta{conflicts.length > 1 ? "s" : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs space-y-2">
            <p className="font-medium flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3 h-3" />
              Conflito de Alergia Detectado
            </p>
            <div className="space-y-1">
              {Object.entries(groupedConflicts).map(([allergen, children]) => (
                <div key={allergen} className="border-t pt-1">
                  <p className="font-medium capitalize">{allergen}:</p>
                  <p className="text-muted-foreground">
                    {children.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
