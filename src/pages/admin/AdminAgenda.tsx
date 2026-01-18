import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar,
  Baby,
  Utensils,
  Moon,
  Droplets,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Thermometer,
  Pill,
  FileText,
  Save,
  Users,
  Smile,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
type MealStatus = Database["public"]["Enums"]["meal_status"];
type EvacuationStatus = Database["public"]["Enums"]["evacuation_status"];
type ClassType = Database["public"]["Enums"]["class_type"];

interface ChildWithRecord extends Child {
  daily_record?: DailyRecord | null;
}

const mealOptions: { value: MealStatus; label: string; color: string }[] = [
  { value: "nao_aceitou", label: "Não aceitou", color: "bg-destructive" },
  { value: "pouco", label: "Pouco", color: "bg-pimpo-yellow" },
  { value: "metade", label: "Metade", color: "bg-pimpo-yellow/70" },
  { value: "quase_tudo", label: "Quase tudo", color: "bg-pimpo-green/70" },
  { value: "tudo", label: "Tudo", color: "bg-pimpo-green" },
];

const evacuationOptions: { value: EvacuationStatus; label: string; color: string }[] = [
  { value: "nao", label: "Não evacuou", color: "bg-muted" },
  { value: "normal", label: "Normal", color: "bg-pimpo-green" },
  { value: "pastosa", label: "Pastosa", color: "bg-pimpo-yellow" },
  { value: "liquida", label: "Líquida", color: "bg-destructive" },
];

type MoodStatus = "feliz" | "calmo" | "agitado" | "choroso" | "sonolento";

const moodOptions: { value: MoodStatus; label: string; emoji: string; color: string }[] = [
  { value: "feliz", label: "Feliz", emoji: "😄", color: "bg-pimpo-green" },
  { value: "calmo", label: "Calmo", emoji: "😊", color: "bg-pimpo-blue" },
  { value: "agitado", label: "Agitado", emoji: "🤪", color: "bg-pimpo-yellow" },
  { value: "choroso", label: "Choroso", emoji: "😢", color: "bg-pimpo-red/70" },
  { value: "sonolento", label: "Sonolento", emoji: "😴", color: "bg-muted" },
];

