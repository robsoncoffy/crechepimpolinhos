import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  EmailFolderSidebar, 
  EmailConversationList, 
  EmailMessageView,
  type EmailFolder 
} from "./email";

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

export function GhlEmailsTab() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<EmailConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EmailConversation | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFolder, setActiveFolder] = useState<EmailFolder>("all");
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Load starred from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ghl-email-starred");
    if (saved) {
      setStarredIds(new Set(JSON.parse(saved)));
    }
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "list", limit: "100" },
      });

      if (error) throw error;
      
      // Include ALL conversations that have email associated
      // GHL mixes channels, so we show any conversation where contact has email
      const allConvs = data?.conversations || [];
      const emailConvs = allConvs.filter((conv: any) => {
        return !!conv.email;
      });
      
      // Add starred info
      const withStarred = emailConvs.map((conv: any) => ({
        ...conv,
        isStarred: starredIds.has(conv.id),
      }));
      
      setConversations(withStarred);
    } catch (error) {
      console.error("Error fetching email conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "messages", conversationId },
      });

      if (error) throw error;
      
      setMessages(data?.messages || []);
      setContactInfo(data?.contact || null);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 60000);
    return () => clearInterval(interval);
  }, [starredIds]);

  const handleSelectConversation = (conv: EmailConversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
    setContactInfo(null);
  };

  const handleToggleStar = (conversationId: string) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      localStorage.setItem("ghl-email-starred", JSON.stringify([...next]));
      return next;
    });
    
    // Update conversations list
    setConversations(prev => 
      prev.map(c => 
        c.id === conversationId 
          ? { ...c, isStarred: !c.isStarred }
          : c
      )
    );
  };

  const handleSendReply = async (message: string) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase.functions.invoke("ghl-conversations", {
        body: {
          action: "send",
          conversationId: selectedConversation.id,
          contactId: selectedConversation.contactId,
          message,
          type: "Email",
        },
      });

      if (error) throw error;

      await fetchMessages(selectedConversation.id);
      
      toast({
        title: "E-mail enviado",
        description: "Sua resposta foi enviada com sucesso.",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o e-mail. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Filter conversations based on active folder
  const filteredConversations = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    switch (activeFolder) {
      case "unread":
        return conversations.filter(c => c.unreadCount > 0);
      case "sent":
        // Show conversations where last message was outbound
        return conversations.filter(c => c.lastDirection === "outbound");
      case "starred":
        return conversations.filter(c => c.isStarred);
      case "recent":
        return conversations.filter(c => {
          const msgDate = new Date(c.lastMessageDate).getTime();
          return msgDate > oneDayAgo;
        });
      default:
        return conversations;
    }
  }, [conversations, activeFolder]);

  // Calculate folder counts
  const folderCounts = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      all: conversations.length,
      unread: conversations.filter(c => c.unreadCount > 0).length,
      sent: conversations.filter(c => c.lastDirection === "outbound").length,
      starred: conversations.filter(c => c.isStarred).length,
      recent: conversations.filter(c => {
        const msgDate = new Date(c.lastMessageDate).getTime();
        return msgDate > oneDayAgo;
      }).length,
    };
  }, [conversations]);

  // Mobile: Show either list or conversation
  if (isMobile && selectedConversation) {
    return (
      <EmailMessageView
        contact={contactInfo || { 
          name: selectedConversation.contactName, 
          email: selectedConversation.email 
        }}
        messages={messages}
        loading={loadingMessages}
        onBack={handleBack}
        onSendReply={handleSendReply}
        showBackButton
      />
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] flex gap-4">
      {/* Folder Sidebar - hidden on mobile */}
      {!isMobile && (
        <EmailFolderSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          counts={folderCounts}
        />
      )}

      {/* Email List */}
      <Card className={cn(
        "w-80 shrink-0 flex flex-col",
        isMobile && selectedConversation && "hidden"
      )}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-pimpo-yellow" />
              E-mails
              {filteredConversations.length > 0 && (
                <Badge variant="secondary">{filteredConversations.length}</Badge>
              )}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
          
          {/* Mobile folder tabs */}
          {isMobile && (
            <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
              {(["all", "unread", "starred", "recent"] as EmailFolder[]).map(folder => (
                <Button
                  key={folder}
                  variant={activeFolder === folder ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFolder(folder)}
                  className="text-xs whitespace-nowrap"
                >
                  {folder === "all" && "Todos"}
                  {folder === "unread" && `Não Lidos (${folderCounts.unread})`}
                  {folder === "starred" && "Favoritos"}
                  {folder === "recent" && "Recentes"}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <EmailConversationList
            conversations={filteredConversations}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            onToggleStar={handleToggleStar}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Email Content */}
      <EmailMessageView
        contact={selectedConversation ? (contactInfo || { 
          name: selectedConversation.contactName, 
          email: selectedConversation.email 
        }) : null}
        messages={messages}
        loading={loadingMessages}
        onBack={handleBack}
        onSendReply={handleSendReply}
        showBackButton={isMobile}
      />
    </div>
  );
}
