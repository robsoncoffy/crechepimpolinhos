import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface SuggestionItem {
  description: string;
  qty: string;
}

interface MealSuggestionsProps {
  mealType: "breakfast" | "morning_snack" | "lunch" | "bottle" | "snack" | "pre_dinner" | "dinner";
  menuType: "bercario" | "maternal";
  dayOfWeek: number;
  onSelect: (suggestion: string, qty?: string) => void;
}

export function MealSuggestions({ mealType, menuType, dayOfWeek, onSelect }: MealSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ingredient, setIngredient] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const fetchSuggestions = async (withIngredient?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("menu-ai-suggestions", {
        body: { mealType, menuType, dayOfWeek, ingredient: withIngredient || undefined },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Handle both old format (strings) and new format (objects)
      const rawSuggestions = data.suggestions || [];
      const normalizedSuggestions: SuggestionItem[] = rawSuggestions.map((item: string | SuggestionItem) => {
        if (typeof item === 'string') {
          return { description: item, qty: '' };
        }
        return item;
      });

      setSuggestions(normalizedSuggestions);
    } catch (err: any) {
      console.error("Error fetching suggestions:", err);
      toast.error("Erro ao buscar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: SuggestionItem) => {
    onSelect(suggestion.description, suggestion.qty);
    setOpen(false);
    setSuggestions([]);
    setIngredient("");
  };

  const handleIngredientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingredient.trim()) {
      fetchSuggestions(ingredient.trim());
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSuggestions([]);
      setIngredient("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          IA
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3" sideOffset={4}>
        <div className="space-y-3">
          <form onSubmit={handleIngredientSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Digite um ingrediente (opcional)"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={loading}
              className="h-8 px-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchSuggestions()}
            disabled={loading}
            className="w-full text-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1" />
            )}
            {suggestions.length > 0 ? "Novas sugestões" : "Gerar sugestões automáticas"}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs text-muted-foreground pb-1">
                Clique para usar (com porção):
              </p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center justify-between gap-2"
                >
                  <span className="flex-1 truncate">{suggestion.description}</span>
                  {suggestion.qty && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {suggestion.qty}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
