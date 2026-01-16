import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  child_id: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
}

interface ChatWindowProps {
  childId: string;
  childName: string;
}

export function ChatWindow({ childId, childName }: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Erro ao carregar mensagens",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setMessages(data || []);
        
        // Fetch sender names
        const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", senderIds);
          
          if (profiles) {
            const names: Record<string, string> = {};
            profiles.forEach((p) => {
              names[p.user_id] = p.full_name;
            });
            setSenderNames(names);
          }
        }
      }
      
      setLoading(false);
    };

    fetchMessages();
  }, [childId, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `child_id=eq.${childId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch sender name if not cached
          if (!senderNames[newMessage.sender_id]) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", newMessage.sender_id)
              .single();
            
            if (profile) {
              setSenderNames((prev) => ({
                ...prev,
                [newMessage.sender_id]: profile.full_name,
              }));
            }
          }
          
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, senderNames]);

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!user) return;
      
      const unreadMessages = messages.filter(
        (m) => !m.is_read && m.sender_id !== user.id
      );
      
      if (unreadMessages.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in(
            "id",
            unreadMessages.map((m) => m.id)
          );
      }
    };

    markAsRead();
  }, [messages, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!user) return;
    
    setSending(true);
    
    const { error } = await supabase.from("messages").insert({
      content,
      sender_id: user.id,
      child_id: childId,
    });

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card">
        <h3 className="font-semibold">{childName}</h3>
        <p className="text-xs text-muted-foreground">Chat com a escola</p>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground/70">
              Envie uma mensagem para iniciar a conversa
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                content={message.content}
                timestamp={message.created_at}
                isOwn={message.sender_id === user?.id}
                senderName={senderNames[message.sender_id]}
                isRead={message.is_read}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
