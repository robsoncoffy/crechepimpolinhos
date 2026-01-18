import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StaffMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface StaffChatRoom {
  id: string;
  name: string;
  description: string | null;
  is_general: boolean;
}

export function StaffChatWindow() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<StaffChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<StaffChatRoom | null>(null);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat rooms
  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from("staff_chat_rooms")
        .select("*")
        .order("is_general", { ascending: false });

      if (data && data.length > 0) {
        setRooms(data);
        setSelectedRoom(data[0]);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  // Fetch messages for selected room
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchMessages = async () => {
      const { data: messagesData } = await supabase
        .from("staff_messages")
        .select("*")
        .eq("room_id", selectedRoom.id)
        .order("created_at", { ascending: true });

      if (messagesData) {
        // Fetch sender profiles separately
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", senderIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enrichedMessages = messagesData.map(msg => ({
          ...msg,
          sender: profileMap.get(msg.sender_id) || { full_name: "Usuário", avatar_url: null }
        }));

        setMessages(enrichedMessages);
      }
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`staff-chat-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_messages",
          filter: `room_id=eq.${selectedRoom.id}`
        },
        async (payload) => {
          const newMsg = payload.new as StaffMessage;
          
          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .eq("user_id", newMsg.sender_id)
            .single();

          setMessages(prev => [...prev, {
            ...newMsg,
            sender: senderProfile || { full_name: "Usuário", avatar_url: null }
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedRoom) return;

    setSending(true);
    try {
      await supabase.from("staff_messages").insert({
        room_id: selectedRoom.id,
        sender_id: user.id,
        content: newMessage.trim()
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando chat...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-card rounded-xl border overflow-hidden">
      {/* Sidebar with rooms */}
      <div className="w-64 border-r bg-muted/30 flex-shrink-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Grupos
          </h3>
        </div>
        <ScrollArea className="h-[calc(100%-57px)]">
          <div className="p-2 space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedRoom?.id === room.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <p className="font-medium text-sm">{room.name}</p>
                {room.description && (
                  <p className="text-xs opacity-70 truncate">{room.description}</p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Room header */}
            <div className="p-4 border-b bg-muted/20">
              <h3 className="font-semibold">{selectedRoom.name}</h3>
              {selectedRoom.description && (
                <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma mensagem ainda.</p>
                    <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(message.sender?.full_name || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {isOwn ? "Você" : message.sender?.full_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t bg-muted/20">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Selecione um grupo para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
