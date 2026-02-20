import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Apple, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  child_id: string;
  created_at: string;
  is_read: boolean;
  channel_type: string;
  sender_name?: string;
}

interface ParentChatTabsProps {
  childId: string;
  childName: string;
}

export function ParentChatTabs({ childId, childName }: ParentChatTabsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeChannel, setActiveChannel] = useState<"school" | "nutritionist">("school");
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [unreadCounts, setUnreadCounts] = useState<{ school: number; nutritionist: number }>({
    school: 0,
    nutritionist: 0,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

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

        // Calculate unread counts
        if (data && user) {
          const schoolUnread = data.filter(
            (m) => m.channel_type === "school" && !m.is_read && m.sender_id !== user.id
          ).length;
          const nutritionistUnread = data.filter(
            (m) => m.channel_type === "nutritionist" && !m.is_read && m.sender_id !== user.id
          ).length;
          setUnreadCounts({ school: schoolUnread, nutritionist: nutritionistUnread });
        }

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
  }, [childId, toast, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages-parent-${childId}`)
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

          // Update unread count if not own message
          if (user && newMessage.sender_id !== user.id) {
            setUnreadCounts((prev) => ({
              ...prev,
              [newMessage.channel_type as "school" | "nutritionist"]:
                prev[newMessage.channel_type as "school" | "nutritionist"] + 1,
            }));
          }
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
  }, [childId, senderNames, user]);

  // Mark messages as read when viewing a channel
  useEffect(() => {
    const markAsRead = async () => {
      if (!user) return;

      const unreadMessages = messages.filter(
        (m) =>
          m.channel_type === activeChannel &&
          !m.is_read &&
          m.sender_id !== user.id
      );

      if (unreadMessages.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in(
            "id",
            unreadMessages.map((m) => m.id)
          );

        setUnreadCounts((prev) => ({
          ...prev,
          [activeChannel]: 0,
        }));
      }
    };

    markAsRead();
  }, [messages, user, activeChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

  const handleSend = async (content: string) => {
    if (!user) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      content,
      sender_id: user.id,
      child_id: childId,
      channel_type: activeChannel,
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

  const filteredMessages = messages.filter((m) => m.channel_type === activeChannel);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with channel tabs */}
      <div className="border-b bg-card">
        <div className="px-4 py-2">
          <h3 className="font-semibold">{childName}</h3>
        </div>
        <Tabs
          value={activeChannel}
          onValueChange={(v) => setActiveChannel(v as "school" | "nutritionist")}
        >
          <TabsList className="w-full rounded-none bg-transparent border-t h-auto p-0 grid grid-cols-2">
            <TabsTrigger
              value="school"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 gap-2"
            >
              <School className="w-4 h-4" />
              <span>Escola</span>
              {unreadCounts.school > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {unreadCounts.school}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="nutritionist"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 gap-2"
            >
              <Apple className="w-4 h-4" />
              <span>Nutricionista</span>
              {unreadCounts.nutritionist > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {unreadCounts.nutritionist}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground/70">
              {activeChannel === "school"
                ? "Converse com a escola sobre o dia a dia do seu filho"
                : "Tire dúvidas sobre alimentação e nutrição"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
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
