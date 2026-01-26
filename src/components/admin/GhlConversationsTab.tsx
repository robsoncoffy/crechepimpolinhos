import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Loader2
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

export function GhlConversationsTab() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "list" },
      });

      if (error) throw error;
      setConversations(data?.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
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
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchConversations, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
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
          type: selectedConversation.type || "SMS",
        },
      });

      if (error) throw error;

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
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
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
              {getChannelIcon(selectedConversation.type)}
              {selectedConversation.type}
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
                disabled={sending}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={sending || !newMessage.trim()}
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
                      {getChannelIcon(selectedConversation.type)}
                      <span>{selectedConversation.type}</span>
                      {contactInfo?.phone && (
                        <>
                          <span>•</span>
                          <span>{contactInfo.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                  Atualizar
                </Button>
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
                  disabled={sending}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={sending || !newMessage.trim()}
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
