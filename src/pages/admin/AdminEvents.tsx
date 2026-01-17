import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Plus, Trash2, Loader2, Edit, Sun, Users, PartyPopper } from "lucide-react";
import { toast } from "sonner";

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  class_type: string | null;
  all_classes: boolean;
}

const eventTypes = [
  { value: 'holiday', label: 'Feriado', icon: Sun, color: 'text-pimpo-yellow' },
  { value: 'meeting', label: 'Reunião', icon: Users, color: 'text-pimpo-blue' },
  { value: 'event', label: 'Evento', icon: PartyPopper, color: 'text-pimpo-green' },
  { value: 'celebration', label: 'Celebração', icon: PartyPopper, color: 'text-pimpo-red' },
];

export default function AdminEvents() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("event");
  const [classType, setClassType] = useState<string>("all");
  const [allClasses, setAllClasses] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('school_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate("");
    setEventType("event");
    setClassType("all");
    setAllClasses(true);
    setEditingEvent(null);
  };

  const openEditDialog = (event: SchoolEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setEventDate(event.event_date);
    setEventType(event.event_type);
    setClassType(event.class_type || "all");
    setAllClasses(event.all_classes);
    setDialogOpen(true);
  };

  const handleSave = async () => {
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

      resetForm();
      setDialogOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error("Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: SchoolEvent) => {
    if (!confirm(`Excluir o evento "${event.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('school_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success("Evento excluído!");
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error("Erro ao excluir evento");
    }
  };

  const getEventTypeConfig = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[2];
  };

  const getClassLabel = (classType: string | null, allClasses: boolean) => {
    if (allClasses) return 'Todas as turmas';
    switch (classType) {
      case 'bercario': return 'Berçário';
      case 'maternal': return 'Maternal';
      case 'jardim': return 'Jardim';
      default: return 'Todas as turmas';
    }
  };

  // Group events by month
  const groupedEvents = events.reduce((acc, event) => {
    const monthKey = format(parseISO(event.event_date), 'yyyy-MM');
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, SchoolEvent[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-pimpo-blue" />
            Calendário de Eventos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie feriados, reuniões e eventos da escola
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-pimpo-blue hover:bg-pimpo-blue/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião de Pais"
                />
              </div>

              {/* Date */}
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              {/* Event Type */}
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

              {/* All Classes Checkbox */}
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

              {/* Class Type (if not all classes) */}
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

              {/* Description */}
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
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
        </div>
      ) : events.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum evento cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione feriados, reuniões e eventos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([monthKey, monthEvents]) => (
            <div key={monthKey}>
              <h3 className="font-semibold text-lg mb-3 capitalize">
                {format(parseISO(`${monthKey}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
              <div className="grid gap-3">
                {monthEvents.map((event) => {
                  const typeConfig = getEventTypeConfig(event.event_type);
                  const Icon = typeConfig.icon;
                  return (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-lg bg-muted ${typeConfig.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{event.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getClassLabel(event.class_type, event.all_classes)}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">
                            {format(parseISO(event.event_date), "d 'de' MMM", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.event_date), "EEEE", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(event)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(event)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
