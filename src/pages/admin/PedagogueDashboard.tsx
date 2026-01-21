import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, ChevronRight, Baby, Calendar, GraduationCap, Newspaper } from "lucide-react";
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";

export default function PedagogueDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalChildren: 0,
    bercario: 0,
    maternal: 0,
    jardim: 0,
    weeklyPlans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [childrenRes, bercarioRes, maternalRes, jardimRes, plansRes] = await Promise.all([
          supabase.from("children").select("id", { count: "exact", head: true }),
          supabase.from("children").select("id", { count: "exact", head: true }).eq("class_type", "bercario"),
          supabase.from("children").select("id", { count: "exact", head: true }).eq("class_type", "maternal"),
          supabase.from("children").select("id", { count: "exact", head: true }).eq("class_type", "jardim"),
          supabase.from("weekly_activity_plans").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          totalChildren: childrenRes.count || 0,
          bercario: bercarioRes.count || 0,
          maternal: maternalRes.count || 0,
          jardim: jardimRes.count || 0,
          weeklyPlans: plansRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Olá, {profile?.full_name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Painel Pedagógico
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Crianças
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Baby className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : stats.totalChildren}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Berçário
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-blue/10">
              <Baby className="w-4 h-4 text-pimpo-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : stats.bercario}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maternal
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-green/10">
              <Baby className="w-4 h-4 text-pimpo-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : stats.maternal}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jardim
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-yellow/10">
              <Baby className="w-4 h-4 text-pimpo-yellow" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : stats.jardim}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Planos de Atividades
            <Badge variant="secondary">{stats.weeklyPlans} cadastrados</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Gerencie os planos de atividades semanais para cada turma
          </p>
          <Link to="/painel/agenda">
            <Button className="w-full sm:w-auto">
              <Calendar className="w-4 h-4 mr-2" />
              Gerenciar Planos Semanais
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick Post Creator */}
      <QuickPostCreator />

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
          <Link to="/painel/chat-equipe">
            <Button variant="outline" className="w-full justify-start gap-2">
              Chat com a Equipe
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
