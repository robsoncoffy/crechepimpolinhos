import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { 
  MessageCircle, 
  RefreshCw, 
  ExternalLink,
  Phone,
  Mail,
  User,
  Send,
  ArrowLeft,
  Smartphone,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  email?: string;
  phone?: string;
  lastMessage: string;
  lastMessageDate: string;
  type: string;
  unreadCount: number;
}

interface Message {
  id: string;
  body: string;
  dateAdded: string;
  direction: "inbound" | "outbound";
  type: string;
  status?: string;
}

interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
}

type LeadChannel = "WhatsApp" | "SMS";

export function GhlConversationsTab() {
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastMessagesUpdate, setLastMessagesUpdate] = useState<Date | null>(null);
  const [lastConversationsUpdate, setLastConversationsUpdate] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousInboundCountRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  const inferLeadChannel = (msgs: Message[], convType?: string): LeadChannel => {
    // Prefer the most recent known message type
    for (let i = msgs.length - 1; i >= 0; i--) {
      const t: unknown = (msgs[i] as any)?.type;

      // Some GHL accounts return numeric codes (e.g. 19/2)
      if (typeof t === "number") {
        if (t === 19) return "WhatsApp";
        if (t === 2) return "SMS";
      }

      if (typeof t === "string") {
        const normalized = t.toLowerCase();
        if (normalized.includes("whatsapp")) return "WhatsApp";
        if (normalized === "sms") return "SMS";
      }
    }

    // Fallback to the conversation type if it is already explicit
    if (convType) {
      const normalized = convType.toLowerCase();
      if (normalized.includes("whatsapp")) return "WhatsApp";
      if (normalized === "sms") return "SMS";
    }

    // Last resort: SMS
    return "SMS";
  };

  const activeLeadChannel: LeadChannel = inferLeadChannel(messages, selectedConversation?.type);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async (showLoadingState = true) => {
    if (showLoadingState && !refreshing) {
      // Don't show loading skeleton on background refresh
    }
    
    setLoadError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "list" },
      });

      if (error) {
        // Handle timeout/slow API gracefully
        if (error.message?.includes("tempo limite") || error.message?.includes("timeout")) {
          setLoadError("A API está lenta. Clique para tentar novamente.");
          return;
        }
        throw error;
      }
      
      // Filter to show only SMS/WhatsApp conversations (not emails)
      const chatConvs = (data?.conversations || []).filter(
        (conv: any) => conv.type?.toLowerCase() !== "email"
      );
      setConversations(chatConvs);
      setLastConversationsUpdate(new Date());
      setLoadError(null);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      if (conversations.length === 0) {
        setLoadError("Não foi possível carregar conversas. Clique para tentar novamente.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, conversations.length]);

  const fetchMessages = useCallback(async (conversationId: string, isPolling = false) => {
    if (!isPolling) {
      setLoadingMessages(true);
    }
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "messages", conversationId },
      });

      if (error) throw error;
      
      const newMessages: Message[] = data?.messages || [];
      
      // Detect new inbound messages for notification
      const newInboundCount = newMessages.filter(m => m.direction === "inbound").length;
      if (isPolling && newInboundCount > previousInboundCountRef.current) {
        playNotificationSound();
      }
      previousInboundCountRef.current = newInboundCount;
      
      setMessages(newMessages);
      setContactInfo(data?.contact || null);
      setLastMessagesUpdate(new Date());
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      if (!isPolling) {
        setLoadingMessages(false);
      }
    }
  }, [playNotificationSound]);

  useEffect(() => {
    fetchConversations();
    
    // Refresh conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    
    // Also refresh when window/tab regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchConversations();
      }
    };
    
    const handleFocus = () => {
      fetchConversations();
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchConversations]);

  // Auto-refresh messages when a conversation is selected (every 10 seconds)
  useEffect(() => {
    if (!selectedConversation) {
      previousInboundCountRef.current = 0;
      return;
    }

    const interval = setInterval(() => {
      fetchMessages(selectedConversation.id, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConversation?.id, fetchMessages]);

  const handleSelectConversation = (conv: Conversation) => {
    // Clear previous conversation state to avoid inferring the wrong channel
    // while the new conversation messages are still loading.
    setMessages([]);
    setContactInfo(null);
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
    setNewMessage("");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: {
          action: "send",
          conversationId: selectedConversation.id,
          contactId: selectedConversation.contactId,
          message: newMessage.trim(),
          // IMPORTANT: Many conversations come as TYPE_PHONE; infer the real channel (WhatsApp vs SMS)
          // from the last messages to prevent sending SMS when the lead is on WhatsApp.
          type: activeLeadChannel,
        },
      });

      if (error) throw error;
      
      // Check if the response contains an error from the edge function
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (!data?.success) {
        throw new Error("Falha ao enviar mensagem");
      }

      setNewMessage("");
      // Refresh messages after sending
      await fetchMessages(selectedConversation.id);
      setTimeout(scrollToBottom, 100);
      
      toast({
        title: "Mensagem enviada",
        description: "Sua resposta foi enviada com sucesso.",
      });
    } catch (error) {
      console.error("Error sending message:", error);

      const details = error instanceof Error ? error.message : "";
      toast({
        title: "Erro ao enviar",
        description: details
          ? details
          : "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "whatsapp":
        return <Smartphone className="h-4 w-4 text-pimpo-green" />;
      case "sms":
        return <Phone className="h-4 w-4 text-primary" />;
      case "email":
        return <Mail className="h-4 w-4 text-pimpo-yellow" />;
      default:
        return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

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

  // Mobile: Show either list or conversation
  if (isMobile && selectedConversation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold">{contactInfo?.name || selectedConversation.contactName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getChannelIcon(activeLeadChannel)}
              {activeLeadChannel}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        <Card className="flex-1">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="p-4 space-y-3">
              {loadingMessages ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-3/4" />
                ))
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem encontrada
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.direction === "outbound" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        msg.direction === "outbound"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        msg.direction === "outbound" 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      )}>
                        {formatMessageDate(msg.dateAdded)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t bg-muted/30">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyDown={handleKeyDown}
                disabled={sending || loadingMessages}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={sending || loadingMessages || !newMessage.trim()}
                size="icon"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] flex flex-col lg:flex-row gap-4">
      {/* Conversations List */}
      <Card className={cn(
        "lg:w-80 shrink-0 flex flex-col",
        isMobile && selectedConversation && "hidden"
      )}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-pimpo-green" />
              Leads
              {conversations.length > 0 && (
                <Badge variant="secondary">{conversations.length}</Badge>
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
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-[calc(100vh-22rem)]">
            {loading ? (
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
            ) : loadError ? (
              <button 
                onClick={() => {
                  setLoading(true);
                  fetchConversations();
                }}
                className="w-full p-8 text-center"
              >
                <RefreshCw className="h-12 w-12 mx-auto mb-3 text-destructive opacity-50" />
                <p className="text-sm text-muted-foreground">{loadError}</p>
                <p className="text-xs text-primary mt-2">Clique para tentar novamente</p>
              </button>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      selectedConversation?.id === conv.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {conv.contactName}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatMessageDate(conv.lastMessageDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getChannelIcon(conv.type)}
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage || "Sem mensagens"}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="mt-1">
                            {conv.unreadCount} não lida{conv.unreadCount > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className={cn(
        "flex-1 flex flex-col",
        isMobile && !selectedConversation && "hidden"
      )}>
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {contactInfo?.name || selectedConversation.contactName}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getChannelIcon(activeLeadChannel)}
                      <span>{activeLeadChannel}</span>
                      {contactInfo?.phone && (
                        <>
                          <span>•</span>
                          <span>{contactInfo.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                    Atualizar
                  </Button>
                  {lastMessagesUpdate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-pimpo-green" />
                      Atualizado {formatDistanceToNow(lastMessagesUpdate, { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {loadingMessages ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={cn(
                      "flex",
                      i % 2 === 0 ? "justify-start" : "justify-end"
                    )}>
                      <Skeleton className="h-16 w-3/4" />
                    </div>
                  ))
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem encontrada
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.direction === "outbound" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.direction === "outbound" 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        )}>
                          {formatMessageDate(msg.dateAdded)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyDown={handleKeyDown}
                  disabled={sending || loadingMessages}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={sending || loadingMessages || !newMessage.trim()}
                  size="icon"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha um lead para visualizar as mensagens</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
