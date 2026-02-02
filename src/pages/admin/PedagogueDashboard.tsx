import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Baby,
  Calendar,
  GraduationCap,
  Newspaper,
  Save,
  Edit,
  Sun,
  Moon,
  Package,
  Target,
  FileText,
  MessageSquare,
  Users,
  Brain,
  Heart,
  Sparkles,
  Loader2,
  Star,
  ArrowRight,
  Wand2,
  Palette,
  BookMarked,
  DollarSign,
  Settings,
} from "lucide-react";
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
import { MyReportsTab } from "@/components/employee/MyReportsTab";
import { EmployeeSettingsTab } from "@/components/employee/EmployeeSettingsTab";
import { TeacherParentChat } from "@/components/teacher/TeacherParentChat";
import { ActivitySuggestions } from "@/components/admin/ActivitySuggestions";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];

interface WeeklyPlan {
  id?: string;
  class_type: ClassType;
  week_start: string;
  day_of_week: number;
  morning_activities: string;
  afternoon_activities: string;
  materials: string;
  objectives: string;
  notes: string;
}

interface Evaluation {
  cognitive: string;
  motor: string;
  socialEmotional: string;
  language: string;
  creativity: string;
  summary: string;
  recommendations: string;
  nextSteps: string;
}

const daysOfWeek = [
  { value: 0, label: "Segunda", fullLabel: "Segunda-feira" },
  { value: 1, label: "Terça", fullLabel: "Terça-feira" },
  { value: 2, label: "Quarta", fullLabel: "Quarta-feira" },
  { value: 3, label: "Quinta", fullLabel: "Quinta-feira" },
  { value: 4, label: "Sexta", fullLabel: "Sexta-feira" },
];

const classTypes = [
  { value: "bercario" as ClassType, label: "Berçário", icon: Baby },
  { value: "maternal" as ClassType, label: "Maternal", icon: BookMarked },
  { value: "jardim" as ClassType, label: "Jardim", icon: Palette },
];

const quarterLabels: Record<number, string> = {
  1: "1º Trimestre",
  2: "2º Trimestre",
  3: "3º Trimestre",
  4: "4º Trimestre",
};

const emptyEvaluation: Evaluation = {
  cognitive: "",
  motor: "",
  socialEmotional: "",
  language: "",
  creativity: "",
  summary: "",
  recommendations: "",
  nextSteps: "",
};

