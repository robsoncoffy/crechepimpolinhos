import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffQuickReplySuggestions } from "@/components/chat/StaffQuickReplySuggestions";
import { Send, Users, MessageCircle, Hash, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  is_private: boolean;
  participant_1: string | null;
  participant_2: string | null;
}

interface StaffMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  diretor: "Diretor(a)",
  teacher: "Professor(a)",
  parent: "Responsável",
  cook: "Cozinheira",
  nutritionist: "Nutricionista",
  pedagogue: "Pedagoga",
  auxiliar: "Auxiliar",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-blue-100 text-blue-700",
  diretor: "bg-indigo-100 text-indigo-700",
  teacher: "bg-purple-100 text-purple-700",
  parent: "bg-green-100 text-green-700",
  cook: "bg-orange-100 text-orange-700",
  nutritionist: "bg-emerald-100 text-emerald-700",
  pedagogue: "bg-pink-100 text-pink-700",
  auxiliar: "bg-amber-100 text-amber-700",
};

// Profile cache shared across chat instances
const profileCache = new Map<string, { full_name: string; avatar_url: string | null }>();

const STALE_TIME = 1000 * 60 * 2; // 2 minutes

export const StaffChatWindow = memo(function StaffChatWindow() {
  const { user, profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<StaffChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"groups" | "private" | "contacts">("groups");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Parallel fetch: rooms + staff in one effect using React Query
  const { data: roomsData, isLoading: roomsLoading, refetch: refetchRooms } = useQuery({
    queryKey: ["staff-chat-rooms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_chat_rooms")
        .select("*")
        .order("is_general", { ascending: false })
        .order("created_at", { ascending: true });
      return data || [];
    },
    staleTime: STALE_TIME,
    enabled: !!user,
  });

  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      // Parallel fetch: roles + profiles
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").neq("role", "parent"),
        supabase.from("profiles").select("user_id, full_name, avatar_url").eq("status", "approved"),
      ]);

      if (!rolesRes.data || !profilesRes.data) return [];

      const roleMap = new Map<string, AppRole>();
      rolesRes.data.forEach(r => {
        if (!roleMap.has(r.user_id) || r.role === 'admin') {
          roleMap.set(r.user_id, r.role as AppRole);
        }
      });

      const staffUserIds = new Set(rolesRes.data.map(r => r.user_id));
      
      return profilesRes.data
        .filter(p => staffUserIds.has(p.user_id))
        .map(p => {
          // Cache for message rendering
          profileCache.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
          return {
            ...p,
            role: roleMap.get(p.user_id) || "teacher" as AppRole
          };
        });
    },
    staleTime: STALE_TIME,
    enabled: !!user,
  });

  // Derived room lists
  const rooms = useMemo(() => 
    roomsData?.filter(r => !r.is_private) || [], 
    [roomsData]
  );
  
  const privateRooms = useMemo(() => 
    roomsData?.filter(r => r.is_private) || [], 
    [roomsData]
  );

  // Auto-select first room
  useEffect(() => {
    if (!selectedRoom && rooms.length > 0) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

  // Fetch messages for selected room with React Query
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["staff-messages", selectedRoom?.id],
    queryFn: async () => {
      if (!selectedRoom) return [];

      const { data } = await supabase
        .from("staff_messages")
        .select("*")
        .eq("room_id", selectedRoom.id)
        .order("created_at", { ascending: true });

      if (!data) return [];

      // Batch fetch uncached profiles
      const uncachedIds = data
        .map(m => m.sender_id)
        .filter(id => !profileCache.has(id));

      if (uncachedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", [...new Set(uncachedIds)]);

        profiles?.forEach(p => {
          profileCache.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
        });
      }

      // Enrich messages from cache
      return data.map(msg => ({
        ...msg,
        sender: profileCache.get(msg.sender_id) || { full_name: "Usuário", avatar_url: null }
      }));
    },
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!selectedRoom,
  });

  // Realtime subscription
  useEffect(() => {
    if (!selectedRoom) return;

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
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, refetchMessages]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
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
  }, [newMessage, user, selectedRoom]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const createGroup = useCallback(async () => {
    if (!newGroupName.trim()) return;

    setCreatingGroup(true);
    try {
      await supabase.from("staff_chat_rooms").insert({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || null,
        is_general: false,
        is_private: false,
        created_by: user?.id
      });

      refetchRooms();
      setNewGroupName("");
      setNewGroupDescription("");
      setShowCreateDialog(false);
      toast.success("Grupo criado com sucesso!");
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo");
    } finally {
      setCreatingGroup(false);
    }
  }, [newGroupName, newGroupDescription, user?.id, refetchRooms]);

  const deleteGroup = useCallback(async (roomId: string) => {
    try {
      await supabase.from("staff_chat_rooms").delete().eq("id", roomId);
      refetchRooms();
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(rooms.find(r => r.is_general) || null);
      }
      toast.success("Grupo excluído");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Erro ao excluir grupo");
    }
  }, [selectedRoom?.id, rooms, refetchRooms]);

  const startPrivateChat = useCallback(async (member: StaffMember) => {
    const existingChat = privateRooms.find(r => 
      (r.participant_1 === user?.id && r.participant_2 === member.user_id) ||
      (r.participant_1 === member.user_id && r.participant_2 === user?.id)
    );

    if (existingChat) {
      setSelectedRoom(existingChat);
      setActiveTab("private");
      return;
    }

    try {
      const { data } = await supabase.from("staff_chat_rooms").insert({
        name: member.full_name,
        description: null,
        is_general: false,
        is_private: true,
        participant_1: user?.id,
        participant_2: member.user_id,
        created_by: user?.id
      }).select().single();

      if (data) {
        refetchRooms();
        setSelectedRoom(data);
        setActiveTab("private");
        toast.success(`Chat com ${member.full_name.split(" ")[0]} iniciado`);
      }
    } catch (error) {
      console.error("Error creating private chat:", error);
      toast.error("Erro ao iniciar conversa");
    }
  }, [privateRooms, user?.id, refetchRooms]);

  const getPrivateChatName = useCallback((room: StaffChatRoom) => {
    const otherUserId = room.participant_1 === user?.id ? room.participant_2 : room.participant_1;
    const otherUser = staffMembers.find(m => m.user_id === otherUserId);
    return otherUser?.full_name || room.name;
  }, [user?.id, staffMembers]);

  const getPrivateChatAvatar = useCallback((room: StaffChatRoom) => {
    const otherUserId = room.participant_1 === user?.id ? room.participant_2 : room.participant_1;
    const otherUser = staffMembers.find(m => m.user_id === otherUserId);
    return otherUser?.avatar_url || null;
  }, [user?.id, staffMembers]);

  const isLoading = roomsLoading || staffLoading;

  if (isLoading) {
    return (
      <div className="flex h-[450px] md:h-[500px] bg-card rounded-xl border overflow-hidden">
        <div className="w-full md:w-64 lg:w-72 border-r bg-muted/30 p-3 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <div className="flex-1 hidden md:flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[450px] md:h-[500px] bg-card rounded-xl border overflow-hidden">
      {/* Sidebar with rooms and contacts - hidden on mobile when chat is open */}
      <div className={`w-full md:w-64 lg:w-72 border-r bg-muted/30 flex-shrink-0 flex flex-col ${selectedRoom ? "hidden md:flex" : "flex"}`}>
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "groups"
                ? "bg-background border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            Grupos
          </button>
          <button
            onClick={() => setActiveTab("private")}
            className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "private"
                ? "bg-background border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Privado
            {privateRooms.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {privateRooms.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "contacts"
                ? "bg-background border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Contatos
          </button>
        </div>

        <ScrollArea className="flex-1">
          {activeTab === "groups" ? (
            <div className="p-2 space-y-1">
              {isAdmin && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <button className="w-full text-left px-3 py-2 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Novo Grupo</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Grupo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-name">Nome do Grupo</Label>
                        <Input
                          id="group-name"
                          placeholder="Ex: Cozinha, Professoras..."
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-desc">Descrição (opcional)</Label>
                        <Textarea
                          id="group-desc"
                          placeholder="Descreva o propósito do grupo..."
                          value={newGroupDescription}
                          onChange={(e) => setNewGroupDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button 
                        onClick={createGroup} 
                        disabled={!newGroupName.trim() || creatingGroup}
                        className="w-full"
                      >
                        {creatingGroup ? "Criando..." : "Criar Grupo"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`group w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center gap-3 cursor-pointer ${
                    selectedRoom?.id === room.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedRoom(room)}
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
                  {isAdmin && !room.is_general && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(room.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : activeTab === "private" ? (
            <div className="p-2 space-y-1">
              {privateRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa privada</p>
                  <p className="text-xs mt-1">Clique em um contato para iniciar</p>
                </div>
              ) : (
                privateRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      selectedRoom?.id === room.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getPrivateChatAvatar(room) || undefined} />
                      <AvatarFallback className={`text-sm ${
                        selectedRoom?.id === room.id 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {getInitials(getPrivateChatName(room))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getPrivateChatName(room)}</p>
                      <p className="text-xs opacity-70">Conversa privada</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {staffMembers.filter(m => m.user_id !== user?.id).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contato encontrado</p>
                </div>
              ) : (
                staffMembers
                  .filter(m => m.user_id !== user?.id)
                  .map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => startPrivateChat(member)}
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
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
              )}
            </div>
          )}
        </ScrollArea>

        {/* Current user info */}
        <div className="p-2 md:p-3 border-t bg-muted/50">
          <div className="flex items-center gap-2 md:gap-3">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Online</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${!selectedRoom ? "hidden md:flex" : "flex"}`}>
        {selectedRoom ? (
          <>
            {/* Room header */}
            <div className="p-3 md:p-4 border-b bg-muted/20 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 flex-shrink-0"
                onClick={() => setSelectedRoom(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              {selectedRoom.is_private ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getPrivateChatAvatar(selectedRoom) || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(getPrivateChatName(selectedRoom))}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="p-2 rounded-full bg-primary/10">
                  {selectedRoom.is_general ? (
                    <MessageCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Hash className="h-5 w-5 text-primary" />
                  )}
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {selectedRoom.is_private ? getPrivateChatName(selectedRoom) : selectedRoom.name}
                </h3>
                {selectedRoom.description && (
                  <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
                )}
                {selectedRoom.is_private && (
                  <p className="text-xs text-muted-foreground">Conversa privada</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
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
              )}
            </ScrollArea>

            {/* AI Quick Reply Suggestions */}
            {user && messages.length > 0 && (
              <StaffQuickReplySuggestions
                messages={messages.map(m => ({ content: m.content, sender_id: m.sender_id }))}
                currentUserId={user.id}
                roomName={selectedRoom.name}
                onSelect={(suggestion) => {
                  setNewMessage(suggestion);
                }}
              />
            )}

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
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
