import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Message {
  content: string;
  sender_id: string;
}

interface QuickReplySuggestionsProps {
  messages: Message[];
  currentUserId: string;
  childName: string;
  onSelect: (suggestion: string) => void;
}

export function QuickReplySuggestions({
  messages,
  currentUserId,
  childName,
  onSelect,
}: QuickReplySuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Auto-fetch suggestions when a new parent message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const isFromParent = lastMessage.sender_id !== currentUserId;
    
    // If new message from parent, clear old suggestions and fetch new ones
    if (isFromParent && messages.length !== lastMessageCount) {
      setLastMessageCount(messages.length);
      setSuggestions([]);
      fetchSuggestions();
    }
  }, [messages, currentUserId, lastMessageCount]);

  const fetchSuggestions = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Format messages for the API
      const formattedMessages = messages.slice(-6).map((m) => ({
        role: m.sender_id === currentUserId ? "teacher" : "parent",
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("chat-reply-suggestions", {
        body: { messages: formattedMessages, childName },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error("Error fetching suggestions:", err);
      // Don't show error toast to avoid being annoying
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setSuggestions([]);
  };

  // Don't render if no messages or last message is from teacher
  const lastMessage = messages[messages.length - 1];
  const shouldShow = lastMessage && lastMessage.sender_id !== currentUserId;

  if (!shouldShow && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">Respostas rápidas</span>
        {!loading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            className="h-5 w-5 p-0 ml-auto"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Gerando sugestões...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={fetchSuggestions}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          Gerar sugestões de resposta
        </button>
      )}
    </div>
  );
}
