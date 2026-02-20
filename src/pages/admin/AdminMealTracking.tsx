import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  UtensilsCrossed,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Cookie,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  shift_type: string;
  allergies: string | null;
  dietary_restrictions: string | null;
}

interface MealTracking {
  id: string;
  child_id: string;
  meal_date: string;
  breakfast_served: boolean | null;
  breakfast_time: string | null;
  morning_snack_served: boolean | null;
  morning_snack_time: string | null;
  lunch_served: boolean | null;
  lunch_time: string | null;
  afternoon_snack_served: boolean | null;
  afternoon_snack_time: string | null;
  dinner_served: boolean | null;
  dinner_time: string | null;
  special_diet_notes: string | null;
}

const MEALS = [
  { key: "breakfast", label: "Café da Manhã", icon: Coffee, time: "07:30" },
  { key: "morning_snack", label: "Lanche da Manhã", icon: Cookie, time: "09:30" },
  { key: "lunch", label: "Almoço", icon: Sun, time: "11:30" },
  { key: "afternoon_snack", label: "Lanche da Tarde", icon: Sunset, time: "15:00" },
  { key: "dinner", label: "Jantar", icon: Moon, time: "17:30" },
];

const CLASS_LABELS: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export default function AdminMealTracking() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [tracking, setTracking] = useState<Map<string, MealTracking>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [changes, setChanges] = useState<Map<string, Partial<MealTracking>>>(new Map());

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    fetchData();
  }, [formattedDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const [childrenRes, trackingRes] = await Promise.all([
        supabase
          .from("children")
          .select("id, full_name, class_type, shift_type, allergies, dietary_restrictions")
          .order("full_name"),
        supabase
          .from("meal_tracking")
          .select("*")
          .eq("meal_date", formattedDate),
      ]);

      if (childrenRes.error) throw childrenRes.error;
      if (trackingRes.error) throw trackingRes.error;

      setChildren(childrenRes.data || []);
      
      const trackingMap = new Map<string, MealTracking>();
      (trackingRes.data || []).forEach(t => {
        trackingMap.set(t.child_id, t);
      });
      setTracking(trackingMap);
      setChanges(new Map());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  function updateMeal(childId: string, mealKey: string, served: boolean) {
    const currentTime = format(new Date(), "HH:mm");
    
    setChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(childId) || {};
      next.set(childId, {
        ...existing,
        [`${mealKey}_served`]: served,
        [`${mealKey}_time`]: served ? currentTime : null,
      });
      return next;
    });
  }

  function updateNotes(childId: string, notes: string) {
    setChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(childId) || {};
      next.set(childId, {
        ...existing,
        special_diet_notes: notes,
      });
      return next;
    });
  }

  async function saveChanges() {
    if (changes.size === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    setSaving(true);
    try {
      for (const [childId, changeData] of changes.entries()) {
        const existingRecord = tracking.get(childId);
        
        if (existingRecord) {
          const { error } = await supabase
            .from("meal_tracking")
            .update({
              ...changeData,
              recorded_by: user?.id,
            })
            .eq("id", existingRecord.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("meal_tracking")
            .insert({
              child_id: childId,
              meal_date: formattedDate,
              recorded_by: user?.id,
              ...changeData,
            });
          
          if (error) throw error;
        }
      }

      toast.success("Alterações salvas com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  function getMealStatus(childId: string, mealKey: string): boolean {
    const change = changes.get(childId);
    if (change && `${mealKey}_served` in change) {
      return change[`${mealKey}_served` as keyof typeof change] as boolean;
    }
    const record = tracking.get(childId);
    return record?.[`${mealKey}_served` as keyof MealTracking] as boolean || false;
  }

  function getNotes(childId: string): string {
    const change = changes.get(childId);
    if (change && "special_diet_notes" in change) {
      return change.special_diet_notes || "";
    }
    return tracking.get(childId)?.special_diet_notes || "";
  }

  const filteredChildren = children.filter(child => {
    const matchesSearch = child.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesClass = classFilter === "all" || child.class_type === classFilter;
    return matchesSearch && matchesClass;
  });

  const childrenWithRestrictions = children.filter(c => c.allergies || c.dietary_restrictions);

  // Stats
  const totalMealsServed = filteredChildren.reduce((acc, child) => {
    return acc + MEALS.filter(meal => getMealStatus(child.id, meal.key)).length;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-primary" />
            Controle de Refeições
          </h1>
          <p className="text-muted-foreground">
            Registre as refeições servidas às crianças
          </p>
        </div>
        <Button onClick={saveChanges} disabled={saving || changes.size === 0}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar ({changes.size} alterações)
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(prev => new Date(prev.getTime() - 86400000))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(prev => new Date(prev.getTime() + 86400000))}
              disabled={format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar criança..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            <SelectItem value="bercario">Berçário</SelectItem>
            <SelectItem value="maternal">Maternal</SelectItem>
            <SelectItem value="jardim">Jardim</SelectItem>
          </SelectContent>
        </Select>
        <Card>
          <CardContent className="py-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalMealsServed}</p>
              <p className="text-xs text-muted-foreground">Refeições servidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restrictions Alert */}
      {childrenWithRestrictions.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
              Atenção: Crianças com Restrições Alimentares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {childrenWithRestrictions.map(child => (
                <Badge key={child.id} variant="outline" className="text-orange-600 border-orange-500/30">
                  {child.full_name.split(" ")[0]}: {child.allergies || child.dietary_restrictions}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meal Tracking Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Refeições</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredChildren.map((child) => {
                const hasRestriction = child.allergies || child.dietary_restrictions;
                
                return (
                  <div
                    key={child.id}
                    className={`p-4 rounded-lg border ${
                      hasRestriction ? "border-orange-500/30 bg-orange-500/5" : ""
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{child.full_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {CLASS_LABELS[child.class_type] || child.class_type}
                          </Badge>
                          {hasRestriction && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        {hasRestriction && (
                          <p className="text-xs text-orange-600">
                            ⚠️ {child.allergies || child.dietary_restrictions}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {MEALS.map((meal) => {
                          const Icon = meal.icon;
                          const served = getMealStatus(child.id, meal.key);
                          
                          return (
                            <div
                              key={meal.key}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={`${child.id}-${meal.key}`}
                                checked={served}
                                onCheckedChange={(checked) => 
                                  updateMeal(child.id, meal.key, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`${child.id}-${meal.key}`}
                                className={`flex items-center gap-1 text-xs cursor-pointer ${
                                  served ? "text-green-600 font-medium" : "text-muted-foreground"
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                <span className="hidden sm:inline">{meal.label.split(" ")[0]}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {hasRestriction && (
                      <div className="mt-3">
                        <Textarea
                          placeholder="Observações sobre dieta especial..."
                          value={getNotes(child.id)}
                          onChange={(e) => updateNotes(child.id, e.target.value)}
                          className="h-16 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
