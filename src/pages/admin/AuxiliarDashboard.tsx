import { lazy, Suspense, memo, useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Baby, ChevronRight, ClipboardList, Calendar, DollarSign, LayoutDashboard, Settings, Users } from "lucide-react";
import { DashboardHeader, StatCard, StatGrid } from "@/components/admin/dashboards";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Lazy load heavy components
const MyReportsTab = lazy(() => import("@/components/employee/MyReportsTab").then(m => ({ default: m.MyReportsTab })));
const EmployeeSettingsTab = lazy(() => import("@/components/employee/EmployeeSettingsTab").then(m => ({ default: m.EmployeeSettingsTab })));
const StaffChatWindow = lazy(() => import("@/components/staff/StaffChatWindow").then(m => ({ default: m.StaffChatWindow })));

const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
  </div>
));

export default function AuxiliarDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inicio");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["auxiliar-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [childrenRes, recordsRes] = await Promise.all([
        supabase.from("children").select("id", { count: "exact", head: true }),
        supabase.from("daily_records").select("id", { count: "exact", head: true }).eq("record_date", today),
      ]);

      return {
        totalChildren: childrenRes.count || 0,
        todayRecords: recordsRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch unread messages count
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["auxiliar-unread-messages", user?.id],
    queryFn: async () => {
      const { data: generalRoom } = await supabase
        .from("staff_chat_rooms")
        .select("id")
        .eq("is_general", true)
        .maybeSingle();

      if (!generalRoom || !user) return 0;

      const { count } = await supabase
        .from("staff_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_id", generalRoom.id)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      return count || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  // Realtime subscription for unread messages count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('auxiliar_unread_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_messages' },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ["auxiliar-unread-messages", user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'staff_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["auxiliar-unread-messages", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const formattedDate = useMemo(() =>
    new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <DashboardHeader
        greeting={`Olá, ${profile?.full_name?.split(" ")[0]}! 👋`}
        subtitle="Painel de Auxiliar de Sala"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b bg-muted/30 overflow-x-auto scrollbar-hide">
          <TabsList className="w-max min-w-full h-auto p-0 bg-transparent rounded-none flex">
            <TabsTrigger
              value="inicio"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 gap-2 whitespace-nowrap flex-shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Início</span>
            </TabsTrigger>
            <TabsTrigger
              value="equipe"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 gap-2 relative whitespace-nowrap flex-shrink-0"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Equipe</span>
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  {unreadMessages}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="relatorios"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 gap-2 whitespace-nowrap flex-shrink-0"
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Meus Relatórios</span>
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Configurações</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="pt-4">
          <TabsContent value="inicio" className="mt-0 space-y-6">
            <StatGrid columns={2}>
              <StatCard
                icon={Baby}
                iconColor="text-primary"
                value={stats?.totalChildren || 0}
                label="Total de Crianças"
              />
              <StatCard
                icon={ClipboardList}
                iconColor="text-pimpo-green"
                bgColor="bg-pimpo-green/10"
                borderColor="border-pimpo-green/30"
                value={`${stats?.todayRecords || 0}/${stats?.totalChildren || 0}`}
                label="Agendas Hoje"
              />
            </StatGrid>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Link to="/painel/agenda">
                  <Button className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Preencher Agenda Digital
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/painel/chamada">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Calendar className="w-4 h-4" />
                    Registrar Chamada
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveTab("equipe")}
                >
                  <Users className="w-4 h-4" />
                  Chat com a Equipe
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Data</span>
                    <span className="font-semibold">{formattedDate}</span>
                  </div>
                  <Link to="/painel/agenda">
                    <Button className="w-full">
                      Ir para Agenda Digital
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipe" className="mt-0">
            <Suspense fallback={<TabLoadingFallback />}>
              <StaffChatWindow />
            </Suspense>
          </TabsContent>

          <TabsContent value="relatorios" className="mt-0">
            <Suspense fallback={<TabLoadingFallback />}>
              <MyReportsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="config" className="mt-0">
            <Suspense fallback={<TabLoadingFallback />}>
              <EmployeeSettingsTab />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

