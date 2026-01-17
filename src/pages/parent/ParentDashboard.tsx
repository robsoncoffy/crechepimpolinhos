import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ParentAgendaView } from "@/components/parent/ParentAgendaView";
import { GrowthChart } from "@/components/parent/GrowthChart";
import { PickupNotification } from "@/components/parent/PickupNotification";
import { QuickSummaryCards } from "@/components/parent/QuickSummaryCards";
import { TodayAtSchoolWidget } from "@/components/parent/TodayAtSchoolWidget";
import { ChildProfileTab } from "@/components/parent/ChildProfileTab";
import { WeeklyMenuTab } from "@/components/parent/WeeklyMenuTab";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  AlertCircle,
  LogOut,
  MessageSquare,
  Baby,
  Calendar,
  TrendingUp,
  Home,
  ChevronRight,
  UserPlus,
  User,
  UtensilsCrossed,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  photo_url: string | null;
  birth_date: string;
  shift_type?: string | null;
  allergies?: string | null;
}

interface MonthlyTracking {
  id: string;
  month: number;
  year: number;
  weight: number | null;
  height: number | null;
  observations: string | null;
}

export default function ParentDashboard() {
  const { user, profile, signOut, isApproved } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [growthData, setGrowthData] = useState<Record<string, MonthlyTracking[]>>({});
  const [activeTab, setActiveTab] = useState("agenda");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Fetch children and growth data
  useEffect(() => {
    if (!isApproved || !user) return;

    const fetchData = async () => {
      const { data: parentChildren } = await supabase
        .from("parent_children")
        .select("child_id")
        .eq("parent_id", user.id);

      if (!parentChildren || parentChildren.length === 0) return;

      const childIds = parentChildren.map((pc) => pc.child_id);

      const [childrenRes, growthRes] = await Promise.all([
        supabase.from("children").select("id, full_name, class_type, photo_url, birth_date, shift_type, allergies").in("id", childIds),
        supabase.from("monthly_tracking").select("*").in("child_id", childIds),
      ]);

      if (childrenRes.data) {
        setChildren(childrenRes.data);
        if (childrenRes.data.length > 0) {
          setSelectedChild(childrenRes.data[0]);
        }
      }

      if (growthRes.data) {
        const grouped: Record<string, MonthlyTracking[]> = {};
        growthRes.data.forEach((item) => {
          if (!grouped[item.child_id]) {
            grouped[item.child_id] = [];
          }
          grouped[item.child_id].push(item);
        });
        setGrowthData(grouped);
      }
    };

    fetchData();
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
      <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
          <div className="container py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
              <span className="font-fredoka text-lg font-bold hidden sm:inline">Pimpolinhos</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-8 max-w-2xl">
          <div className="mb-8">
            <h1 className="font-fredoka text-3xl font-bold">
              Olá, {profile?.full_name?.split(" ")[0] || "Responsável"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao portal de pais da Creche Pimpolinhos
            </p>
          </div>

          <Card className="shadow-lg border-2">
            <CardHeader className="bg-pimpo-yellow/10 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-pimpo-yellow/20">
                  <Clock className="w-6 h-6 text-pimpo-yellow" />
                </div>
                <div>
                  <CardTitle>Aguardando Aprovação</CardTitle>
                  <CardDescription>Seu cadastro está sendo analisado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">O que acontece agora?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A escola precisa aprovar seu acesso e vincular seu filho à sua conta.
                    Você receberá uma notificação quando o acesso for liberado.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-pimpo-green/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-pimpo-green mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-pimpo-green">Precisa de ajuda?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Entre em contato com a escola pelo WhatsApp{" "}
                    <a
                      href="https://wa.me/5551989965423"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-pimpo-green hover:underline"
                    >
                      (51) 98996-5423
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Approved parent - show full dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-pimpo-blue-light/30 to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">Pimpolinhos</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {profile?.full_name?.charAt(0).toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
              <span>{profile?.full_name}</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Site
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild className="gap-1.5">
              <Link to="/cadastro-pimpolho">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar Pimpolho</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold">
            Olá, {profile?.full_name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Acompanhe a rotina e desenvolvimento do seu filho
          </p>
        </div>

        {children.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Baby className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhum filho vinculado</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Cadastre seu filho para que a escola possa aprovar e vincular à sua conta.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/cadastro-pimpolho">
                  <UserPlus className="w-5 h-5" />
                  Adicionar Pimpolho
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Children Selector */}
            {children.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {children.map((child) => {
                  const unread = unreadCounts[child.id] || 0;
                  const isSelected = selectedChild?.id === child.id;
                  return (
                    <Card
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`shrink-0 cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-primary shadow-md"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={child.photo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-fredoka">
                            {child.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{child.full_name.split(" ")[0]}</p>
                          <p className="text-xs text-muted-foreground">
                            {classTypeLabels[child.class_type]}
                          </p>
                        </div>
                        {unread > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {unread}
                          </Badge>
                        )}
                        {isSelected && <ChevronRight className="w-4 h-4 text-primary ml-auto" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Quick Summary Cards */}
            {selectedChild && (
              <QuickSummaryCards
                child={{
                  id: selectedChild.id,
                  name: selectedChild.full_name,
                  class_type: selectedChild.class_type,
                  photo_url: selectedChild.photo_url,
                  birth_date: selectedChild.birth_date,
                  shift: selectedChild.shift_type,
                }}
                unreadCount={unreadCounts[selectedChild.id] || 0}
                onChatClick={() => setActiveTab("chat")}
              />
            )}

            {/* Main Content Grid */}
            {selectedChild && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today Widget - Left Column */}
                <div className="lg:col-span-1">
                  <TodayAtSchoolWidget childId={selectedChild.id} />
                  <div className="mt-4">
                    <PickupNotification 
                      childId={selectedChild.id} 
                      childName={selectedChild.full_name} 
                    />
                  </div>
                </div>

                {/* Tabs - Right Column */}
                <div className="lg:col-span-2">
                  <Card className="shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="border-b bg-muted/30">
                          <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
                            <TabsTrigger
                              value="agenda"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs sm:text-sm"
                            >
                              <Calendar className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Agenda</span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="crescimento"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs sm:text-sm"
                            >
                              <TrendingUp className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Crescimento</span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="perfil"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs sm:text-sm"
                            >
                              <User className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Perfil</span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="cardapio"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs sm:text-sm"
                            >
                              <UtensilsCrossed className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Cardápio</span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="chat"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 relative text-xs sm:text-sm"
                            >
                              <MessageSquare className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Chat</span>
                              {unreadCounts[selectedChild.id] > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                                >
                                  {unreadCounts[selectedChild.id]}
                                </Badge>
                              )}
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="agenda" className="m-0 p-4 sm:p-6">
                          <ParentAgendaView
                            childId={selectedChild.id}
                            childName={selectedChild.full_name}
                          />
                        </TabsContent>

                        <TabsContent value="crescimento" className="m-0 p-4 sm:p-6">
                          <GrowthChart
                            data={growthData[selectedChild.id] || []}
                            childName={selectedChild.full_name}
                          />
                        </TabsContent>

                        <TabsContent value="perfil" className="m-0 p-4 sm:p-6">
                          <ChildProfileTab
                            childId={selectedChild.id}
                            childName={selectedChild.full_name}
                            inviterName={profile?.full_name || "Responsável"}
                          />
                        </TabsContent>

                        <TabsContent value="cardapio" className="m-0 p-4 sm:p-6">
                          <WeeklyMenuTab childAllergies={selectedChild.allergies} />
                        </TabsContent>

                        <TabsContent value="chat" className="m-0">
                          <div className="h-[500px]">
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
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
