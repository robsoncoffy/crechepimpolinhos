import { useState, useEffect, lazy, Suspense, memo, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  AlertCircle,
  LogOut,
  MessageSquare,
  Baby,
  Calendar,
  Home,
  UserPlus,
  UtensilsCrossed,
  
  CreditCard,
  GraduationCap,
  Settings,
  Newspaper,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { useQuery } from "@tanstack/react-query";

// Lazy load heavy tab components
const ParentChatTabs = lazy(() => import("@/components/parent/ParentChatTabs").then(m => ({ default: m.ParentChatTabs })));
const ParentAgendaView = lazy(() => import("@/components/parent/ParentAgendaView").then(m => ({ default: m.ParentAgendaView })));
const GrowthChart = lazy(() => import("@/components/parent/GrowthChart").then(m => ({ default: m.GrowthChart })));
const PickupNotification = lazy(() => import("@/components/parent/PickupNotification").then(m => ({ default: m.PickupNotification })));
const AbsenceNotification = lazy(() => import("@/components/parent/AbsenceNotification").then(m => ({ default: m.AbsenceNotification })));
const TodayAtSchoolWidget = lazy(() => import("@/components/parent/TodayAtSchoolWidget").then(m => ({ default: m.TodayAtSchoolWidget })));
const ChildProfileTab = lazy(() => import("@/components/parent/ChildProfileTab").then(m => ({ default: m.ChildProfileTab })));
const WeeklyMenuTab = lazy(() => import("@/components/parent/WeeklyMenuTab").then(m => ({ default: m.WeeklyMenuTab })));
const UnifiedFeedTab = lazy(() => import("@/components/parent/UnifiedFeedTab").then(m => ({ default: m.UnifiedFeedTab })));
const SchoolCalendarTab = lazy(() => import("@/components/parent/SchoolCalendarTab").then(m => ({ default: m.SchoolCalendarTab })));
// AnnouncementsWidget is now inside UnifiedFeedTab
const PaymentsTab = lazy(() => import("@/components/parent/PaymentsTab").then(m => ({ default: m.PaymentsTab })));
const DetailedWeatherWidget = lazy(() => import("@/components/parent/DetailedWeatherWidget").then(m => ({ default: m.DetailedWeatherWidget })));
const QuarterlyEvaluationsTab = lazy(() => import("@/components/parent/QuarterlyEvaluationsTab").then(m => ({ default: m.QuarterlyEvaluationsTab })));
const ParentSettingsTab = lazy(() => import("@/components/parent/ParentSettingsTab").then(m => ({ default: m.ParentSettingsTab })));
const MiniCalendar = lazy(() => import("@/components/calendar/MiniCalendar").then(m => ({ default: m.MiniCalendar })));

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  photo_url: string | null;
  birth_date: string;
  shift_type?: string | null;
  allergies?: string | null;
  plan_type?: string | null;
}

interface MonthlyTracking {
  id: string;
  month: number;
  year: number;
  weight: number | null;
  height: number | null;
  observations: string | null;
}

// Loading fallback for tabs
const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
  </div>
));

