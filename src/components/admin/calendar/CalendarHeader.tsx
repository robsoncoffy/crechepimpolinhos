import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Plus,
  MapPin,
  Calendar
} from "lucide-react";

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onNewEvent: () => void;
  onNewVisit: () => void;
  eventsCount: number;
  visitsCount: number;
}

export function CalendarHeader({
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onNewEvent,
  onNewVisit,
  eventsCount,
  visitsCount,
}: CalendarHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-pimpo-blue" />
            Calendário Escolar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Eventos, feriados e visitas agendadas
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onNewEvent} className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Evento</span>
            <span className="sm:hidden">Evento</span>
          </Button>
          <Button onClick={onNewVisit} className="gap-2 bg-pimpo-purple hover:bg-pimpo-purple/90">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Agendar Visita</span>
            <span className="sm:hidden">Visita</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <span className="font-semibold capitalize">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="ml-2"
          >
            Hoje
          </Button>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pimpo-blue" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{eventsCount}</span> eventos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pimpo-purple" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{visitsCount}</span> visitas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
