import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar,
  Baby,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  FileText,
  Users,
} from "lucide-react";
import { ChildAgendaCard } from "@/components/admin/agenda/ChildAgendaCard";
import { AgendaDialog } from "@/components/admin/agenda/AgendaDialog";
import { ChildWithRecord, ClassType, DailyRecord, AgendaFormData } from "@/components/admin/agenda/types";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function AdminAgenda() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<ClassType | "all">("all");
  const [selectedChild, setSelectedChild] = useState<ChildWithRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const dateStr = formatDate(selectedDate);
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["admin-agenda", dateStr],
    queryFn: async () => {
      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("*")
        .order("full_name");

      if (childrenError) throw childrenError;

      const { data: recordsData, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .eq("record_date", dateStr);

      if (recordsError) throw recordsError;

      const recordsMap = new Map<string, DailyRecord>();
      recordsData?.forEach((record) => {
        recordsMap.set(record.child_id, record);
      });

      return (childrenData || []).map((child) => ({
        ...child,
        daily_record: recordsMap.get(child.id) || null,
      })) as ChildWithRecord[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: AgendaFormData) => {
      if (!selectedChild) throw new Error("No child selected");

      const data = {
        child_id: selectedChild.id,
        record_date: dateStr,
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

      if (selectedChild.daily_record) {
        const { error } = await supabase
          .from("daily_records")
          .update(data)
          .eq("id", selectedChild.daily_record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_records").insert(data);
        if (error) throw error;
      }

      // Check if it's considered "complete" to avoid spamming for partial saves
      const isComplete = data.breakfast && data.lunch && (data.snack || data.dinner);

      if (isComplete) {
        const { data: registrations } = await supabase
          .from("child_registrations")
          .select("parent_id")
          .eq("status", "approved")
          .ilike("first_name", selectedChild.full_name.split(" ")[0]);

        if (registrations && registrations.length > 0) {
          const parentIds = [...new Set(registrations.map(r => r.parent_id))].filter(Boolean) as string[];
          if (parentIds.length > 0) {
            supabase.functions.invoke("send-push-notification", {
              body: {
                user_ids: parentIds,
                title: "Agenda atualizada!",
                body: `A rotina de hoje de ${selectedChild.full_name.split(" ")[0]} já foi registrada.`,
                url: "/painel/agenda",
                tag: "daily_record",
              },
            }).catch(err => console.error("Push API error:", err));
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Agenda salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-agenda", dateStr] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error saving record:", error);
      toast.error("Erro ao salvar agenda: " + error.message);
    }
  });

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

      {isLoading ? (
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

      {selectedChild && (
        <AgendaDialog
          child={selectedChild}
          record={selectedChild.daily_record || null}
          date={selectedDate}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={(data) => saveMutation.mutate(data)}
          isPending={saveMutation.isPending}
        />
      )}
    </div>
  );
}
