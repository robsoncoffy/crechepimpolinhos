import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Baby, ChevronRight, ClipboardList, Calendar, MessageSquare } from "lucide-react";

export default function AuxiliarDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalChildren: 0,
    todayRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [childrenRes, recordsRes] = await Promise.all([
          supabase.from("children").select("id", { count: "exact", head: true }),
          supabase.from("daily_records").select("id", { count: "exact", head: true }).eq("record_date", new Date().toISOString().split("T")[0]),
        ]);

        setStats({
          totalChildren: childrenRes.count || 0,
          todayRecords: recordsRes.count || 0,
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
          Painel de Auxiliar de Sala
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
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
              Agendas Hoje
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-green/10">
              <ClipboardList className="w-4 h-4 text-pimpo-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : `${stats.todayRecords}/${stats.totalChildren}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Preenchidas hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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
          <Link to="/painel/mensagens">
            <Button variant="outline" className="w-full justify-start gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensagens com Pais
            </Button>
          </Link>
          <Link to="/painel/chat-equipe">
            <Button variant="outline" className="w-full justify-start gap-2">
              Chat com a Equipe
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Data</span>
              <span className="font-semibold">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
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
    </div>
  );
}
