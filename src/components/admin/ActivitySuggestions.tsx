import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ActivitySuggestion {
  title: string;
  description: string;
  duration: string;
}

interface MaterialSuggestion {
  name: string;
}

interface ObjectiveSuggestion {
  objective: string;
  bncc_code?: string;
}

interface ActivitySuggestionsProps {
  classType: string;
  dayOfWeek: number;
  activityType: "morning" | "afternoon" | "materials" | "objectives";
  onSelect: (suggestion: string) => void;
}

export function ActivitySuggestions({
  classType,
  dayOfWeek,
  activityType,
  onSelect,
}: ActivitySuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const fetchSuggestions = async (withTheme?: string) => {
    setLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("activity-ai-suggestions", {
        body: {
          classType,
          dayOfWeek,
          activityType,
          theme: withTheme || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: any) => {
    let text: string;

    if (activityType === "morning" || activityType === "afternoon") {
      text = `${suggestion.title}\n${suggestion.description} (${suggestion.duration})`;
    } else if (activityType === "materials") {
      text = typeof suggestion === "string" ? suggestion : suggestion.name;
    } else {
      text = suggestion.bncc_code
        ? `${suggestion.objective} (${suggestion.bncc_code})`
        : suggestion.objective;
    }

    onSelect(text);
    setOpen(false);
    setSuggestions([]);
    setTheme("");
  };

  const handleThemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theme.trim()) {
      fetchSuggestions(theme.trim());
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSuggestions([]);
      setTheme("");
    }
  };

  const getPlaceholder = () => {
    switch (activityType) {
      case "morning":
      case "afternoon":
        return "Ex: Primavera, Animais...";
      case "materials":
        return "Ex: Arte, Música...";
      case "objectives":
        return "Ex: Linguagem, Motor...";
      default:
        return "Digite um tema...";
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        >
          <Wand2 className="w-3.5 h-3.5 mr-1" />
          IA
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
            <Sparkles className="w-4 h-4" />
            Sugestões com IA
          </div>

          <form onSubmit={handleThemeSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={getPlaceholder()}
              className="h-8 text-sm"
              disabled={loading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !theme.trim()}
              className="h-8 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fetchSuggestions()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Gerar sugestões automáticas
          </Button>

          {suggestions.length > 0 && (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelect(suggestion)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-purple-50 hover:border-purple-200 transition-colors"
                  >
                    {activityType === "morning" || activityType === "afternoon" ? (
                      <div>
                        <p className="font-medium text-sm text-foreground">{suggestion.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-purple-600">
                          <Clock className="w-3 h-3" />
                          {suggestion.duration}
                        </div>
                      </div>
                    ) : activityType === "materials" ? (
                      <p className="text-sm">{typeof suggestion === "string" ? suggestion : suggestion.name}</p>
                    ) : (
                      <div>
                        <p className="text-sm">{suggestion.objective}</p>
                        {suggestion.bncc_code && (
                          <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {suggestion.bncc_code}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
