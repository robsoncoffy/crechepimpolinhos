import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MealSuggestionsProps {
  mealType: "breakfast" | "morning_snack" | "lunch" | "bottle" | "snack" | "pre_dinner" | "dinner";
  menuType: "bercario" | "maternal";
  dayOfWeek: number;
  onSelect: (suggestion: string) => void;
}

export function MealSuggestions({ mealType, menuType, dayOfWeek, onSelect }: MealSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    if (suggestions.length > 0) {
      setShowSuggestions(!showSuggestions);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("menu-ai-suggestions", {
        body: { mealType, menuType, dayOfWeek },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err: any) {
      console.error("Error fetching suggestions:", err);
      toast.error("Erro ao buscar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={fetchSuggestions}
        disabled={loading}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            IA
          </>
        )}
      </Button>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border rounded-lg shadow-lg p-2 space-y-1">
          <p className="text-xs text-muted-foreground px-2 pb-1 border-b mb-2">
            Clique para usar:
          </p>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors"
            >
              {suggestion}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            className="w-full mt-2 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Novas sugestões
          </Button>
        </div>
      )}
    </div>
  );
}
