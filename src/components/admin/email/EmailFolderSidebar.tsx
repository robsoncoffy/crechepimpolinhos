import { cn } from "@/lib/utils";
import { 
  Inbox, 
  Send, 
  Star, 
  Clock,
  Mail,
  MailOpen
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type EmailFolder = "all" | "unread" | "sent" | "starred" | "recent";

interface EmailFolderSidebarProps {
  activeFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  counts: {
    all: number;
    unread: number;
    sent: number;
    starred: number;
    recent: number;
  };
}

const folders = [
  { id: "all" as EmailFolder, label: "Todos", icon: Mail },
  { id: "unread" as EmailFolder, label: "Não Lidos", icon: MailOpen },
  { id: "sent" as EmailFolder, label: "Enviados", icon: Send },
  { id: "starred" as EmailFolder, label: "Favoritos", icon: Star },
  { id: "recent" as EmailFolder, label: "Recentes", icon: Clock },
];

export function EmailFolderSidebar({ 
  activeFolder, 
  onFolderChange, 
  counts 
}: EmailFolderSidebarProps) {
  return (
    <div className="w-48 shrink-0 border-r bg-muted/30 p-2 space-y-1">
      {folders.map((folder) => {
        const Icon = folder.icon;
        const count = counts[folder.id];
        const isActive = activeFolder === folder.id;
        
        return (
          <button
            key={folder.id}
            onClick={() => onFolderChange(folder.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              "hover:bg-muted",
              isActive && "bg-primary/10 text-primary font-medium"
            )}
          >
            <Icon className={cn(
              "h-4 w-4",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />
            <span className="flex-1 text-left">{folder.label}</span>
            {count > 0 && (
              <Badge 
                variant={folder.id === "unread" ? "destructive" : "secondary"}
                className="text-xs px-1.5 py-0"
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
