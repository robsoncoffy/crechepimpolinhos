import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickReplySuggestions } from "./QuickReplySuggestions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  child_id: string;
  created_at: string;
  is_read: boolean;
}

interface ChatWindowProps {
  childId: string;
  childName: string;
}

// Cache for sender profiles across all chat windows
const profileCache = new Map<string, string>();

export const ChatWindow = memo(function ChatWindow({ childId, childName }: ChatWindowProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  // Fetch messages with React Query for caching
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["chat-messages", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Batch fetch sender names for uncached senders
  const senderIds = useMemo(() => 
    [...new Set(messages.map((m) => m.sender_id))],
    [messages]
  );

  const { data: senderProfiles = {} } = useQuery({
    queryKey: ["chat-sender-profiles", senderIds.join(",")],
    queryFn: async () => {
      const uncachedIds = senderIds.filter(id => !profileCache.has(id));
      
      if (uncachedIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", uncachedIds);
        
        data?.forEach((p) => {
          profileCache.set(p.user_id, p.full_name);
        });
      }
      
      // Return all names from cache
      const result: Record<string, string> = {};
      senderIds.forEach(id => {
        result[id] = profileCache.get(id) || "Usuário";
      });
      return result;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - profiles rarely change
    enabled: senderIds.length > 0,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `child_id=eq.${childId}`,
        },
        () => {
          // Refetch on any change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, refetch]);

  // Mark messages as read (debounced)
  useEffect(() => {
    if (!user || messages.length === 0) return;
    
    const unreadIds = messages
      .filter((m) => !m.is_read && m.sender_id !== user.id)
      .map((m) => m.id);
    
    if (unreadIds.length === 0) return;

    const timer = setTimeout(async () => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unreadIds);
    }, 500);

    return () => clearTimeout(timer);
  }, [messages, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(async (content: string) => {
    if (!user) return;
    
    setSending(true);
    
    await supabase.from("messages").insert({
      content,
      sender_id: user.id,
      child_id: childId,
    });
    
    setSending(false);
  }, [user, childId]);

  if (isLoading) {
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
                senderName={senderProfiles[message.sender_id]}
                isRead={message.is_read}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* AI Quick Reply Suggestions */}
      {user && messages.length > 0 && (
        <QuickReplySuggestions
          messages={messages}
          currentUserId={user.id}
          childName={childName.split(" ")[0]}
          onSelect={handleSend}
        />
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
});
