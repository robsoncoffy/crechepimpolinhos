import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Loader2, Apple, Plus, X, Info } from 'lucide-react';
import { useTacoSearch, TacoFood, formatNutrient, nutrientLabels } from '@/hooks/useTacoSearch';

interface SelectedFood extends TacoFood {
  quantity: number;
}

interface TacoFoodSearchProps {
  selectedFoods: SelectedFood[];
  onFoodsChange: (foods: SelectedFood[]) => void;
}

export function TacoFoodSearch({ selectedFoods, onFoodsChange }: TacoFoodSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const { foods, loading, error, searchFoods } = useTacoSearch();

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (query.length >= 2) {
      const timer = setTimeout(() => {
        searchFoods(query);
      }, 300);
      setDebounceTimer(timer);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [query, searchFoods]);

  const addFood = (food: TacoFood) => {
    const exists = selectedFoods.find(f => f.id === food.id);
    if (!exists) {
      onFoodsChange([...selectedFoods, { ...food, quantity: 100 }]);
    }
    setQuery('');
  };

  const removeFood = (foodId: number) => {
    onFoodsChange(selectedFoods.filter(f => f.id !== foodId));
  };

  const updateQuantity = (foodId: number, quantity: number) => {
    onFoodsChange(
      selectedFoods.map(f =>
        f.id === foodId ? { ...f, quantity: Math.max(1, quantity) } : f
      )
    );
  };

  // Calculate totals based on quantities
  const totals = selectedFoods.reduce(
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

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar alimento na tabela TACO..."
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {query.length >= 2 && foods.length > 0 && (
        <Card>
          <ScrollArea className="max-h-48">
            <div className="p-2 space-y-1">
              {foods.slice(0, 10).map((food) => (
                <button
                  key={food.id}
                  onClick={() => addFood(food)}
                  className="w-full text-left p-2 rounded hover:bg-muted flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{food.description}</p>
                    <p className="text-xs text-muted-foreground">{food.category}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Selected Foods */}
      {selectedFoods.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Alimentos selecionados:</h4>
          <div className="space-y-2">
            {selectedFoods.map((food) => (
              <div
                key={food.id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
              >
                <Apple className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{food.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={food.quantity}
                      onChange={(e) => updateQuantity(food.id, parseInt(e.target.value) || 0)}
                      className="w-20 h-7 text-xs"
                      min={1}
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Info className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{food.description}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(food.attributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">{nutrientLabels[key] || key}</span>
                          <span className="font-medium">{formatNutrient(value)}</span>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeFood(food.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutritional Summary */}
      {selectedFoods.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Resumo Nutricional da Refeição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <div className="text-center p-2 bg-background/60 rounded">
                <p className="text-xs text-muted-foreground">Energia</p>
                <p className="font-bold text-accent-foreground">{totals.energy.toFixed(1)} kcal</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded">
                <p className="text-xs text-muted-foreground">Proteínas</p>
                <p className="font-bold text-destructive">{totals.protein.toFixed(1)} g</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded">
                <p className="text-xs text-muted-foreground">Carboidratos</p>
                <p className="font-bold text-primary">{totals.carbohydrate.toFixed(1)} g</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded">
                <p className="text-xs text-muted-foreground">Lipídios</p>
                <p className="font-bold text-secondary-foreground">{totals.lipid.toFixed(1)} g</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded">
                <p className="text-xs text-muted-foreground">Fibras</p>
                <p className="font-bold text-primary">{totals.fiber.toFixed(1)} g</p>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
              <Badge variant="outline" className="justify-center text-xs">
                Ca: {totals.calcium.toFixed(1)}mg
              </Badge>
              <Badge variant="outline" className="justify-center text-xs">
                Fe: {totals.iron.toFixed(1)}mg
              </Badge>
              <Badge variant="outline" className="justify-center text-xs">
                Na: {totals.sodium.toFixed(1)}mg
              </Badge>
              <Badge variant="outline" className="justify-center text-xs">
                Vit C: {totals.vitamin_c.toFixed(1)}mg
              </Badge>
              <Badge variant="outline" className="justify-center text-xs">
                Vit A: {totals.vitamin_a.toFixed(1)}µg
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact display for showing selected foods summary
export function TacoFoodSummary({ foods }: { foods: SelectedFood[] }) {
  if (foods.length === 0) return null;

  const totals = foods.reduce(
    (acc, food) => {
      const multiplier = food.quantity / food.base_qty;
      const attrs = food.attributes;
      
      return {
        energy: acc.energy + (attrs.energy?.qty || 0) * multiplier,
        protein: acc.protein + (attrs.protein?.qty || 0) * multiplier,
        carbohydrate: acc.carbohydrate + (attrs.carbohydrate?.qty || 0) * multiplier,
        lipid: acc.lipid + (attrs.lipid?.qty || 0) * multiplier,
      };
    },
    { energy: 0, protein: 0, carbohydrate: 0, lipid: 0 }
  );

  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary" className="text-xs">
        {totals.energy.toFixed(0)} kcal
      </Badge>
      <Badge variant="secondary" className="text-xs">
        P: {totals.protein.toFixed(1)}g
      </Badge>
      <Badge variant="secondary" className="text-xs">
        C: {totals.carbohydrate.toFixed(1)}g
      </Badge>
      <Badge variant="secondary" className="text-xs">
        L: {totals.lipid.toFixed(1)}g
      </Badge>
    </div>
  );
}
