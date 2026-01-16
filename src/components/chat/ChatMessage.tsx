import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

interface ChatMessageProps {
  content: string;
  timestamp: string;
  isOwn: boolean;
  senderName?: string;
  isRead?: boolean;
}

export function ChatMessage({ content, timestamp, isOwn, senderName, isRead }: ChatMessageProps) {
  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      {!isOwn && senderName && (
        <span className="text-xs text-muted-foreground px-1">{senderName}</span>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
      </div>
      <div className={cn("flex items-center gap-1 px-1", isOwn && "flex-row-reverse")}>
        <span className="text-xs text-muted-foreground">
          {format(new Date(timestamp), "HH:mm", { locale: ptBR })}
        </span>
        {isOwn && (
          <span className="text-muted-foreground">
            {isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-pimpo-blue" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