const classLabels: Record<ClassType, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function MealSelector({
  value,
  onChange,
  label,
}: {
  value: MealStatus | null;
  onChange: (val: MealStatus) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-1 flex-wrap">
        {mealOptions.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={value === opt.value ? "default" : "outline"}
            className={cn(
              "text-xs h-7 px-2",
              value === opt.value && opt.color,
              value === opt.value && "text-white border-0"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function EvacuationSelector({
  value,
  onChange,
}: {
  value: EvacuationStatus | null;
  onChange: (val: EvacuationStatus) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">Evacuação</Label>
      <div className="flex gap-1 flex-wrap">
        {evacuationOptions.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={value === opt.value ? "default" : "outline"}
            className={cn(
              "text-xs h-7 px-2",
              value === opt.value && opt.color,
              value === opt.value && "text-white border-0"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface AgendaFormData {
  breakfast: MealStatus | null;
  lunch: MealStatus | null;
  snack: MealStatus | null;
  dinner: MealStatus | null;
  slept_morning: boolean;
  slept_afternoon: boolean;
  sleep_notes: string;
  urinated: boolean;
  evacuated: EvacuationStatus | null;
  mood: MoodStatus | null;
  had_fever: boolean;
  temperature: string;
  took_medicine: boolean;
  medicine_notes: string;
  activities: string;
  school_notes: string;
}

const defaultFormData: AgendaFormData = {
  breakfast: null,
  lunch: null,
  snack: null,
  dinner: null,
  slept_morning: false,
  slept_afternoon: false,
  sleep_notes: "",
  urinated: false,
  evacuated: null,
  mood: null,
  had_fever: false,
  temperature: "",
  took_medicine: false,
  medicine_notes: "",
  activities: "",
  school_notes: "",
};

function AgendaDialog({
  child,
  record,
  date,
  open,
  onOpenChange,
  onSave,
}: {
  child: Child;
  record: DailyRecord | null;
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<AgendaFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({
        breakfast: record.breakfast,
        lunch: record.lunch,
        snack: record.snack,
        dinner: record.dinner,
        slept_morning: record.slept_morning || false,
        slept_afternoon: record.slept_afternoon || false,
        sleep_notes: record.sleep_notes || "",
        urinated: record.urinated || false,
        evacuated: record.evacuated,
        mood: (record as any).mood || null,
        had_fever: record.had_fever || false,
        temperature: record.temperature?.toString() || "",
        took_medicine: record.took_medicine || false,
        medicine_notes: record.medicine_notes || "",
        activities: record.activities || "",
        school_notes: record.school_notes || "",
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [record, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        child_id: child.id,
        record_date: formatDate(date),
        teacher_id: user?.id,
        breakfast: formData.breakfast,
        lunch: formData.lunch,
        snack: formData.snack,
        dinner: formData.dinner,
        slept_morning: formData.slept_morning,
        slept_afternoon: formData.slept_afternoon,
        sleep_notes: formData.sleep_notes || null,
        urinated: formData.urinated,
        evacuated: formData.evacuated,
        mood: formData.mood,
        had_fever: formData.had_fever,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        took_medicine: formData.took_medicine,
        medicine_notes: formData.medicine_notes || null,
        activities: formData.activities || null,
        school_notes: formData.school_notes || null,
      };

      if (record) {
        const { error } = await supabase
          .from("daily_records")
          .update(data)
          .eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_records").insert(data);
        if (error) throw error;
      }

      toast.success("Agenda salva com sucesso!");
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving record:", error);
      toast.error("Erro ao salvar agenda: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const age = child.birth_date
    ? Math.floor(
        (new Date().getTime() - new Date(child.birth_date).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-fredoka text-xl">{child.full_name}</p>
              <p className="text-sm text-muted-foreground font-normal">
                {classLabels[child.class_type]} • {age} {age === 1 ? "ano" : "anos"} •{" "}
                {date.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Refeições */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Utensils className="w-4 h-4 text-pimpo-yellow" />
                  Refeições
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <MealSelector
                  label="Café da Manhã"
                  value={formData.breakfast}
                  onChange={(val) => setFormData((p) => ({ ...p, breakfast: val }))}
                />
                <MealSelector
                  label="Almoço"
                  value={formData.lunch}
                  onChange={(val) => setFormData((p) => ({ ...p, lunch: val }))}
                />
                <MealSelector
                  label="Lanche"
                  value={formData.snack}
                  onChange={(val) => setFormData((p) => ({ ...p, snack: val }))}
                />
                <MealSelector
                  label="Jantar"
                  value={formData.dinner}
                  onChange={(val) => setFormData((p) => ({ ...p, dinner: val }))}
                />
              </CardContent>
            </Card>

            {/* Sono */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Moon className="w-4 h-4 text-primary" />
                  Sono
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="sleep-morning"
                      checked={formData.slept_morning}
                      onCheckedChange={(val) =>
                        setFormData((p) => ({ ...p, slept_morning: val }))
                      }
                    />
                    <Label htmlFor="sleep-morning" className="text-sm">
                      Dormiu de manhã
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="sleep-afternoon"
                      checked={formData.slept_afternoon}
                      onCheckedChange={(val) =>
                        setFormData((p) => ({ ...p, slept_afternoon: val }))
                      }
                    />
                    <Label htmlFor="sleep-afternoon" className="text-sm">
                      Dormiu à tarde
                    </Label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Observações sobre o sono
                  </Label>
                  <Textarea
                    placeholder="Ex: Dormiu 2h, acordou bem disposto..."
                    value={formData.sleep_notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sleep_notes: e.target.value }))
                    }
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Higiene */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Droplets className="w-4 h-4 text-pimpo-green" />
                  Higiene
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="urinated"
                    checked={formData.urinated}
                    onCheckedChange={(val) =>
                      setFormData((p) => ({ ...p, urinated: val }))
                    }
                  />
                  <Label htmlFor="urinated" className="text-sm">
                    Urinou normalmente
                  </Label>
                </div>
                <EvacuationSelector
                  value={formData.evacuated}
                  onChange={(val) => setFormData((p) => ({ ...p, evacuated: val }))}
                />
              </CardContent>
            </Card>

            {/* Saúde */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="w-4 h-4 text-pimpo-red" />
                  Saúde
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="fever"
                      checked={formData.had_fever}
                      onCheckedChange={(val) =>
                        setFormData((p) => ({ ...p, had_fever: val }))
                      }
                    />
                    <Label htmlFor="fever" className="text-sm flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      Teve febre
                    </Label>
                  </div>
                  {formData.had_fever && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Temp.:</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="37.5"
                        value={formData.temperature}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, temperature: e.target.value }))
                        }
                        className="w-20 h-8"
                      />
                      <span className="text-xs text-muted-foreground">°C</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="medicine"
                      checked={formData.took_medicine}
                      onCheckedChange={(val) =>
                        setFormData((p) => ({ ...p, took_medicine: val }))
                      }
                    />
                    <Label htmlFor="medicine" className="text-sm flex items-center gap-1">
                      <Pill className="w-3 h-3" />
                      Tomou medicamento
                    </Label>
                  </div>
                  {formData.took_medicine && (
                    <Textarea
                      placeholder="Nome do medicamento, dosagem e horário..."
                      value={formData.medicine_notes}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, medicine_notes: e.target.value }))
                      }
                      className="resize-none"
                      rows={2}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Humor do Dia */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smile className="w-4 h-4 text-pimpo-yellow" />
                  Humor do Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {moodOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={formData.mood === opt.value ? "default" : "outline"}
                      className={cn(
                        "text-xs h-8 px-3 gap-1",
                        formData.mood === opt.value && opt.color,
                        formData.mood === opt.value && "text-white border-0"
                      )}
                      onClick={() => setFormData((p) => ({ ...p, mood: opt.value }))}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Atividades */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Atividades do Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ex: Pintura com guache, brincadeiras no parque, contação de histórias..."
                  value={formData.activities}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, activities: e.target.value }))
                  }
                  className="resize-none"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Bilhetinho da Escola */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-primary">
                  <MessageSquare className="w-4 h-4" />
                  Bilhetinho da Escola
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  Escreva uma mensagem personalizada sobre como foi o dia desta criança.
                </p>
                <Textarea
                  placeholder="Ex: Hoje a Maria estava muito animada! Participou de todas as atividades e brincou bastante com os coleguinhas. Comeu bem no almoço e dormiu tranquila à tarde. Um dia muito especial! 💕"
                  value={formData.school_notes}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, school_notes: e.target.value }))
                  }
                  className="resize-none border-primary/30"
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Agenda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChildAgendaCard({
  child,
  onClick,
}: {
  child: ChildWithRecord;
  onClick: () => void;
}) {
  const record = child.daily_record;
  const hasRecord = !!record;
  const isComplete =
    hasRecord &&
    record.breakfast &&
    record.lunch &&
    (record.snack || record.dinner);

  const age = child.birth_date
    ? Math.floor(
        (new Date().getTime() - new Date(child.birth_date).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
        isComplete && "ring-2 ring-pimpo-green/50 bg-pimpo-green/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {child.photo_url ? (
              <img
                src={child.photo_url}
                alt={child.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Baby className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold truncate">{child.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {classLabels[child.class_type]} • {age}{" "}
                  {age === 1 ? "ano" : "anos"}
                </p>
              </div>
              {isComplete ? (
                <Badge className="bg-pimpo-green text-white shrink-0">
                  <Check className="w-3 h-3 mr-1" />
                  Completo
                </Badge>
              ) : hasRecord ? (
                <Badge variant="secondary" className="shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Parcial
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  Pendente
                </Badge>
              )}
            </div>

            {hasRecord && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {record.breakfast && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    ☕ {mealOptions.find((m) => m.value === record.breakfast)?.label}
                  </span>
                )}
                {record.lunch && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    🍽️ {mealOptions.find((m) => m.value === record.lunch)?.label}
                  </span>
                )}
                {(record.slept_morning || record.slept_afternoon) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    😴 Dormiu
                  </span>
                )}
                {record.had_fever && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    🌡️ Febre
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAgenda() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [children, setChildren] = useState<ChildWithRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<ClassType | "all">("all");
  const [selectedChild, setSelectedChild] = useState<ChildWithRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);

      // Fetch children
      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("*")
        .order("full_name");

      if (childrenError) throw childrenError;

      // Fetch daily records for the selected date
      const { data: recordsData, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .eq("record_date", dateStr);

      if (recordsError) throw recordsError;

      // Map records to children
      const recordsMap = new Map<string, DailyRecord>();
      recordsData?.forEach((record) => {
        recordsMap.set(record.child_id, record);
      });

      const childrenWithRecords: ChildWithRecord[] = (childrenData || []).map(
        (child) => ({
          ...child,
          daily_record: recordsMap.get(child.id) || null,
        })
      );

      setChildren(childrenWithRecords);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const filteredChildren = children.filter((child) => {
    const matchesSearch = child.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesClass =
      classFilter === "all" || child.class_type === classFilter;
    return matchesSearch && matchesClass;
  });

  const stats = {
    total: filteredChildren.length,
    complete: filteredChildren.filter(
      (c) =>
        c.daily_record &&
        c.daily_record.breakfast &&
        c.daily_record.lunch &&
        (c.daily_record.snack || c.daily_record.dinner)
    ).length,
    partial: filteredChildren.filter(
      (c) =>
        c.daily_record &&
        !(
          c.daily_record.breakfast &&
          c.daily_record.lunch &&
          (c.daily_record.snack || c.daily_record.dinner)
        )
    ).length,
    pending: filteredChildren.filter((c) => !c.daily_record).length,
  };

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
            Agenda Digital
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre as atividades diárias de cada criança
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="text-center">
                <p className="font-fredoka text-lg font-semibold">
                  {selectedDate.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {!isToday && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={goToToday}
                  >
                    Voltar para hoje
                  </Button>
                )}
              </div>
            </div>

            <Button variant="outline" size="icon" onClick={goToNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="font-fredoka text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-pimpo-green/10 border-pimpo-green/30">
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Check className="w-4 h-4 text-pimpo-green" />
              <span className="text-xs text-muted-foreground">Completos</span>
            </div>
            <p className="font-fredoka text-2xl font-bold text-pimpo-green">
              {stats.complete}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-pimpo-yellow/10 border-pimpo-yellow/30">
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-pimpo-yellow" />
              <span className="text-xs text-muted-foreground">Parciais</span>
            </div>
            <p className="font-fredoka text-2xl font-bold text-pimpo-yellow">
              {stats.partial}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pendentes</span>
            </div>
            <p className="font-fredoka text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar criança..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={classFilter}
          onValueChange={(val) => setClassFilter(val as ClassType | "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todas as turmas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            <SelectItem value="bercario">Berçário</SelectItem>
            <SelectItem value="maternal">Maternal</SelectItem>
            <SelectItem value="jardim">Jardim</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Children Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredChildren.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Baby className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma criança encontrada</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || classFilter !== "all"
                ? "Tente alterar os filtros de busca"
                : "Cadastre crianças na seção de gerenciamento"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Todas ({filteredChildren.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="complete">
              Completas ({stats.complete})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildren.map((child) => (
                <ChildAgendaCard
                  key={child.id}
                  child={child}
                  onClick={() => {
                    setSelectedChild(child);
                    setDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildren
                .filter((c) => !c.daily_record)
                .map((child) => (
                  <ChildAgendaCard
                    key={child.id}
                    child={child}
                    onClick={() => {
                      setSelectedChild(child);
                      setDialogOpen(true);
                    }}
                  />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="complete" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildren
                .filter(
                  (c) =>
                    c.daily_record &&
                    c.daily_record.breakfast &&
                    c.daily_record.lunch &&
                    (c.daily_record.snack || c.daily_record.dinner)
                )
                .map((child) => (
                  <ChildAgendaCard
                    key={child.id}
                    child={child}
                    onClick={() => {
                      setSelectedChild(child);
                      setDialogOpen(true);
                    }}
                  />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Agenda Dialog */}
      {selectedChild && (
        <AgendaDialog
          child={selectedChild}
          record={selectedChild.daily_record || null}
          date={selectedDate}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
