import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BookOpen,
  Baby,
  Calendar,
  GraduationCap,
  Newspaper,
  MessageSquare,
  Users,
  DollarSign,
  Settings,
  FileText,
  Star,
} from "lucide-react";

// Extracted Components
import { WeeklyPlanningTab } from "@/components/admin/pedagogue/WeeklyPlanningTab";
import { EvaluationsTab } from "@/components/admin/pedagogue/EvaluationsTab";

// Other Tabs components
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
import { MyReportsTab } from "@/components/employee/MyReportsTab";
import { EmployeeSettingsTab } from "@/components/employee/EmployeeSettingsTab";
import { TeacherParentChat } from "@/components/teacher/TeacherParentChat";

import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];

export default function PedagogueDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("planejamento");
  const [loading, setLoading] = useState(true);
  const [plusChildren, setPlusChildren] = useState<Child[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalChildren: 0,
    pendingEvaluations: 0,
    weeklyPlans: 0,
    plusChildren: 0,
  });

  // Fetch stats and data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const year = new Date().getFullYear();
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

        const childrenQuery = supabase.from("children").select("id", { count: "exact", head: true });
        const plansQuery = supabase.from("weekly_activity_plans").select("id", { count: "exact", head: true });
        // Fetch children with plan_type 'plus' 
        const plusQuery = supabase.from("children").select("*").eq("plan_type", "plus");

        const [childrenRes, plansRes, plusRes] = await Promise.all([
          childrenQuery,
          plansQuery,
          plusQuery,
        ]);

        const children = plusRes.data || [];
        setPlusChildren(children);

        // Fetch pending evaluations count accurately
        let pendingEvals = children.length;
        if (children.length > 0) {
          const { count } = await supabase
            .from("quarterly_evaluations")
            .select("id", { count: "exact", head: true })
            .eq("quarter", currentQuarter)
            .eq("year", year)
            .in("child_id", children.map(c => c.id));

          if (count !== null) {
            pendingEvals = pendingEvals - count;
          }
        }

        setStats({
          totalChildren: childrenRes.count || 0,
          pendingEvaluations: pendingEvals,
          weeklyPlans: plansRes.count || 0,
          plusChildren: children.length,
        });

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-purple-600" />
          Olá, {profile?.full_name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Painel Pedagógico • {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <GraduationCap className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <p className="text-xl sm:text-2xl font-fredoka font-bold text-purple-600">
              {loading ? "-" : stats.pendingEvaluations}
            </p>
            <p className="text-xs text-muted-foreground">Avaliações Pend.</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-xl sm:text-2xl font-fredoka font-bold text-green-600">
              {loading ? "-" : stats.weeklyPlans}
            </p>
            <p className="text-xs text-muted-foreground">Planos Semanais</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <Baby className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-xl sm:text-2xl font-fredoka font-bold text-blue-600">
              {loading ? "-" : stats.totalChildren}
            </p>
            <p className="text-xs text-muted-foreground">Total Crianças</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <Star className="w-5 h-5 mx-auto mb-1 text-amber-600" />
            <p className="text-xl sm:text-2xl font-fredoka font-bold text-amber-600">
              {loading ? "-" : stats.plusChildren}
            </p>
            <p className="text-xs text-muted-foreground">Alunos Plus+</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b bg-muted/30 overflow-x-auto scrollbar-hide">
              <TabsList className="w-max min-w-full h-auto p-0 bg-transparent rounded-none flex">
                <TabsTrigger
                  value="planejamento"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Planos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="avaliacoes"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Avaliações</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pais"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Pais</span>
                </TabsTrigger>
                <TabsTrigger
                  value="equipe"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Equipe</span>
                </TabsTrigger>
                <TabsTrigger
                  value="relatorios"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Relatórios</span>
                </TabsTrigger>
                <TabsTrigger
                  value="config"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Config</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Planejamento Tab */}
              <TabsContent value="planejamento" className="mt-0">
                <WeeklyPlanningTab />
              </TabsContent>

              {/* Avaliações Plus+ Tab */}
              <TabsContent value="avaliacoes" className="mt-0">
                <EvaluationsTab plusChildren={plusChildren} />
              </TabsContent>

              {/* Chat Pais Tab */}
              <TabsContent value="pais" className="mt-0">
                <TeacherParentChat />
              </TabsContent>

              {/* Chat Equipe Tab */}
              <TabsContent value="equipe" className="mt-0">
                <div className="h-[60vh] max-h-[600px] min-h-[400px]">
                  <StaffChatWindow />
                </div>
              </TabsContent>

              {/* Meus Relatórios Tab */}
              <TabsContent value="relatorios" className="mt-0">
                <MyReportsTab />
              </TabsContent>

              {/* Configurações Tab */}
              <TabsContent value="config" className="mt-0">
                <EmployeeSettingsTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Mini Calendar + Quick Post Creator */}
      <div className="grid lg:grid-cols-2 gap-6">
        <MiniCalendar />
        <QuickPostCreator />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link to="/painel/criancas">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Baby className="w-4 h-4" />
              Ver Lista de Crianças
            </Button>
          </Link>
          <Link to="/painel/avaliacoes">
            <Button variant="outline" className="w-full justify-start gap-2">
              <GraduationCap className="w-4 h-4" />
              Todas as Avaliações
            </Button>
          </Link>
          <Link to="/painel/feed">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Newspaper className="w-4 h-4" />
              Feed da Escola
            </Button>
          </Link>
          <Link to="/painel/eventos">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Calendar className="w-4 h-4" />
              Calendário de Eventos
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
