import { lazy, Suspense, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Baby, ChevronRight, ClipboardList, Calendar, DollarSign, LayoutDashboard, Settings } from "lucide-react";
import { DashboardHeader, StatCard, StatGrid } from "@/components/admin/dashboards";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// Lazy load heavy components
const MyReportsTab = lazy(() => import("@/components/employee/MyReportsTab").then(m => ({ default: m.MyReportsTab })));
const EmployeeSettingsTab = lazy(() => import("@/components/employee/EmployeeSettingsTab").then(m => ({ default: m.EmployeeSettingsTab })));

const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
  </div>
));

export default function AuxiliarDashboard() {
  const { profile } = useAuth();
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
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="w-max min-w-full flex">
            <TabsTrigger value="inicio" className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap px-4">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Início</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap px-4">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Meus Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap px-4">
              <Settings className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Configurações</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inicio" className="mt-4 space-y-6">
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
              <Link to="/painel/chat-equipe">
                <Button variant="outline" className="w-full justify-start gap-2">
                  Chat com a Equipe
                </Button>
              </Link>
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

        <TabsContent value="relatorios" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <MyReportsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <EmployeeSettingsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
