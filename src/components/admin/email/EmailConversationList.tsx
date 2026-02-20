import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Mail, Inbox, Star } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmailConversation {
  id: string;
  contactId: string;
  contactName: string;
  email?: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
  isStarred?: boolean;
  lastDirection?: "inbound" | "outbound";
}

interface EmailConversationListProps {
  conversations: EmailConversation[];
  selectedId: string | null;
  onSelect: (conversation: EmailConversation) => void;
  onToggleStar?: (conversationId: string) => void;
  loading: boolean;
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

export function EmailConversationList({
  conversations,
  selectedId,
  onSelect,
  onToggleStar,
  loading
}: EmailConversationListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum e-mail encontrado</p>
        <p className="text-sm mt-1">E-mails aparecerão aqui</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "relative group",
              selectedId === conv.id && "bg-muted"
            )}
          >
            <button
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                conv.unreadCount > 0 && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                  conv.unreadCount > 0 
                    ? "bg-primary/20" 
                    : "bg-pimpo-yellow/20"
                )}>
                  <Mail className={cn(
                    "h-5 w-5",
                    conv.unreadCount > 0 
                      ? "text-primary" 
                      : "text-pimpo-yellow"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "truncate",
                      conv.unreadCount > 0 ? "font-semibold" : "font-medium"
                    )}>
                      {conv.contactName}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatMessageDate(conv.lastMessageDate)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.email}
                  </p>
                  <p className={cn(
                    "text-sm truncate mt-1",
                    conv.unreadCount > 0 
                      ? "text-foreground" 
                      : "text-muted-foreground"
                  )}>
                    {conv.lastDirection === "outbound" && (
                      <span className="text-primary mr-1">→</span>
                    )}
                    {conv.lastMessage || "Sem mensagens"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge variant="destructive" className="mt-1">
                      {conv.unreadCount} não lido{conv.unreadCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
            
            {/* Star button */}
            {onToggleStar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(conv.id);
                }}
                className={cn(
                  "absolute top-4 right-12 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                  conv.isStarred && "opacity-100"
                )}
              >
                <Star className={cn(
                  "h-4 w-4",
                  conv.isStarred 
                    ? "fill-pimpo-yellow text-pimpo-yellow" 
                    : "text-muted-foreground hover:text-pimpo-yellow"
                )} />
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