// Quick summary cards component (simplified inline)
const QuickSummary = memo(function QuickSummary({ child }: { child: Child }) {
  const classTypeLabels: Record<string, string> = {
    bercario: "Berçário",
    maternal: "Maternal",
    jardim: "Jardim",
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="p-4 text-center">
          <Avatar className="h-16 w-16 mx-auto mb-2">
            {child.photo_url && <AvatarImage src={child.photo_url} />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {child.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <p className="font-semibold truncate">{child.full_name}</p>
          <Badge variant="outline" className="mt-1">{classTypeLabels[child.class_type] || child.class_type}</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col justify-center h-full">
          <div className="text-center">
            <Calendar className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Turma</p>
            <p className="font-semibold">{classTypeLabels[child.class_type] || child.class_type}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default function ParentDashboard() {
  const { user, profile, signOut, isApproved } = useAuth();
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [activeTab, setActiveTab] = useState("agenda");

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  // Fetch pending registrations
  const { data: pendingRegistrations = [], isLoading: checkingRegistrations, error: registrationsError } = useQuery({
    queryKey: ["parent-registrations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("child_registrations")
        .select("first_name, last_name, status")
        .eq("parent_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Fetch children data
  const { data: children = [], isLoading: loadingChildren, error: childrenError, refetch: refetchChildren } = useQuery({
    queryKey: ["parent-children", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: parentChildren, error: pcError } = await supabase
        .from("parent_children")
        .select("child_id")
        .eq("parent_id", user.id);

      if (pcError) throw pcError;
      if (!parentChildren || parentChildren.length === 0) return [];

      const childIds = parentChildren.map((pc) => pc.child_id);
      const { data, error } = await supabase
        .from("children")
        .select("id, full_name, class_type, photo_url, birth_date, shift_type, allergies, plan_type")
        .in("id", childIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isApproved,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // Fetch growth data
  const { data: growthData = {} } = useQuery({
    queryKey: ["parent-growth-data", children.map(c => c.id).join(",")],
    queryFn: async () => {
      if (children.length === 0) return {};
      const childIds = children.map(c => c.id);
      const { data } = await supabase
        .from("monthly_tracking")
        .select("*")
        .in("child_id", childIds);

      const grouped: Record<string, MonthlyTracking[]> = {};
      data?.forEach((item) => {
        if (!grouped[item.child_id]) grouped[item.child_id] = [];
        grouped[item.child_id].push(item);
      });
      return grouped;
    },
    enabled: children.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  // Auto-select first child
  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
    }
  }, [children, selectedChild]);

  // Fetch unread counts with React Query
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["parent-unread-counts", user?.id, children.map(c => c.id).join(",")],
    queryFn: async () => {
      if (!user || children.length === 0) return {};
      const counts: Record<string, number> = {};
      
      await Promise.all(children.map(async (child) => {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("child_id", child.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);
        counts[child.id] = count || 0;
      }));
      
      return counts;
    },
    enabled: !!user && children.length > 0,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const handleChatClick = useCallback(() => setActiveTab("mensagens"), []);

  // If not approved, show appropriate UI
  if (!isApproved) {
    if (checkingRegistrations) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      );
    }

    if (pendingRegistrations.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light">
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
              <CardHeader className="bg-primary/10 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Baby className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Cadastre seu Pimpolho</CardTitle>
                    <CardDescription>Preencha os dados do seu filho para continuar</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Próximo passo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Para completar seu cadastro, você precisa adicionar os dados do seu filho.
                      Após o envio, a escola irá analisar e aprovar a matrícula.
                    </p>
                  </div>
                </div>
                <Button asChild size="lg" className="w-full gap-2">
                  <Link to="/cadastro-pimpolho">
                    <UserPlus className="w-5 h-5" />
                    Cadastrar meu filho
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light">
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
                  <CardDescription>
                    {pendingRegistrations.length === 1 
                      ? `Cadastro de ${pendingRegistrations[0].first_name} em análise`
                      : `${pendingRegistrations.length} cadastros em análise`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                {pendingRegistrations.map((reg, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-pimpo-yellow/5 rounded-lg border border-pimpo-yellow/20">
                    <Baby className="w-5 h-5 text-pimpo-yellow shrink-0" />
                    <span className="font-medium">{reg.first_name} {reg.last_name}</span>
                    <Badge variant="secondary" className="ml-auto">Pendente</Badge>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">O que acontece agora?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A escola está analisando o cadastro. Você receberá uma notificação quando o acesso for liberado.
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

              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <Link to="/cadastro-pimpolho">
                  <UserPlus className="w-4 h-4" />
                  Adicionar outro filho
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Error state
  if (childrenError || registrationsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-pimpo-blue-light/30 to-background">
        <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
          <div className="container py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>
        <main className="container py-8 max-w-2xl">
          <Card className="shadow-lg border-2 border-destructive/20">
            <CardHeader className="bg-destructive/10 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-destructive/20">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Erro ao carregar dados</CardTitle>
                  <CardDescription>Não foi possível carregar suas informações</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro ao carregar os dados. Isso pode ser um problema temporário de conexão.
              </p>
              <Button onClick={() => refetchChildren()} className="w-full gap-2">
                <Clock className="w-4 h-4" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Loading state
  if (loadingChildren) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-pimpo-blue-light/30 to-background">
        <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
          <div className="container py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            </Link>
            <div className="h-8 w-20 bg-muted/50 rounded animate-pulse" />
          </div>
        </header>
        <main className="container py-6 max-w-5xl space-y-6">
          <div className="h-10 w-64 bg-muted/50 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/50 rounded animate-pulse" />)}
          </div>
          <div className="h-96 bg-muted/50 rounded animate-pulse" />
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
            <NotificationBell />
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
              <p className="text-muted-foreground mb-4">
                Aguardando a escola vincular seus filhos à sua conta
              </p>
              <Button asChild>
                <Link to="/cadastro-pimpolho">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar filho
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Child Selector */}
            {children.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {children.map((child) => (
                  <Button
                    key={child.id}
                    variant={selectedChild?.id === child.id ? "default" : "outline"}
                    className="flex-shrink-0 gap-2"
                    onClick={() => setSelectedChild(child)}
                  >
                    <Avatar className="h-6 w-6">
                      {child.photo_url && <AvatarImage src={child.photo_url} />}
                      <AvatarFallback className="text-xs">
                        {child.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {child.full_name.split(" ")[0]}
                    {(unreadCounts[child.id] || 0) > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                        {unreadCounts[child.id]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {selectedChild && (
              <>
                {/* Quick Summary */}
                <QuickSummary child={selectedChild} />

                {/* Quick Actions - Larger buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Suspense fallback={null}>
                    <PickupNotification childId={selectedChild.id} childName={selectedChild.full_name} />
                  </Suspense>
                  <Suspense fallback={null}>
                    <AbsenceNotification childId={selectedChild.id} childName={selectedChild.full_name} />
                  </Suspense>
                </div>

                {/* Main Tabs */}
                <Card className="overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    {/* Grid layout: 4 columns x 2 rows on mobile */}
                    <div className="border-b bg-muted/30 p-3">
                      <TabsList className="w-full h-auto p-0 bg-transparent grid grid-cols-4 md:flex md:flex-wrap gap-2">
                        <TabsTrigger 
                          value="agenda" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 transition-all min-h-[60px]"
                        >
                          <Calendar className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight">Agenda</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="mensagens" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 relative transition-all min-h-[60px]"
                        >
                          <div className="relative">
                            <MessageSquare className="w-5 h-5" />
                            {(unreadCounts[selectedChild.id] || 0) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-destructive rounded-full animate-pulse border-2 border-card" />
                            )}
                          </div>
                          <span className="text-[11px] font-medium leading-tight">Chat</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="cardapio" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 transition-all min-h-[60px]"
                        >
                          <UtensilsCrossed className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight">Cardápio</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="feed" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 transition-all min-h-[60px]"
                        >
                          <Newspaper className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight">Feed</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="financeiro" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 transition-all min-h-[60px]"
                        >
                          <CreditCard className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight">Finanças</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="avaliacoes" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 transition-all min-h-[60px]"
                        >
                          <GraduationCap className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight">Avaliações</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="config" 
                          className="flex-col rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm py-3 px-2 gap-1.5 transition-all min-h-[60px]"
                        >
                          <Settings className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight">Perfil</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <CardContent className="p-4">
                      <TabsContent value="agenda" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <div className="space-y-4">
                            <TodayAtSchoolWidget childId={selectedChild.id} />
                            <ParentAgendaView childId={selectedChild.id} childName={selectedChild.full_name} />
                          </div>
                        </Suspense>
                      </TabsContent>

                      <TabsContent value="mensagens" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <ParentChatTabs childId={selectedChild.id} childName={selectedChild.full_name} />
                        </Suspense>
                      </TabsContent>

                      <TabsContent value="cardapio" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <WeeklyMenuTab childAllergies={selectedChild.allergies} />
                        </Suspense>
                      </TabsContent>

                      <TabsContent value="feed" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <UnifiedFeedTab childClassType={selectedChild.class_type} />
                        </Suspense>
                      </TabsContent>

                      <TabsContent value="financeiro" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <PaymentsTab childId={selectedChild.id} />
                        </Suspense>
                      </TabsContent>

                      <TabsContent value="avaliacoes" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <QuarterlyEvaluationsTab childId={selectedChild.id} childName={selectedChild.full_name} />
                        </Suspense>
                      </TabsContent>

                      <TabsContent value="config" className="mt-0">
                        <Suspense fallback={<TabLoadingFallback />}>
                          <div className="space-y-6">
                            <ChildProfileTab
                              childId={selectedChild.id}
                              childName={selectedChild.full_name}
                              inviterName={profile?.full_name || "Responsável"}
                            />
                            {growthData[selectedChild.id] && growthData[selectedChild.id].length > 0 && (
                              <GrowthChart data={growthData[selectedChild.id]} childName={selectedChild.full_name} />
                            )}
                            <ParentSettingsTab children={children} />
                          </div>
                        </Suspense>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>

                {/* Side widgets - Weather + Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Suspense fallback={<Skeleton className="h-64" />}>
                    <DetailedWeatherWidget />
                  </Suspense>
                  <Suspense fallback={<Skeleton className="h-64" />}>
                    <MiniCalendar />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
