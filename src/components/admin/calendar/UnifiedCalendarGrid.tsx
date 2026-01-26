import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarDays, Users, PartyPopper, Sun, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface UnifiedCalendarGridProps {
  currentMonth: Date;
  events: SchoolEvent[];
  visits: ScheduledVisit[];
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
}

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  holiday: { icon: Sun, color: 'text-pimpo-yellow', bgColor: 'bg-pimpo-yellow' },
  meeting: { icon: Users, color: 'text-pimpo-blue', bgColor: 'bg-pimpo-blue' },
  event: { icon: PartyPopper, color: 'text-pimpo-green', bgColor: 'bg-pimpo-green' },
  celebration: { icon: PartyPopper, color: 'text-pimpo-red', bgColor: 'bg-pimpo-red' },
};

const visitStatusConfig: Record<string, { color: string; bgColor: string }> = {
  pending: { color: 'text-pimpo-yellow', bgColor: 'bg-pimpo-yellow' },
  confirmed: { color: 'text-pimpo-blue', bgColor: 'bg-pimpo-blue' },
  completed: { color: 'text-pimpo-green', bgColor: 'bg-pimpo-green' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted-foreground' },
};

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function UnifiedCalendarGrid({
  currentMonth,
  events,
  visits,
  onDayClick,
  selectedDate,
}: UnifiedCalendarGridProps) {
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(parseISO(event.event_date), date));
  };

  const getVisitsForDay = (date: Date) => {
    return visits.filter(visit => isSameDay(parseISO(visit.scheduled_at), date));
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border shadow-sm p-4">
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
            const dayVisits = getVisitsForDay(day);
            const hasItems = dayEvents.length > 0 || dayVisits.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            return (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDayClick(day)}
                    className={cn(
                      "aspect-square rounded-lg p-1 text-sm relative transition-all flex flex-col items-center justify-start pt-1",
                      isSelected 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : isTodayDate
                          ? 'bg-pimpo-blue/20 text-pimpo-blue font-bold ring-2 ring-pimpo-blue'
                          : isWeekend
                            ? 'bg-muted/50 hover:bg-muted'
                            : 'hover:bg-muted'
                    )}
                  >
                    <span className="block text-xs sm:text-sm">{format(day, 'd')}</span>
                    
                    {hasItems && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center max-w-full">
                        {dayEvents.slice(0, 2).map((event, i) => {
                          const config = eventTypeConfig[event.event_type] || eventTypeConfig.event;
                          return (
                            <div 
                              key={`e-${i}`}
                              className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full", config.bgColor)}
                            />
                          );
                        })}
                        {dayVisits.slice(0, 2).map((visit, i) => {
                          const config = visitStatusConfig[visit.status] || visitStatusConfig.pending;
                          return (
                            <div 
                              key={`v-${i}`}
                              className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm", config.bgColor)}
                            />
                          );
                        })}
                        {(dayEvents.length + dayVisits.length) > 4 && (
                          <span className="text-[8px] text-muted-foreground">+</span>
                        )}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                {hasItems && (
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-1 text-xs">
                      {dayEvents.map((event, i) => {
                        const config = eventTypeConfig[event.event_type] || eventTypeConfig.event;
                        const Icon = config.icon;
                        return (
                          <div key={`te-${i}`} className="flex items-center gap-1">
                            <Icon className={cn("w-3 h-3", config.color)} />
                            <span className="truncate">{event.title}</span>
                          </div>
                        );
                      })}
                      {dayVisits.map((visit, i) => (
                        <div key={`tv-${i}`} className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-pimpo-purple" />
                          <span className="truncate">Visita: {visit.contact_name}</span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pimpo-yellow" />
            <span className="text-muted-foreground">Feriado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pimpo-blue" />
            <span className="text-muted-foreground">Reunião</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pimpo-green" />
            <span className="text-muted-foreground">Evento</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pimpo-red" />
            <span className="text-muted-foreground">Celebração</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-pimpo-purple" />
            <span className="text-muted-foreground">Visita</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
