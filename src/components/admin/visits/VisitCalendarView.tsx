import { useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScheduledVisit } from "@/pages/admin/AdminVisits";

interface VisitCalendarViewProps {
  visits: ScheduledVisit[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onVisitClick: (visit: ScheduledVisit) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning",
  confirmed: "bg-primary",
  completed: "bg-muted-foreground",
  cancelled: "bg-destructive",
};

export function VisitCalendarView({
  visits,
  selectedMonth,
  onMonthChange,
  onVisitClick,
}: VisitCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset (Sunday = 0)
  const startOffset = monthStart.getDay();

  // Get visits for a specific day
  const getVisitsForDay = (date: Date) => {
    return visits.filter((visit) =>
      isSameDay(parseISO(visit.scheduled_at), date)
    );
  };

  // Get visits for selected date
  const selectedDayVisits = selectedDate ? getVisitsForDay(selectedDate) : [];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h3 className="text-lg font-semibold capitalize">
            {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMonthChange(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const dayVisits = getVisitsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, selectedMonth);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg transition-all relative",
                    "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    isToday(day) && !isSelected && "bg-accent",
                    !isCurrentMonth && "text-muted-foreground/50"
                  )}
                >
                  <span className="text-sm font-medium">{format(day, "d")}</span>
                  
                  {/* Visit indicators */}
                  {dayVisits.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayVisits.slice(0, 3).map((visit, i) => (
                        <div
                          key={visit.id}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            statusColors[visit.status] || "bg-gray-500"
                          )}
                        />
                      ))}
                      {dayVisits.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayVisits.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>Realizada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>Cancelada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold">
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
              : "Selecione um dia"}
          </h3>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground">
              Clique em um dia para ver as visitas agendadas.
            </p>
          ) : selectedDayVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma visita agendada para este dia.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayVisits.map((visit) => (
                <button
                  key={visit.id}
                  onClick={() => onVisitClick(visit)}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {format(parseISO(visit.scheduled_at), "HH:mm")}
                    </span>
                    <Badge
                      variant={
                        visit.status === "confirmed"
                          ? "default"
                          : visit.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {visit.status === "pending" && "Pendente"}
                      {visit.status === "confirmed" && "Confirmada"}
                      {visit.status === "completed" && "Realizada"}
                      {visit.status === "cancelled" && "Cancelada"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">
                    {visit.contact_name}
                  </p>
                  {visit.contact_phone && (
                    <p className="text-xs text-muted-foreground">
                      {visit.contact_phone}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
