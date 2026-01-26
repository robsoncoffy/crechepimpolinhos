import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay, addMonths, subMonths } from "date-fns";
import { Loader2, Sun, Users, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { UnifiedCalendarGrid } from "@/components/admin/calendar/UnifiedCalendarGrid";
import { DayDetailsSidebar } from "@/components/admin/calendar/DayDetailsSidebar";
import { CalendarHeader } from "@/components/admin/calendar/CalendarHeader";
import { ScheduleVisitDialog } from "@/components/admin/visits/ScheduleVisitDialog";
import { VisitDetailsSheet } from "@/components/admin/visits/VisitDetailsSheet";

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  class_type: string | null;
  all_classes: boolean;
}

interface ScheduledVisit {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  scheduled_at: string;
  status: string;
  notes: string | null;
  ghl_appointment_id: string | null;
  ghl_calendar_id: string | null;
  ghl_contact_id: string | null;
  pre_enrollment_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const eventTypes = [
  { value: 'holiday', label: 'Feriado', icon: Sun, color: 'text-pimpo-yellow' },
  { value: 'meeting', label: 'Reunião', icon: Users, color: 'text-pimpo-blue' },
  { value: 'event', label: 'Evento', icon: PartyPopper, color: 'text-pimpo-green' },
  { value: 'celebration', label: 'Celebração', icon: PartyPopper, color: 'text-pimpo-red' },
];

export default function AdminCalendar() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Event dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("event");
  const [classType, setClassType] = useState<string>("all");
  const [allClasses, setAllClasses] = useState(true);

  // Visit dialog state
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ScheduledVisit | null>(null);
  const [visitSheetOpen, setVisitSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const startDateTime = `${start}T00:00:00`;
    const endDateTime = `${end}T23:59:59`;

    const [eventsRes, visitsRes] = await Promise.all([
      supabase
        .from('school_events')
        .select('*')
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date'),
      supabase
        .from('scheduled_visits')
        .select('*')
        .gte('scheduled_at', startDateTime)
        .lte('scheduled_at', endDateTime)
        .order('scheduled_at'),
    ]);

    if (!eventsRes.error && eventsRes.data) {
      setEvents(eventsRes.data);
    }
    if (!visitsRes.error && visitsRes.data) {
      setVisits(visitsRes.data);
    }
    
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetEventForm = () => {
    setTitle("");
    setDescription("");
    setEventDate("");
    setEventType("event");
    setClassType("all");
    setAllClasses(true);
    setEditingEvent(null);
  };

  const handleNewEvent = () => {
    resetEventForm();
    if (selectedDate) {
      setEventDate(format(selectedDate, 'yyyy-MM-dd'));
    }
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: SchoolEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setEventDate(event.event_date);
    setEventType(event.event_type);
    setClassType(event.class_type || "all");
    setAllClasses(event.all_classes);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!title.trim() || !eventDate) {
      toast.error("Preencha o título e a data");
      return;
    }

    setSaving(true);

    try {
      const classTypeValue = allClasses ? null : (classType === 'all' ? null : classType as 'bercario' | 'maternal' | 'jardim');
      
      if (editingEvent) {
        const { error } = await supabase
          .from('school_events')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            event_date: eventDate,
            event_type: eventType,
            class_type: classTypeValue,
            all_classes: allClasses,
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success("Evento atualizado!");
      } else {
        const { error } = await supabase
          .from('school_events')
          .insert([{
            title: title.trim(),
            description: description.trim() || null,
            event_date: eventDate,
            event_type: eventType,
            class_type: classTypeValue,
            all_classes: allClasses,
          }]);

        if (error) throw error;
        toast.success("Evento criado!");
      }

      resetEventForm();
      setEventDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error("Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (event: SchoolEvent) => {
    if (!confirm(`Excluir o evento "${event.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('school_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success("Evento excluído!");
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error("Erro ao excluir evento");
    }
  };

  const handleViewVisit = (visit: ScheduledVisit) => {
    setSelectedVisit(visit);
    setVisitSheetOpen(true);
  };

  const handleDayClick = (date: Date) => {
    if (selectedDate && isSameDay(date, selectedDate)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  // Filter events and visits for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(parseISO(event.event_date), selectedDate));
  }, [selectedDate, events]);

  const selectedDayVisits = useMemo(() => {
    if (!selectedDate) return [];
    return visits.filter(visit => isSameDay(parseISO(visit.scheduled_at), selectedDate));
  }, [selectedDate, visits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
        onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
        onToday={() => {
          setCurrentMonth(new Date());
          setSelectedDate(new Date());
        }}
        onNewEvent={handleNewEvent}
        onNewVisit={() => setVisitDialogOpen(true)}
        eventsCount={events.length}
        visitsCount={visits.length}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <UnifiedCalendarGrid
            currentMonth={currentMonth}
            events={events}
            visits={visits}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
        </div>

        {/* Day Details Sidebar */}
        <div className="lg:col-span-1 min-h-[400px]">
          <DayDetailsSidebar
            selectedDate={selectedDate}
            events={selectedDayEvents}
            visits={selectedDayVisits}
            onClose={() => setSelectedDate(null)}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
            onViewVisit={handleViewVisit}
          />
        </div>
      </div>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={(open) => { setEventDialogOpen(open); if (!open) resetEventForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião de Pais"
              />
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Tipo de Evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allClasses"
                checked={allClasses}
                onCheckedChange={(checked) => setAllClasses(checked === true)}
              />
              <Label htmlFor="allClasses" className="cursor-pointer">
                Aplicar para todas as turmas
              </Label>
            </div>

            {!allClasses && (
              <div>
                <Label>Turma Específica</Label>
                <Select value={classType} onValueChange={setClassType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bercario">Berçário</SelectItem>
                    <SelectItem value="maternal">Maternal</SelectItem>
                    <SelectItem value="jardim">Jardim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione detalhes sobre o evento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEventDialogOpen(false); resetEventForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvent} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingEvent ? 'Atualizar' : 'Criar Evento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Schedule Dialog */}
      <ScheduleVisitDialog
        open={visitDialogOpen}
        onOpenChange={setVisitDialogOpen}
        onSuccess={fetchData}
      />

      {/* Visit Details Sheet */}
      {selectedVisit && (
        <VisitDetailsSheet
          visit={selectedVisit}
          open={visitSheetOpen}
          onOpenChange={setVisitSheetOpen}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
