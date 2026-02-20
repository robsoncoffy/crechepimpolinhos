import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ActivitySuggestions } from "@/components/admin/ActivitySuggestions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { ChevronLeft, ChevronRight, Edit, Loader2, Moon, Package, Save, Sun, Target, Baby, Palette, BookMarked } from "lucide-react";

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

export function WeeklyPlanningTab() {
    const queryClient = useQueryClient();
    const [selectedClass, setSelectedClass] = useState<ClassType>("maternal");
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().getDay();
        return today >= 1 && today <= 5 ? today - 1 : 0;
    });
    const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isEditing, setIsEditing] = useState(false);
    const [plans, setPlans] = useState<Record<string, Record<number, WeeklyPlan>>>({
        bercario: {},
        maternal: {},
        jardim: {},
    });

    // Fetch weekly plans when week changes
    useEffect(() => {
        async function fetchPlans() {
            const weekStartStr = format(currentWeek, "yyyy-MM-dd");

            const { data, error } = await supabase
                .from("weekly_activity_plans")
                .select("*")
                .eq("week_start", weekStartStr);

            if (error) {
                console.error("Error fetching plans:", error);
                return;
            }

            const plansByClass: Record<string, Record<number, WeeklyPlan>> = {
                bercario: {},
                maternal: {},
                jardim: {},
            };

            (data as any[] || []).forEach((plan) => {
                plansByClass[plan.class_type][plan.day_of_week] = {
                    id: plan.id,
                    class_type: plan.class_type as ClassType,
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

    const savePlanMutation = useMutation({
        mutationFn: async (plan: WeeklyPlan) => {
            if (plan.id) {
                const { error } = await supabase
                    .from("weekly_activity_plans")
                    .update({
                        morning_activities: plan.morning_activities,
                        afternoon_activities: plan.afternoon_activities,
                        materials: plan.materials,
                        objectives: plan.objectives,
                        notes: plan.notes,
                    })
                    .eq("id", plan.id);
                if (error) throw error;
                return plan;
            } else {
                const { data, error } = await supabase
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
                if (error) throw error;
                return { ...plan, id: data.id };
            }
        },
        onSuccess: (data) => {
            setPlans((prev) => ({
                ...prev,
                [selectedClass]: {
                    ...prev[selectedClass],
                    [selectedDay]: data,
                },
            }));
            toast.success("Plano salvo com sucesso!");
            setIsEditing(false);
        },
        onError: (error) => {
            console.error("Error saving plan:", error);
            toast.error("Erro ao salvar plano");
        }
    });

    const handleSavePlan = () => {
        const plan = plans[selectedClass][selectedDay];
        savePlanMutation.mutate(plan || {
            class_type: selectedClass,
            week_start: format(currentWeek, "yyyy-MM-dd"),
            day_of_week: selectedDay,
            morning_activities: "",
            afternoon_activities: "",
            materials: "",
            objectives: "",
            notes: ""
        } as WeeklyPlan);
    };

    return (
        <div className="space-y-4 pt-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <p className="font-semibold text-sm sm:text-base">
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
                                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={savePlanMutation.isPending}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSavePlan}
                                                disabled={savePlanMutation.isPending}
                                                className="bg-purple-600 hover:bg-purple-700"
                                            >
                                                {savePlanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
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
        </div>
    );
}
