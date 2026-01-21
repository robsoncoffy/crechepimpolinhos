import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

interface DemoMessage {
  id: string;
  content: string;
  isOwn: boolean;
  sender: string;
}

interface DemoQuickReplySuggestionsProps {
  messages: DemoMessage[];
  childName: string;
  onSelect: (suggestion: string) => void;
}

// Mock AI-generated suggestions based on conversation context
const generateMockSuggestions = (messages: DemoMessage[], childName: string): string[] => {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.isOwn) return [];

  const content = lastMessage.content.toLowerCase();
  const firstName = childName.split(" ")[0];

  // Context-aware suggestions
  if (content.includes("desenvolvimento") || content.includes("como está")) {
    return [
      `${firstName} está evoluindo muito bem! 🌟`,
      `Posso agendar uma conversa para detalhar o progresso.`,
      `Vou preparar um relatório detalhado para você!`,
    ];
  }

  if (content.includes("avaliação") || content.includes("trimestral") || content.includes("quando sai")) {
    return [
      `A avaliação será liberada essa semana! 📋`,
      `Estou finalizando, envio em breve!`,
      `Posso adiantar que ${firstName} está indo muito bem!`,
    ];
  }

  if (content.includes("reunião") || content.includes("encontro") || content.includes("conversar")) {
    return [
      `Claro! Podemos agendar para essa semana 😊`,
      `Qual horário fica melhor para você?`,
      `Tenho disponibilidade quinta ou sexta à tarde.`,
    ];
  }

  if (content.includes("preocup") || content.includes("problema") || content.includes("dificuldade")) {
    return [
      `Vamos conversar sobre isso com calma 💙`,
      `Posso te ligar para conversarmos melhor?`,
      `Não se preocupe, vamos trabalhar juntos nisso!`,
    ];
  }

  if (content.includes("obrigad") || content.includes("agradeço")) {
    return [
      `Por nada! Estamos juntos! 💜`,
      `Sempre às ordens! Qualquer dúvida, estou aqui.`,
      `Conte sempre conosco! 😊`,
    ];
  }

  // Default suggestions
  return [
    `Olá! Vou verificar e te retorno em breve 😊`,
    `Obrigada por entrar em contato!`,
    `Qualquer dúvida, estou à disposição!`,
  ];
};

export function DemoQuickReplySuggestions({
  messages,
  childName,
  onSelect,
}: DemoQuickReplySuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Auto-fetch suggestions when a new parent message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const isFromParent = !lastMessage.isOwn;
    
    // If new message from parent, fetch new suggestions
    if (isFromParent && messages.length !== lastMessageCount) {
      setLastMessageCount(messages.length);
      setSuggestions([]);
      fetchSuggestions();
    }
  }, [messages, lastMessageCount]);

  const fetchSuggestions = () => {
    if (loading) return;
    
    setLoading(true);
    // Simulate AI loading time
    setTimeout(() => {
      const newSuggestions = generateMockSuggestions(messages, childName);
      setSuggestions(newSuggestions);
      setLoading(false);
    }, 800);
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setSuggestions([]);
  };

  // Don't render if no messages or last message is from self
  const lastMessage = messages[messages.length - 1];
  const shouldShow = lastMessage && !lastMessage.isOwn;

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
