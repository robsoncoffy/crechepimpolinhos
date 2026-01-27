import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  photo_url: string | null;
}

interface ChatPreview {
  childId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function AdminMessages() {
  const { user } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const [searchParams, setSearchParams] = useSearchParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [chatPreviews, setChatPreviews] = useState<Record<string, ChatPreview>>({});
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [recentlyUpdatedChildId, setRecentlyUpdatedChildId] = useState<string | null>(null);
  const recentlyUpdatedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for child ID in URL params and auto-select
  useEffect(() => {
    const childIdFromUrl = searchParams.get("child");
    if (childIdFromUrl && children.length > 0 && !selectedChild) {
      const childToSelect = children.find((c) => c.id === childIdFromUrl);
      if (childToSelect) {
        setSelectedChild(childToSelect);
        // Clear the URL param after selecting
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, children, selectedChild, setSearchParams]);

  // Fetch children
  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("children")
        .select("id, full_name, class_type, photo_url")
        .order("full_name");

      if (error) {
        console.error("Error fetching children:", error);
      } else {
        setChildren(data || []);
      }
      
      setLoading(false);
    };

    fetchChildren();
  }, []);

  // Fetch chat previews
  useEffect(() => {
    const fetchPreviews = async () => {
      if (children.length === 0) return;

      const previews: Record<string, ChatPreview> = {};

      for (const child of children) {
        // Get last message
        const { data: lastMessageData } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("child_id", child.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("child_id", child.id)
          .eq("is_read", false)
          .neq("sender_id", user?.id);

        if (lastMessageData) {
          previews[child.id] = {
            childId: child.id,
            lastMessage: lastMessageData.content,
            lastMessageTime: lastMessageData.created_at,
            unreadCount: count || 0,
          };
        }
      }

      setChatPreviews(previews);
    };

    fetchPreviews();
  }, [children, user?.id]);

  // Subscribe to new messages for previews
  useEffect(() => {
    if (children.length === 0) return;

    const channel = supabase
      .channel("admin-messages-preview")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as { id: string; content: string; created_at: string; child_id: string; sender_id: string };
          
          // Play notification sound if message is from someone else
          if (newMessage.sender_id !== user?.id) {
            playNotificationSound();
            
            // Highlight the conversation that received a new message
            setRecentlyUpdatedChildId(newMessage.child_id);
            
            // Clear the highlight after 3 seconds
            if (recentlyUpdatedTimeoutRef.current) {
              clearTimeout(recentlyUpdatedTimeoutRef.current);
            }
            recentlyUpdatedTimeoutRef.current = setTimeout(() => {
              setRecentlyUpdatedChildId(null);
            }, 3000);
          }
          
          setChatPreviews((prev) => ({
            ...prev,
            [newMessage.child_id]: {
              childId: newMessage.child_id,
              lastMessage: newMessage.content,
              lastMessageTime: newMessage.created_at,
              unreadCount:
                (prev[newMessage.child_id]?.unreadCount || 0) +
                (newMessage.sender_id !== user?.id ? 1 : 0),
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (recentlyUpdatedTimeoutRef.current) {
        clearTimeout(recentlyUpdatedTimeoutRef.current);
      }
    };
  }, [children, user?.id, playNotificationSound]);

  const classTypeLabels: Record<string, string> = {
    bercario: "Berçário",
    maternal: "Maternal",
    maternal_1: "Maternal I",
    maternal_2: "Maternal II",
    jardim: "Jardim",
    jardim_1: "Jardim I",
    jardim_2: "Jardim II",
  };

  const filteredChildren = children.filter((child) =>
    child.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort by last message time (most recent first)
  const sortedChildren = [...filteredChildren].sort((a, b) => {
    const aTime = chatPreviews[a.id]?.lastMessageTime;
    const bTime = chatPreviews[b.id]?.lastMessageTime;
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
        {/* Children List */}
        <Card className="lg:w-80 shrink-0 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-fredoka text-lg font-bold mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversas
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar criança..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : sortedChildren.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Nenhuma criança encontrada
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sortedChildren.map((child) => {
                  const preview = chatPreviews[child.id];
                  const isSelected = selectedChild?.id === child.id;
                  const isRecentlyUpdated = recentlyUpdatedChildId === child.id;

                  return (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all duration-300",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                        isRecentlyUpdated && !isSelected && "bg-pimpo-green/20 ring-2 ring-pimpo-green/50 animate-pulse"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {child.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm truncate">
                              {child.full_name}
                            </span>
                            {preview?.unreadCount > 0 && !isSelected && (
                              <Badge
                                variant="default"
                                className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs"
                              >
                                {preview.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={isSelected ? "outline" : "secondary"}
                              className={cn(
                                "text-xs",
                                isSelected && "border-primary-foreground/30"
                              )}
                            >
                              {classTypeLabels[child.class_type]}
                            </Badge>
                            {preview?.lastMessageTime && (
                              <span
                                className={cn(
                                  "text-xs",
                                  isSelected
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                {format(
                                  new Date(preview.lastMessageTime),
                                  "dd/MM",
                                  { locale: ptBR }
                                )}
                              </span>
                            )}
                          </div>
                          {preview?.lastMessage && (
                            <p
                              className={cn(
                                "text-xs mt-1 truncate",
                                isSelected
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {preview.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 p-0 flex flex-col">
            {selectedChild ? (
              <ChatWindow
                key={selectedChild.id}
                childId={selectedChild.id}
                childName={selectedChild.full_name}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Selecione uma conversa</p>
                <p className="text-sm">Escolha uma criança para ver as mensagens</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
