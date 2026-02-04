import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  RefreshCw, 
  User,
  Send,
  ArrowLeft,
  Loader2,
  Inbox,
  Reply
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmailConversation {
  id: string;
  contactId: string;
  contactName: string;
  email?: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
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
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      // Fetch all conversations - GHL doesn't properly separate email conversations
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "list", limit: "100" },
      });

      if (error) throw error;
      
      // Filter for email-like conversations:
      // 1. Type contains "email" 
      // 2. OR contact has email but no phone (likely email-only contact)
      // 3. OR type is TYPE_EMAIL
      const allConvs = data?.conversations || [];
      const emailConvs = allConvs.filter((conv: any) => {
        const typeStr = (conv.type || "").toLowerCase();
        const hasEmail = !!conv.email;
        const hasPhone = !!conv.phone;
        
        // Include if explicitly email type
        if (typeStr.includes("email") || typeStr === "type_email") {
          return true;
        }
        
        // Include if contact has email but no phone (email-only contact)
        if (hasEmail && !hasPhone) {
          return true;
        }
        
        return false;
      });
      
      setConversations(emailConvs);
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
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchConversations, 60000);
    return () => clearInterval(interval);
  }, []);

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
          type: "Email",
        },
      });

      if (error) throw error;

      setNewMessage("");
      await fetchMessages(selectedConversation.id);
      setTimeout(scrollToBottom, 100);
      
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
    } finally {
      setSending(false);
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
            <p className="text-xs text-muted-foreground">
              {contactInfo?.email || selectedConversation.email}
            </p>
          </div>
        </div>

        <Card className="flex-1">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="p-4 space-y-4">
              {loadingMessages ? (
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
              <div ref={messagesEndRef} />
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
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Reply className="h-4 w-4 mr-2" />
              )}
              Responder
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] flex flex-col lg:flex-row gap-4">
      {/* Email List */}
      <Card className={cn(
        "lg:w-96 shrink-0 flex flex-col",
        isMobile && selectedConversation && "hidden"
      )}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-pimpo-yellow" />
              E-mails
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
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum e-mail encontrado</p>
                <p className="text-sm mt-1">E-mails recebidos aparecerão aqui</p>
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
                      <div className="h-10 w-10 rounded-full bg-pimpo-yellow/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-pimpo-yellow" />
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
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.email}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-1">
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
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Email Content */}
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
                  <div className="h-10 w-10 rounded-full bg-pimpo-yellow/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-pimpo-yellow" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {contactInfo?.name || selectedConversation.contactName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {contactInfo?.email || selectedConversation.email}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
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
                <div ref={messagesEndRef} />
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
                onClick={handleSendMessage} 
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Selecione um e-mail</p>
              <p className="text-sm">Escolha uma conversa para visualizar os e-mails</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