export default function PedagogueDashboard() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState("planejamento");
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    totalChildren: 0,
    pendingEvaluations: 0,
    weeklyPlans: 0,
    plusChildren: 0,
  });

  // Planning states
  const [selectedClass, setSelectedClass] = useState<ClassType>("maternal");
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 5 ? today - 1 : 0;
  });
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Record<string, Record<number, WeeklyPlan>>>({
    bercario: {},
    maternal: {},
    jardim: {},
  });

  // Evaluation states
  const [plusChildren, setPlusChildren] = useState<Child[]>([]);
  const [selectedEvalChild, setSelectedEvalChild] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3));
  const [evaluation, setEvaluation] = useState<Evaluation>(emptyEvaluation);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [savingEval, setSavingEval] = useState(false);

  // Fetch stats and data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const childrenQuery = supabase.from("children").select("id", { count: "exact", head: true });
        const plansQuery = supabase.from("weekly_activity_plans").select("id", { count: "exact", head: true });
        // Fetch children with plan_type 'plus' 
        const plusQuery = supabase.from("children").select("*").eq("plan_type", "plus");

        const [childrenRes, plansRes, plusRes] = await Promise.all([
          childrenQuery,
          plansQuery,
          plusQuery,
        ]);

        setStats({
          totalChildren: childrenRes.count || 0,
          pendingEvaluations: plusRes.data?.length || 0,
          weeklyPlans: plansRes.count || 0,
          plusChildren: plusRes.data?.length || 0,
        });

        setPlusChildren(plusRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Fetch weekly plans when week or class changes
  useEffect(() => {
    async function fetchPlans() {
      const weekStartStr = format(currentWeek, "yyyy-MM-dd");
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plansQuery = supabase
        .from("weekly_activity_plans")
        .select("*")
        .eq("week_start", weekStartStr) as any;
      
      const { data, error } = await plansQuery;

      if (error) {
        console.error("Error fetching plans:", error);
        return;
      }

      const plansByClass: Record<string, Record<number, WeeklyPlan>> = {
        bercario: {},
        maternal: {},
        jardim: {},
      };

      (data || []).forEach((plan: any) => {
        plansByClass[plan.class_type][plan.day_of_week] = {
          id: plan.id,
          class_type: plan.class_type,
          week_start: plan.week_start,
          day_of_week: plan.day_of_week,
          morning_activities: plan.morning_activities || "",
          afternoon_activities: plan.afternoon_activities || "",
          materials: plan.materials || "",
          objectives: plan.objectives || "",
          notes: plan.notes || "",
        };
      });

      setPlans(plansByClass);
    }

    fetchPlans();
  }, [currentWeek]);

  // Fetch evaluation when child/quarter changes
  useEffect(() => {
    if (!selectedEvalChild) {
      setEvaluation(emptyEvaluation);
      return;
    }

    async function fetchEvaluation() {
      const year = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from("quarterly_evaluations")
        .select("*")
        .eq("child_id", selectedEvalChild)
        .eq("quarter", selectedQuarter)
        .eq("year", year)
        .maybeSingle();

      if (error) {
        console.error("Error fetching evaluation:", error);
        return;
      }

      if (data) {
        setEvaluation({
          cognitive: data.cognitive_development || "",
          motor: data.motor_development || "",
          socialEmotional: data.social_emotional || "",
          language: data.language_development || "",
          creativity: data.creativity_arts || "",
          summary: data.overall_summary || "",
          recommendations: data.recommendations || "",
          nextSteps: data.next_steps || "",
        });
      } else {
        setEvaluation(emptyEvaluation);
      }
    }

    fetchEvaluation();
  }, [selectedEvalChild, selectedQuarter]);

  const weekEnd = addDays(currentWeek, 4);

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const currentPlan = plans[selectedClass]?.[selectedDay] || {
    morning_activities: "",
    afternoon_activities: "",
    materials: "",
    objectives: "",
    notes: "",
  };

  const updatePlan = (field: keyof WeeklyPlan, value: string) => {
    setPlans((prev) => ({
      ...prev,
      [selectedClass]: {
        ...prev[selectedClass],
        [selectedDay]: {
          ...prev[selectedClass][selectedDay],
          class_type: selectedClass,
          week_start: format(currentWeek, "yyyy-MM-dd"),
          day_of_week: selectedDay,
          [field]: value,
        },
      },
    }));
  };

  const handleSavePlan = async () => {
    setSaving(true);
    const plan = plans[selectedClass][selectedDay];
    
    try {
      if (plan?.id) {
        await supabase
          .from("weekly_activity_plans")
          .update({
            morning_activities: plan.morning_activities,
            afternoon_activities: plan.afternoon_activities,
            materials: plan.materials,
            objectives: plan.objectives,
            notes: plan.notes,
          })
          .eq("id", plan.id);
      } else {
        const { data } = await supabase
          .from("weekly_activity_plans")
          .insert({
            class_type: selectedClass,
            week_start: format(currentWeek, "yyyy-MM-dd"),
            day_of_week: selectedDay,
            morning_activities: plan?.morning_activities || "",
            afternoon_activities: plan?.afternoon_activities || "",
            materials: plan?.materials || "",
            objectives: plan?.objectives || "",
            notes: plan?.notes || "",
          })
          .select()
          .single();

        if (data) {
          setPlans((prev) => ({
            ...prev,
            [selectedClass]: {
              ...prev[selectedClass],
              [selectedDay]: { ...plan, id: data.id },
            },
          }));
        }
      }

      toast.success("Plano salvo com sucesso!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  // AI Generation for evaluation
  const generateWithAI = async (field: string) => {
    if (!selectedEvalChild) return;
    
    const child = plusChildren.find((c) => c.id === selectedEvalChild);
    if (!child) return;

    setIsGeneratingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke("evaluation-ai-suggestions", {
        body: {
          childName: child.full_name,
          childClass: child.class_type,
          quarter: selectedQuarter,
          field,
          existingData: evaluation,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (field === "all" && data.evaluation) {
        setEvaluation(data.evaluation);
      } else if (data.text) {
        setEvaluation((prev) => ({ ...prev, [field]: data.text }));
      }
    } catch (error: any) {
      console.error("Error generating AI evaluation:", error);
      toast.error("Erro ao gerar avaliação com IA");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selectedEvalChild || !user) return;

    setSavingEval(true);
    const year = new Date().getFullYear();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingQuery = supabase
        .from("quarterly_evaluations")
        .select("id")
        .eq("child_id", selectedEvalChild)
        .eq("quarter", selectedQuarter)
        .eq("year", year)
        .maybeSingle();
      
      const { data: existing } = await existingQuery;

      const evalData = {
        cognitive_development: evaluation.cognitive,
        motor_development: evaluation.motor,
        social_emotional: evaluation.socialEmotional,
        language_development: evaluation.language,
        creativity_arts: evaluation.creativity,
        overall_summary: evaluation.summary,
        recommendations: evaluation.recommendations,
        next_steps: evaluation.nextSteps,
      };

      if (existing) {
        await supabase
          .from("quarterly_evaluations")
          .update(evalData)
          .eq("id", existing.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertQuery = supabase.from("quarterly_evaluations").insert({
          child_id: selectedEvalChild,
          quarter: selectedQuarter,
          year,
          created_by: user.id,
          ...evalData,
        } as any);
        await insertQuery;
      }

      toast.success("Avaliação salva com sucesso!");
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("Erro ao salvar avaliação");
    } finally {
      setSavingEval(false);
    }
  };

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
              {loading ? "-" : stats.plusChildren}
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
              <TabsContent value="planejamento" className="mt-0 space-y-4">
                {/* Week Navigation */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <p className="font-semibold">
                    Semana: {format(currentWeek, "d MMM", { locale: ptBR })} - {format(weekEnd, "d MMM", { locale: ptBR })}
                  </p>
                  <Button variant="outline" size="icon" onClick={handleNextWeek}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Class Selector */}
                <div className="flex gap-2 flex-wrap">
                  {classTypes.map((cls) => {
                    const Icon = cls.icon;
                    return (
                      <Button
                        key={cls.value}
                        variant={selectedClass === cls.value ? "default" : "outline"}
                        onClick={() => setSelectedClass(cls.value)}
                        className={selectedClass === cls.value ? "bg-purple-600 hover:bg-purple-700" : ""}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {cls.label}
                      </Button>
                    );
                  })}
                </div>

                {/* Day Tabs */}
                <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                  <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                    <TabsList className="w-max min-w-full flex">
                      {daysOfWeek.map((day) => (
                        <TabsTrigger key={day.value} value={String(day.value)} className="text-xs sm:text-sm flex-shrink-0 whitespace-nowrap px-3">
                          {day.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {daysOfWeek.map((day) => (
                    <TabsContent key={day.value} value={String(day.value)}>
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <CardTitle className="text-lg">{day.fullLabel}</CardTitle>
                              <CardDescription>{classTypes.find((c) => c.value === selectedClass)?.label}</CardDescription>
                            </div>
                            {isEditing ? (
                              <div className="flex gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSavePlan}
                                  disabled={saving}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                  Salvar
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="self-start sm:self-auto" onClick={() => setIsEditing(true)}>
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <Label className="flex items-center gap-2">
                                <Sun className="w-4 h-4 text-yellow-500" />
                                Atividades da Manhã
                              </Label>
                              {isEditing && (
                                <ActivitySuggestions
                                  classType={selectedClass}
                                  dayOfWeek={selectedDay}
                                  activityType="morning"
                                  onSelect={(text) => updatePlan("morning_activities", currentPlan.morning_activities ? `${currentPlan.morning_activities}\n\n${text}` : text)}
                                />
                              )}
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={currentPlan.morning_activities}
                                onChange={(e) => updatePlan("morning_activities", e.target.value)}
                                rows={3}
                                placeholder="Descreva as atividades da manhã..."
                              />
                            ) : (
                              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 min-h-[60px]">
                                <pre className="text-sm whitespace-pre-wrap font-sans">
                                  {currentPlan.morning_activities || "—"}
                                </pre>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <Label className="flex items-center gap-2">
                                <Moon className="w-4 h-4 text-blue-500" />
                                Atividades da Tarde
                              </Label>
                              {isEditing && (
                                <ActivitySuggestions
                                  classType={selectedClass}
                                  dayOfWeek={selectedDay}
                                  activityType="afternoon"
                                  onSelect={(text) => updatePlan("afternoon_activities", currentPlan.afternoon_activities ? `${currentPlan.afternoon_activities}\n\n${text}` : text)}
                                />
                              )}
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={currentPlan.afternoon_activities}
                                onChange={(e) => updatePlan("afternoon_activities", e.target.value)}
                                rows={3}
                                placeholder="Descreva as atividades da tarde..."
                              />
                            ) : (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 min-h-[60px]">
                                <pre className="text-sm whitespace-pre-wrap font-sans">
                                  {currentPlan.afternoon_activities || "—"}
                                </pre>
                              </div>
                            )}
                          </div>

                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <Label className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-green-500" />
                                  Materiais
                                </Label>
                                {isEditing && (
                                  <ActivitySuggestions
                                    classType={selectedClass}
                                    dayOfWeek={selectedDay}
                                    activityType="materials"
                                    onSelect={(text) => updatePlan("materials", currentPlan.materials ? `${currentPlan.materials}, ${text}` : text)}
                                  />
                                )}
                              </div>
                              {isEditing ? (
                                <Textarea
                                  value={currentPlan.materials}
                                  onChange={(e) => updatePlan("materials", e.target.value)}
                                  rows={2}
                                  placeholder="Liste os materiais necessários..."
                                />
                              ) : (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm min-h-[40px]">
                                  {currentPlan.materials || "—"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <Label className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-purple-500" />
                                  Objetivos
                                </Label>
                                {isEditing && (
                                  <ActivitySuggestions
                                    classType={selectedClass}
                                    dayOfWeek={selectedDay}
                                    activityType="objectives"
                                    onSelect={(text) => updatePlan("objectives", currentPlan.objectives ? `${currentPlan.objectives}\n${text}` : text)}
                                  />
                                )}
                              </div>
                              {isEditing ? (
                                <Textarea
                                  value={currentPlan.objectives}
                                  onChange={(e) => updatePlan("objectives", e.target.value)}
                                  rows={2}
                                  placeholder="Descreva os objetivos pedagógicos..."
                                />
                              ) : (
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm min-h-[40px]">
                                  {currentPlan.objectives || "—"}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>

              {/* Avaliações Plus+ Tab */}
              <TabsContent value="avaliacoes" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Avaliações Trimestrais - Plano Plus+</h3>
                    <p className="text-sm text-muted-foreground">Crie avaliações detalhadas para os alunos Plus+</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Plus+
                  </Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Child List */}
                  <div className="space-y-2">
                    <Label>Selecione o aluno:</Label>
                    {plusChildren.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum aluno Plus+ cadastrado</p>
                      </div>
                    ) : (
                      plusChildren.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => setSelectedEvalChild(child.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedEvalChild === child.id ? "bg-purple-50 border-purple-300" : "hover:bg-muted/50"
                          }`}
                        >
                          <Avatar className="h-10 w-10">
                            {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {child.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{child.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{child.class_type}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto text-xs">
                            Plus+
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Evaluation Form */}
                  <div className="lg:col-span-2">
                    {selectedEvalChild ? (
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                {plusChildren.find((c) => c.id === selectedEvalChild)?.photo_url && (
                                  <AvatarImage src={plusChildren.find((c) => c.id === selectedEvalChild)?.photo_url || undefined} />
                                )}
                                <AvatarFallback className="bg-purple-100 text-purple-600">
                                  {plusChildren.find((c) => c.id === selectedEvalChild)?.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-lg">
                                  {plusChildren.find((c) => c.id === selectedEvalChild)?.full_name}
                                </CardTitle>
                                <CardDescription>Avaliação Trimestral</CardDescription>
                              </div>
                            </div>
                            <Select value={String(selectedQuarter)} onValueChange={(v) => setSelectedQuarter(Number(v))}>
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1º Trimestre</SelectItem>
                                <SelectItem value="2">2º Trimestre</SelectItem>
                                <SelectItem value="3">3º Trimestre</SelectItem>
                                <SelectItem value="4">4º Trimestre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => generateWithAI("all")}
                            disabled={isGeneratingAI}
                            className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            {isGeneratingAI ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Gerando com IA...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Preencher Tudo com IA
                              </>
                            )}
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[50vh] max-h-[500px] min-h-[300px] pr-4">
                            <div className="space-y-4">
                              {/* Cognitive */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-blue-500" />
                                    Desenvolvimento Cognitivo
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("cognitive")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.cognitive}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, cognitive: e.target.value }))}
                                  rows={3}
                                  placeholder="Descreva o desenvolvimento cognitivo..."
                                />
                              </div>

                              {/* Motor */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-green-500" />
                                    Desenvolvimento Motor
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("motor")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.motor}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, motor: e.target.value }))}
                                  rows={3}
                                  placeholder="Descreva o desenvolvimento motor..."
                                />
                              </div>

                              {/* Social-Emotional */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    Socioemocional
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("socialEmotional")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.socialEmotional}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, socialEmotional: e.target.value }))}
                                  rows={3}
                                  placeholder="Descreva o desenvolvimento socioemocional..."
                                />
                              </div>

                              {/* Language */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-yellow-500" />
                                    Linguagem
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("language")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.language}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, language: e.target.value }))}
                                  rows={3}
                                  placeholder="Descreva o desenvolvimento da linguagem..."
                                />
                              </div>

                              {/* Creativity */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-purple-500" />
                                    Criatividade e Artes
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("creativity")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.creativity}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, creativity: e.target.value }))}
                                  rows={3}
                                  placeholder="Descreva a criatividade e artes..."
                                />
                              </div>

                              {/* Summary */}
                              <div className="space-y-2 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    Resumo Geral
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("summary")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.summary}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, summary: e.target.value }))}
                                  rows={3}
                                  placeholder="Resumo geral do desenvolvimento..."
                                />
                              </div>

                              {/* Recommendations */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    Recomendações
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("recommendations")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.recommendations}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, recommendations: e.target.value }))}
                                  rows={3}
                                  placeholder="Recomendações para casa..."
                                />
                              </div>

                              {/* Next Steps */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-green-500" />
                                    Próximos Passos
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI("nextSteps")}
                                    disabled={isGeneratingAI}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Button>
                                </div>
                                <Textarea
                                  value={evaluation.nextSteps}
                                  onChange={(e) => setEvaluation((prev) => ({ ...prev, nextSteps: e.target.value }))}
                                  rows={3}
                                  placeholder="Próximos passos para o trimestre..."
                                />
                              </div>

                              <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleSaveEvaluation}
                                disabled={savingEval}
                              >
                                {savingEval ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Salvar Avaliação
                              </Button>
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="flex items-center justify-center h-[50vh] max-h-[500px] min-h-[300px] border rounded-lg bg-muted/30">
                        <div className="text-center">
                          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                          <h4 className="font-semibold mb-1">Selecione um aluno</h4>
                          <p className="text-sm text-muted-foreground">Escolha um aluno Plus+ para criar a avaliação</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
