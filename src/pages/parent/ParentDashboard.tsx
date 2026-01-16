import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  AlertCircle,
  LogOut,
  MessageSquare,
  Baby,
  BookOpen,
  Calendar,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { cn } from "@/lib/utils";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  photo_url: string | null;
  birth_date: string;
}

interface UnreadCount {
  childId: string;
  count: number;
}

export default function ParentDashboard() {
  const { user, profile, signOut, isApproved } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("agenda");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Fetch children
  useEffect(() => {
    if (!isApproved || !user) return;

    const fetchChildren = async () => {
      // First get the child IDs linked to this parent
      const { data: parentChildren } = await supabase
        .from("parent_children")
        .select("child_id")
        .eq("parent_id", user.id);

      if (!parentChildren || parentChildren.length === 0) return;

      const childIds = parentChildren.map((pc) => pc.child_id);

      // Then fetch the children details
      const { data: childrenData } = await supabase
        .from("children")
        .select("*")
        .in("id", childIds);

      if (childrenData) {
        setChildren(childrenData);
        if (childrenData.length > 0) {
          setSelectedChild(childrenData[0]);
        }
      }
    };

    fetchChildren();
  }, [isApproved, user]);

  // Fetch unread message counts
  useEffect(() => {
    if (!user || children.length === 0) return;

    const fetchUnreadCounts = async () => {
      const counts: Record<string, number> = {};

      for (const child of children) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("child_id", child.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        counts[child.id] = count || 0;
      }

      setUnreadCounts(counts);
    };

    fetchUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel("parent-unread-counts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as { child_id: string; sender_id: string };
          if (
            children.some((c) => c.id === newMessage.child_id) &&
            newMessage.sender_id !== user.id
          ) {
            setUnreadCounts((prev) => ({
              ...prev,
              [newMessage.child_id]: (prev[newMessage.child_id] || 0) + 1,
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
        },
        () => {
          // Refresh counts when messages are marked as read
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, children]);

  const classTypeLabels: Record<string, string> = {
    bercario: "Berçário",
    maternal: "Maternal",
    jardim: "Jardim",
  };

  // If not approved, show pending message
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-md">
          <div className="container py-4 flex items-center justify-between">
            <img src={logo} alt="Creche Pimpolinhos" className="h-12" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-8">
          <h1 className="font-fredoka text-3xl font-bold mb-8">
            Olá, {profile?.full_name || "Responsável"}!
          </h1>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-pimpo-yellow" />
                Aguardando Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-pimpo-yellow/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-pimpo-yellow mt-0.5" />
                <div>
                  <p className="font-semibold">Seu cadastro está em análise</p>
                  <p className="text-sm text-muted-foreground">
                    A escola precisa aprovar seu acesso e vincular seu filho à sua conta.
                    Você receberá uma notificação quando o acesso for liberado.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <MessageSquare className="w-5 h-5 text-pimpo-green" />
                <p className="text-sm">
                  Enquanto isso, você pode entrar em contato com a escola pelo WhatsApp{" "}
                  <a
                    href="https://wa.me/5551989965423"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-pimpo-green hover:underline"
                  >
                    (51) 98996-5423
                  </a>{" "}
                  para agilizar o processo.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Approved parent - show full dashboard with chat
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-md sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <img src={logo} alt="Creche Pimpolinhos" className="h-12" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile?.full_name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        <h1 className="font-fredoka text-2xl sm:text-3xl font-bold mb-6">
          Olá, {profile?.full_name?.split(" ")[0]}!
        </h1>

        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Baby className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum filho vinculado à sua conta ainda.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com a escola para vincular seu filho.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Children Selector */}
            {children.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {children.map((child) => {
                  const unread = unreadCounts[child.id] || 0;
                  return (
                    <Button
                      key={child.id}
                      variant={selectedChild?.id === child.id ? "default" : "outline"}
                      onClick={() => setSelectedChild(child)}
                      className="shrink-0 relative"
                    >
                      <Baby className="w-4 h-4 mr-2" />
                      {child.full_name.split(" ")[0]}
                      {unread > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {unread}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Main Content */}
            {selectedChild && (
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-fredoka text-xl font-bold text-primary">
                          {selectedChild.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle>{selectedChild.full_name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {classTypeLabels[selectedChild.class_type]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="agenda" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">Agenda</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="chat"
                        className="flex items-center gap-2 relative"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Mensagens</span>
                        {unreadCounts[selectedChild.id] > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-5 w-5 p-0 flex items-center justify-center text-xs ml-1"
                          >
                            {unreadCounts[selectedChild.id]}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="agenda" className="mt-4">
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>A agenda digital estará disponível em breve!</p>
                        <p className="text-sm">
                          Aqui você poderá acompanhar as atividades diárias do seu filho.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="chat" className="mt-4">
                      <div className="h-[500px] -mx-6 -mb-6 border-t">
                        <ChatWindow
                          key={selectedChild.id}
                          childId={selectedChild.id}
                          childName={selectedChild.full_name}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
