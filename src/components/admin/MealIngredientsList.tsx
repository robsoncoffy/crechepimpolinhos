import { Scale, AlertTriangle } from 'lucide-react';
import { IngredientWithNutrition } from '@/types/nutrition';

interface MealIngredientsListProps {
  qtyString?: string | null;
  ingredients?: IngredientWithNutrition[];
  className?: string;
}

/**
 * Displays a list of ingredients for the cook.
 * Prioritizes structured `ingredients` if available, otherwise falls back to parsing `qtyString`.
 */
export function MealIngredientsList({ qtyString, ingredients, className = '' }: MealIngredientsListProps) {
  // Case 1: Structured ingredients available (Preferred)
  if (ingredients && ingredients.length > 0) {
    return (
      <div className={`mt-2 pt-2 border-t border-current/10 ${className}`}>
        <div className="flex items-center gap-1 text-[10px] font-medium opacity-70 mb-1">
          <Scale className="w-3 h-3" />
          Quantidades:
        </div>
        <div className="flex flex-wrap gap-1">
          {ingredients.map((ing, idx) => {
            const isNotFound = ing.category === 'Não encontrado';
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${isNotFound
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-white/50 border-transparent'
                  }`}
                title={isNotFound ? "Ingrediente não encontrado na tabela nutricional oficial" : undefined}
              >
                {isNotFound && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                <span className="font-medium">{ing.name}</span>
                <span className="opacity-70">
                  {ing.quantity}{ing.unit}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Case 2: Legacy string parsing (Fallback)
  if (!qtyString || qtyString.trim().length === 0) {
    return null;
  }

  // Parse the string format: "Ingrediente: Xg, Ingrediente2: Yg"
  const parsedIngredients = qtyString.split(',').map(item => {
    const trimmed = item.trim();
    const match = trimmed.match(/^(.+?):\s*(\d+(?:\.\d+)?)\s*(g|ml|un)?$/i);
    if (match) {
      return {
        name: match[1].trim(),
        quantity: parseFloat(match[2]),
        unit: match[3] || 'g'
      };
    }
    // Fallback: try simple format like "100g" or "150ml"
    const simpleMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(g|ml|un)?$/i);
    if (simpleMatch) {
      return {
        name: 'Porção',
        quantity: parseFloat(simpleMatch[1]),
        unit: simpleMatch[2] || 'g'
      };
    }
    return null;
  }).filter(Boolean);

  if (parsedIngredients.length === 0) {
    return null;
  }

  return (
    <div className={`mt-2 pt-2 border-t border-current/10 ${className}`}>
      <div className="flex items-center gap-1 text-[10px] font-medium opacity-70 mb-1">
        <Scale className="w-3 h-3" />
        Quantidades (Texto):
      </div>
      <div className="flex flex-wrap gap-1">
        {parsedIngredients.map((ing, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 text-[11px] bg-white/50 px-1.5 py-0.5 rounded"
          >
            <span className="font-medium">{ing!.name}</span>
            <span className="opacity-70">{ing!.quantity}{ing!.unit}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
