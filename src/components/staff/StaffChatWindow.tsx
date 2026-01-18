import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Users, MessageCircle, Hash } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

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

interface StaffMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  teacher: "Professor(a)",
  parent: "Responsável",
  cook: "Cozinheira",
  nutritionist: "Nutricionista",
  pedagogue: "Pedagoga",
  auxiliar: "Auxiliar",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-blue-100 text-blue-700",
  teacher: "bg-purple-100 text-purple-700",
  parent: "bg-green-100 text-green-700",
  cook: "bg-orange-100 text-orange-700",
  nutritionist: "bg-emerald-100 text-emerald-700",
  pedagogue: "bg-pink-100 text-pink-700",
  auxiliar: "bg-amber-100 text-amber-700",
};

export function StaffChatWindow() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<StaffChatRoom[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<StaffChatRoom | null>(null);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"groups" | "contacts">("groups");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat rooms and staff members
  useEffect(() => {
    const fetchData = async () => {
      // Fetch rooms
      const { data: roomsData } = await supabase
        .from("staff_chat_rooms")
        .select("*")
        .order("is_general", { ascending: false });

      if (roomsData && roomsData.length > 0) {
        setRooms(roomsData);
        setSelectedRoom(roomsData[0]);
      }

      // Fetch staff members (non-parent roles)
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .neq("role", "parent");

      if (rolesData) {
        const userIds = [...new Set(rolesData.map(r => r.user_id))];
        
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        if (profilesData) {
          const staffWithRoles: StaffMember[] = profilesData.map(p => {
            const userRole = rolesData.find(r => r.user_id === p.user_id);
            return {
              ...p,
              role: userRole?.role || "teacher"
            };
          }).filter(s => s.user_id !== user?.id); // Exclude current user

          setStaffMembers(staffWithRoles);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user?.id]);

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
      {/* Sidebar with rooms and contacts */}
      <div className="w-72 border-r bg-muted/30 flex-shrink-0 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === "groups"
                ? "bg-background border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="h-4 w-4" />
            Grupos
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === "contacts"
                ? "bg-background border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Contatos
          </button>
        </div>

        <ScrollArea className="flex-1">
          {activeTab === "groups" ? (
            <div className="p-2 space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    selectedRoom?.id === room.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    selectedRoom?.id === room.id ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>
                    {room.is_general ? (
                      <MessageCircle className="h-4 w-4" />
                    ) : (
                      <Hash className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{room.name}</p>
                    {room.description && (
                      <p className="text-xs opacity-70 truncate">{room.description}</p>
                    )}
                  </div>
                  {room.is_general && (
                    <Badge variant="outline" className={`text-[10px] ${
                      selectedRoom?.id === room.id ? "border-primary-foreground/30" : ""
                    }`}>
                      Geral
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {staffMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contato encontrado</p>
                </div>
              ) : (
                staffMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="w-full text-left px-3 py-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.full_name}</p>
                      <Badge className={`text-[10px] ${roleColors[member.role]}`}>
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>

        {/* Current user info */}
        <div className="p-3 border-t bg-muted/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Room header */}
            <div className="p-4 border-b bg-muted/20 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                {selectedRoom.is_general ? (
                  <MessageCircle className="h-5 w-5 text-primary" />
                ) : (
                  <Hash className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{selectedRoom.name}</h3>
                {selectedRoom.description && (
                  <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
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
                          <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
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
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Selecione um grupo para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
