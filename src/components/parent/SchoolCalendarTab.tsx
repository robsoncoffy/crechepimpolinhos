import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, PartyPopper, Users, BookOpen, Sun, Loader2 } from "lucide-react";

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  class_type: string | null;
  all_classes: boolean;
}

interface SchoolCalendarTabProps {
  childClassType?: string;
}

const eventTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  holiday: { icon: <Sun className="w-3 h-3" />, color: 'bg-pimpo-yellow text-pimpo-yellow', label: 'Feriado' },
  meeting: { icon: <Users className="w-3 h-3" />, color: 'bg-pimpo-blue text-pimpo-blue', label: 'Reunião' },
  event: { icon: <PartyPopper className="w-3 h-3" />, color: 'bg-pimpo-green text-pimpo-green', label: 'Evento' },
  celebration: { icon: <PartyPopper className="w-3 h-3" />, color: 'bg-pimpo-red text-pimpo-red', label: 'Celebração' },
};

export function SchoolCalendarTab({ childClassType }: SchoolCalendarTabProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('school_events')
        .select('*')
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date');

      if (!error && data) {
        // Filter events based on child's class if applicable
        const filteredEvents = data.filter(event => 
          event.all_classes || 
          !event.class_type || 
          event.class_type === childClassType
        );
        setEvents(filteredEvents);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [currentMonth, childClassType]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(parseISO(event.event_date), date));
  };

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-pimpo-blue" />
          <h3 className="font-semibold">Calendário Escolar</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(eventTypeConfig).map(([type, config]) => (
          <Badge 
            key={type} 
            variant="outline" 
            className={`${config.color.split(' ')[0]}/10 ${config.color.split(' ')[1]} border-current/20`}
          >
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`aspect-square rounded-lg p-1 text-sm relative transition-all ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : isTodayDate
                        ? 'bg-pimpo-blue/10 text-pimpo-blue font-bold'
                        : 'hover:bg-muted'
                  }`}
                >
                  <span className="block">{format(day, 'd')}</span>
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div 
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${eventTypeConfig[event.event_type]?.color.split(' ')[0] || 'bg-primary'}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date events */}
      {selectedDate && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(event => {
                  const config = eventTypeConfig[event.event_type] || eventTypeConfig.event;
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`p-2 rounded-full ${config.color.split(' ')[0]}/20`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        {!event.all_classes && event.class_type && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {event.class_type === 'bercario' ? 'Berçário' : 
                             event.class_type === 'maternal' ? 'Maternal' : 'Jardim'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming events */}
      {!selectedDate && events.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events
              .filter(e => parseISO(e.event_date) >= new Date())
              .slice(0, 5)
              .map(event => {
                const config = eventTypeConfig[event.event_type] || eventTypeConfig.event;
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${config.color.split(' ')[0]}`} />
                    <span className="text-sm font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(parseISO(event.event_date), "d 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
