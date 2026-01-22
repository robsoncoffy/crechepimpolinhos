import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickReplySuggestions } from "@/components/chat/QuickReplySuggestions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Search, ArrowLeft, Baby, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface Message {
  id: string;
  content: string;
  sender_id: string;
  child_id: string;
  created_at: string;
  is_read: boolean;
  channel_type: string;
}

interface ChildWithUnread extends Child {
  unread_count: number;
  last_message?: string;
  last_message_time?: string;
}

interface TeacherAssignment {
  class_type: ClassType;
  shift_type: ShiftType;
}

export function TeacherParentChat() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildWithUnread[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<ChildWithUnread[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildWithUnread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignment, setAssignment] = useState<TeacherAssignment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch teacher assignment
  useEffect(() => {
    if (!user) return;

    const fetchAssignment = async () => {
      const { data } = await supabase
        .from("teacher_assignments")
        .select("class_type, shift_type")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (data) {
        setAssignment(data);
      }
    };

    fetchAssignment();
  }, [user]);

  // Fetch children with unread counts
  useEffect(() => {
    if (!user) return;

    const fetchChildren = async () => {
      setLoading(true);
      try {
        // Fetch children (filtered by assignment if available)
        let query = supabase.from("children").select("*").order("full_name");

        if (assignment) {
          query = query
            .eq("class_type", assignment.class_type)
            .eq("shift_type", assignment.shift_type);
        }

        const { data: childrenData, error } = await query;

        if (error) throw error;

        // Fetch unread counts and last messages for each child (school channel only)
        const childrenWithUnread: ChildWithUnread[] = await Promise.all(
          (childrenData || []).map(async (child) => {
            // Get unread count
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("child_id", child.id)
              .eq("channel_type", "school")
              .eq("is_read", false)
              .neq("sender_id", user.id);

            // Get last message
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("content, created_at")
              .eq("child_id", child.id)
              .eq("channel_type", "school")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...child,
              unread_count: count || 0,
              last_message: lastMsg?.content,
              last_message_time: lastMsg?.created_at,
            };
          })
        );

        // Sort by unread count (most unread first), then alphabetically
        childrenWithUnread.sort((a, b) => {
          if (b.unread_count !== a.unread_count) {
            return b.unread_count - a.unread_count;
          }
          return a.full_name.localeCompare(b.full_name);
        });

        setChildren(childrenWithUnread);
        setFilteredChildren(childrenWithUnread);
      } catch (error) {
        console.error("Error fetching children:", error);
        toast({
          title: "Erro ao carregar crianças",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [user, assignment, toast]);

  // Filter children by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChildren(children);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredChildren(
        children.filter((c) => c.full_name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, children]);

  // Fetch messages for selected child
  useEffect(() => {
    if (!selectedChild || !user) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("child_id", selectedChild.id)
        .eq("channel_type", "school")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
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

        // Mark messages as read
        const unreadIds = (data || [])
          .filter((m) => !m.is_read && m.sender_id !== user.id)
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadIds);

          // Update local unread count
          setChildren((prev) =>
            prev.map((c) =>
              c.id === selectedChild.id ? { ...c, unread_count: 0 } : c
            )
          );
        }
      }

      setLoadingMessages(false);
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`teacher-messages-${selectedChild.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `child_id=eq.${selectedChild.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          if (newMessage.channel_type !== "school") return;

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

          // Mark as read if from parent
          if (newMessage.sender_id !== user?.id) {
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChild, user, senderNames]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!user || !selectedChild) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      content,
      sender_id: user.id,
      child_id: selectedChild.id,
      channel_type: "school",
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

  const totalUnread = children.reduce((sum, c) => sum + c.unread_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mobile: Show list or chat
  // Desktop: Show both side by side
  return (
    <div className="flex h-[450px] md:h-[500px] border rounded-lg overflow-hidden bg-background">
      {/* Children List - hidden on mobile when chat is open */}
      <div
        className={`w-full md:w-80 border-r flex flex-col ${
          selectedChild ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Chat com Pais
            </h3>
            {totalUnread > 0 && (
              <Badge variant="destructive">{totalUnread}</Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar criança..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Children List */}
        <ScrollArea className="flex-1">
          {filteredChildren.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Baby className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma criança encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredChildren.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedChild?.id === child.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        {child.photo_url && (
                          <AvatarImage src={child.photo_url} alt={child.full_name} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {child.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {child.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                          {child.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{child.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {classTypeLabels[child.class_type]}
                      </p>
                      {child.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {child.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col ${
          !selectedChild ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedChild ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setSelectedChild(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="h-8 w-8">
                {selectedChild.photo_url && (
                  <AvatarImage src={selectedChild.photo_url} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {selectedChild.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedChild.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Conversa com os pais • {classTypeLabels[selectedChild.class_type]}
                </p>
              </div>
            </div>

            {/* Messages */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-sm text-muted-foreground/70">
                      Envie uma mensagem para os pais de {selectedChild.full_name.split(" ")[0]}
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
            )}

            {/* Quick Reply Suggestions */}
            {user && (
              <QuickReplySuggestions
                messages={messages}
                currentUserId={user.id}
                childName={selectedChild.full_name.split(" ")[0]}
                onSelect={(suggestion) => handleSend(suggestion)}
              />
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="font-semibold mb-1">Selecione uma criança</h3>
            <p className="text-sm">
              Escolha uma criança para ver e responder às mensagens dos pais
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
