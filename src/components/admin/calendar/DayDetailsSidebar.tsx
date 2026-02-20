import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarDays, 
  Users, 
  PartyPopper, 
  Sun, 
  MapPin, 
  Clock, 
  Phone, 
  Mail,
  Edit,
  Trash2,
  Eye,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface DayDetailsSidebarProps {
  selectedDate: Date | null;
  events: SchoolEvent[];
  visits: ScheduledVisit[];
  onClose: () => void;
  onEditEvent: (event: SchoolEvent) => void;
  onDeleteEvent: (event: SchoolEvent) => void;
  onViewVisit: (visit: ScheduledVisit) => void;
}

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  holiday: { icon: Sun, color: 'text-pimpo-yellow', bgColor: 'bg-pimpo-yellow/10', label: 'Feriado' },
  meeting: { icon: Users, color: 'text-pimpo-blue', bgColor: 'bg-pimpo-blue/10', label: 'Reunião' },
  event: { icon: PartyPopper, color: 'text-pimpo-green', bgColor: 'bg-pimpo-green/10', label: 'Evento' },
  celebration: { icon: PartyPopper, color: 'text-pimpo-red', bgColor: 'bg-pimpo-red/10', label: 'Celebração' },
};

const visitStatusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  pending: { color: 'text-pimpo-yellow', bgColor: 'bg-pimpo-yellow/10', label: 'Pendente' },
  confirmed: { color: 'text-pimpo-blue', bgColor: 'bg-pimpo-blue/10', label: 'Confirmada' },
  completed: { color: 'text-pimpo-green', bgColor: 'bg-pimpo-green/10', label: 'Realizada' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted/50', label: 'Cancelada' },
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

export function DayDetailsSidebar({
  selectedDate,
  events,
  visits,
  onClose,
  onEditEvent,
  onDeleteEvent,
  onViewVisit,
}: DayDetailsSidebarProps) {
  if (!selectedDate) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Selecione um dia no calendário</p>
          <p className="text-xs text-muted-foreground mt-1">
            para ver eventos e visitas
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasItems = events.length > 0 || visits.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {format(selectedDate, "EEEE", { locale: ptBR })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-2xl font-bold text-primary">
          {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-4">
          {!hasItems ? (
            <div className="text-center py-8">
              <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum evento ou visita
              </p>
            </div>
          ) : (
            <>
              {/* Events Section */}
              {events.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Eventos ({events.length})
                  </h4>
                  <div className="space-y-2">
                    {events.map(event => {
                      const config = eventTypeConfig[event.event_type] || eventTypeConfig.event;
                      const Icon = config.icon;
                      return (
                        <div 
                          key={event.id}
                          className={cn("p-3 rounded-lg", config.bgColor)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.color)} />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{event.title}</p>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {config.label}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px] h-5">
                                    {getClassLabel(event.class_type, event.all_classes)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => onEditEvent(event)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => onDeleteEvent(event)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {events.length > 0 && visits.length > 0 && (
                <Separator />
              )}

              {/* Visits Section */}
              {visits.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Visitas Agendadas ({visits.length})
                  </h4>
                  <div className="space-y-2">
                    {visits.map(visit => {
                      const config = visitStatusConfig[visit.status] || visitStatusConfig.pending;
                      return (
                        <div 
                          key={visit.id}
                          className={cn("p-3 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all", config.bgColor)}
                          onClick={() => onViewVisit(visit)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{visit.contact_name}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {format(parseISO(visit.scheduled_at), "HH:mm")}
                              </div>
                              {visit.contact_phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {visit.contact_phone}
                                </div>
                              )}
                              <Badge 
                                variant="outline" 
                                className={cn("text-[10px] h-5 mt-1", config.color)}
                              >
                                {config.label}
                              </Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 shrink-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
