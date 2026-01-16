import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GrowthTrackingDialog } from "@/components/admin/GrowthTrackingDialog";
import { GrowthChart } from "@/components/parent/GrowthChart";
import {
  Baby,
  Search,
  Loader2,
  Scale,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type MonthlyTracking = Database["public"]["Tables"]["monthly_tracking"]["Row"];

const classTypeLabels: Record<ClassType, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function AdminGrowth() {
  const [children, setChildren] = useState<Child[]>([]);
  const [trackingData, setTrackingData] = useState<Record<string, MonthlyTracking[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [childrenRes, trackingRes] = await Promise.all([
        supabase.from("children").select("*").order("full_name"),
        supabase.from("monthly_tracking").select("*"),
      ]);

      if (childrenRes.data) setChildren(childrenRes.data);
      
      if (trackingRes.data) {
        const grouped: Record<string, MonthlyTracking[]> = {};
        trackingRes.data.forEach((item) => {
          if (!grouped[item.child_id]) {
            grouped[item.child_id] = [];
          }
          grouped[item.child_id].push(item);
        });
        setTrackingData(grouped);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  const filteredChildren = children.filter((child) => {
    const matchesSearch = child.full_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === "all" || child.class_type === classFilter;
    return matchesSearch && matchesClass;
  });

  const getLatestMeasurement = (childId: string) => {
    const data = trackingData[childId];
    if (!data || data.length === 0) return null;
    
    return data.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })[0];
  };

  const hasCurrentMonthData = (childId: string) => {
    const data = trackingData[childId];
    if (!data) return false;
    return data.some(
      (item) => item.month === currentMonth && item.year === currentYear
    );
  };

  const statsWithData = children.filter((c) => (trackingData[c.id]?.length || 0) > 0).length;
  const statsCurrentMonth = children.filter((c) => hasCurrentMonthData(c.id)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Acompanhamento de Crescimento
        </h1>
        <p className="text-muted-foreground mt-1">
          Registre e acompanhe o peso e altura das crianças
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-primary/10">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{children.length}</p>
              <p className="text-sm text-muted-foreground">Total de Crianças</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-green/10">
              <TrendingUp className="w-6 h-6 text-pimpo-green" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{statsWithData}</p>
              <p className="text-sm text-muted-foreground">Com Histórico</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-blue/10">
              <Scale className="w-6 h-6 text-pimpo-blue" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{statsCurrentMonth}</p>
              <p className="text-sm text-muted-foreground">Medidos Este Mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Children List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecionar Criança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Turmas</SelectItem>
                  {Constants.public.Enums.class_type.map((type) => (
                    <SelectItem key={type} value={type}>
                      {classTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Children List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredChildren.map((child) => {
                const latest = getLatestMeasurement(child.id);
                const hasCurrentMonth = hasCurrentMonthData(child.id);
                const isSelected = selectedChild?.id === child.id;

                return (
                  <div
                    key={child.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50 border-transparent"
                    }`}
                    onClick={() => setSelectedChild(child)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="font-fredoka font-bold text-primary">
                            {child.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{child.full_name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {classTypeLabels[child.class_type]}
                            </Badge>
                            {hasCurrentMonth && (
                              <span className="text-xs text-pimpo-green">✓ Mês atual</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    {latest && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Última: {monthNames[latest.month - 1]}/{latest.year} — 
                        {latest.weight && ` ${latest.weight}kg`}
                        {latest.height && ` ${latest.height}cm`}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredChildren.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma criança encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Growth Details */}
        <div className="lg:col-span-2">
          {selectedChild ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-fredoka text-2xl font-bold">
                    {selectedChild.full_name}
                  </h2>
                  <Badge variant="secondary">
                    {classTypeLabels[selectedChild.class_type]}
                  </Badge>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  <Scale className="w-4 h-4 mr-2" />
                  Registrar Medição
                </Button>
              </div>

              <GrowthChart
                data={trackingData[selectedChild.id] || []}
                childName={selectedChild.full_name}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Baby className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Selecione uma criança para ver o histórico de crescimento
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Growth Tracking Dialog */}
      {selectedChild && (
        <GrowthTrackingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          childId={selectedChild.id}
          childName={selectedChild.full_name}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
