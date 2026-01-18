import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UtensilsCrossed, ChevronRight, AlertTriangle, Calendar } from "lucide-react";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";

export default function NutritionistDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    childrenWithAllergies: 0,
    menuDaysConfigured: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [allergiesRes, menuRes] = await Promise.all([
          supabase.from("children").select("id", { count: "exact", head: true }).not("allergies", "is", null),
          supabase.from("weekly_menus").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          childrenWithAllergies: allergiesRes.count || 0,
          menuDaysConfigured: menuRes.count || 0,
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
          Painel da Nutricionista
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crianças com Alergias
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-red/10">
              <AlertTriangle className="w-4 h-4 text-pimpo-red" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : stats.childrenWithAllergies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atenção especial no cardápio
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dias de Cardápio
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-green/10">
              <Calendar className="w-4 h-4 text-pimpo-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {loading ? "-" : stats.menuDaysConfigured}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Refeições configuradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link to="/painel/cardapio">
            <Button className="w-full justify-between">
              <span className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                Gerenciar Cardápio Semanal
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/painel/chat-equipe">
            <Button variant="outline" className="w-full justify-start gap-2">
              Chat com a Equipe
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Team Chat Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Chat da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px]">
            <StaffChatWindow />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
