import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { WeatherWidget } from "@/components/admin/WeatherWidget";
import { PickupNotificationsWidget } from "@/components/admin/PickupNotificationsWidget";
import { PendingContractsWidget } from "@/components/admin/PendingContractsWidget";
import { TimeClockStatusCard } from "@/components/admin/TimeClockStatusCard";
import { UpcomingExpensesAlert } from "@/components/admin/UpcomingExpensesAlert";
import { StaffAbsencesWidget } from "@/components/admin/StaffAbsencesWidget";
import { TodayAttendanceWidget } from "@/components/admin/TodayAttendanceWidget";
import { EmailHealthWidget } from "@/components/admin/EmailHealthWidget";
import {
  Users,
  Baby,
  UserCheck,
  Clock,
  ChevronRight,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface DashboardStats {
  totalChildren: number;
  totalTeachers: number;
  pendingApprovals: number;
  todayRecords: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalChildren: 0,
    totalTeachers: 0,
    pendingApprovals: 0,
    todayRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [childrenRes, teachersRes, pendingProfilesRes, pendingRegsRes, recordsRes] = await Promise.all([
          supabase.from("children").select("id", { count: "exact", head: true }),
          supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("child_registrations").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("daily_records").select("id", { count: "exact", head: true }).eq("record_date", new Date().toISOString().split("T")[0]),
        ]);

        setStats({
          totalChildren: childrenRes.count || 0,
          totalTeachers: teachersRes.count || 0,
          pendingApprovals: (pendingProfilesRes.count || 0) + (pendingRegsRes.count || 0),
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

  const statCards = [
    {
      title: "Total de Crianças",
      value: stats.totalChildren,
      icon: Baby,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/painel/criancas",
    },
    {
      title: "Professores Ativos",
      value: stats.totalTeachers,
      icon: Users,
      color: "text-pimpo-green",
      bgColor: "bg-pimpo-green/10",
      href: "/painel/professores",
    },
    {
      title: "Aprovações Pendentes",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "text-pimpo-yellow",
      bgColor: "bg-pimpo-yellow/10",
      href: "/painel/aprovacoes",
      badge: stats.pendingApprovals > 0 ? "Novo" : undefined,
    },
    {
      title: "Agendas Hoje",
      value: stats.todayRecords,
      icon: Calendar,
      color: "text-pimpo-red",
      bgColor: "bg-pimpo-red/10",
      href: "/painel/agenda",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral da Creche Pimpolinhos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-fredoka font-bold">
                    {loading ? "-" : stat.value}
                  </div>
                  {stat.badge && (
                    <Badge variant="destructive" className="mt-1">
                      {stat.badge}
                    </Badge>
                  )}
                </div>
                <Link to={stat.href}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weather, Time Clock, Alerts, Pickup Notifications and Pending Contracts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <WeatherWidget />
          <TodayAttendanceWidget />
          <StaffAbsencesWidget />
        </div>
        <div className="space-y-4">
          <UpcomingExpensesAlert />
          <TimeClockStatusCard />
          <EmailHealthWidget />
          <PendingContractsWidget />
        </div>
        <div>
          <PickupNotificationsWidget />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link to="/painel/aprovacoes">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Aprovar Cadastros Pendentes
                </span>
                {stats.pendingApprovals > 0 && (
                  <Badge variant="destructive">{stats.pendingApprovals}</Badge>
                )}
              </Button>
            </Link>
            <Link to="/painel/criancas">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Baby className="w-4 h-4" />
                Cadastrar Nova Criança
              </Button>
            </Link>
            <Link to="/painel/professores">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="w-4 h-4" />
                Adicionar Professor
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pimpo-green" />
              Resumo do Dia
            </CardTitle>
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
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Agendas preenchidas hoje
                </span>
                <span className="font-semibold">
                  {loading ? "-" : `${stats.todayRecords}/${stats.totalChildren}`}
                </span>
              </div>
              <Link to="/painel/agenda">
                <Button className="w-full mt-2">
                  Ir para Agenda Digital
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
