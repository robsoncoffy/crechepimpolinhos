import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  Mail, 
  ArrowLeft, 
  Loader2, 
  Inbox,
  Reply
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmailMessage {
  id: string;
  body: string;
  dateAdded: string;
  direction: "inbound" | "outbound";
  subject?: string;
}

interface ContactInfo {
  name: string;
  email?: string;
}

interface EmailMessageViewProps {
  contact: ContactInfo | null;
  messages: EmailMessage[];
  loading: boolean;
  onBack?: () => void;
  onSendReply: (message: string) => Promise<void>;
  showBackButton?: boolean;
}

const formatMessageDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, "HH:mm", { locale: ptBR });
    } else if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    }
  } catch {
    return "";
  }
};

export function EmailMessageView({
  contact,
  messages,
  loading,
  onBack,
  onSendReply,
  showBackButton = false
}: EmailMessageViewProps) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      await onSendReply(newMessage.trim());
      setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Inbox className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Selecione um e-mail</p>
          <p className="text-sm">Escolha uma conversa para visualizar os e-mails</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="h-10 w-10 rounded-full bg-pimpo-yellow/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-pimpo-yellow" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {contact.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {contact.email}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum e-mail encontrado
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg border p-4",
                  msg.direction === "outbound"
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={msg.direction === "outbound" ? "default" : "secondary"}>
                    {msg.direction === "outbound" ? "Enviado" : "Recebido"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(msg.dateAdded)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-muted/30 space-y-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua resposta..."
          disabled={sending}
          className="min-h-[100px]"
        />
        <Button 
          onClick={handleSend} 
          disabled={sending || !newMessage.trim()}
          className="w-full"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Reply className="h-4 w-4 mr-2" />
          )}
          Responder E-mail
        </Button>
      </div>
    </Card>
  );
}
