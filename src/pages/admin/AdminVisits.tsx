import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Plus, List, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { VisitCalendarView } from "@/components/admin/visits/VisitCalendarView";
import { VisitListView } from "@/components/admin/visits/VisitListView";
import { ScheduleVisitDialog } from "@/components/admin/visits/ScheduleVisitDialog";
import { VisitDetailsSheet } from "@/components/admin/visits/VisitDetailsSheet";

export interface ScheduledVisit {
  id: string;
  ghl_appointment_id: string | null;
  ghl_calendar_id: string | null;
  ghl_contact_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  scheduled_at: string;
  status: string;
  notes: string | null;
  pre_enrollment_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminVisits() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"calendar" | "list">("list");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ScheduledVisit | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  // Fetch visits from database
  const { data: visits = [], isLoading, refetch } = useQuery({
    queryKey: ["scheduled-visits", selectedMonth],
    queryFn: async () => {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(addMonths(selectedMonth, 1));

      const { data, error } = await supabase
        .from("scheduled_visits")
        .select("*")
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as ScheduledVisit[];
    },
  });

  // Sync with GHL
  const syncMutation = useMutation({
    mutationFn: async () => {
      const start = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(addMonths(selectedMonth, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke("ghl-calendar", {
        body: {
          action: "list-appointments",
          startDate: start,
          endDate: end,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Sincronizado com GHL");
      console.log("GHL appointments:", data);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao sincronizar: " + error.message);
    },
  });

  const handleVisitClick = (visit: ScheduledVisit) => {
    setSelectedVisit(visit);
    setDetailsSheetOpen(true);
  };

  const handleVisitCreated = () => {
    setScheduleDialogOpen(false);
    refetch();
    toast.success("Visita agendada com sucesso!");
  };

  const handleVisitUpdated = () => {
    setDetailsSheetOpen(false);
    setSelectedVisit(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-fredoka font-bold text-foreground">
              Visitas Agendadas
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie agendamentos de visitas escolares
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar GHL
          </Button>
          <Button onClick={() => setScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agendar Visita
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <VisitListView
            visits={visits}
            isLoading={isLoading}
            onVisitClick={handleVisitClick}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <VisitCalendarView
            visits={visits}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onVisitClick={handleVisitClick}
          />
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <ScheduleVisitDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleVisitCreated}
      />

      {/* Visit Details Sheet */}
      <VisitDetailsSheet
        visit={selectedVisit}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        onUpdate={handleVisitUpdated}
      />
    </div>
  );
}
