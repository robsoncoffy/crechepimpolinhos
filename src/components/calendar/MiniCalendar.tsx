import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { isHoliday, isWeekend } from "@/lib/holidays";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  className?: string;
  showTitle?: boolean;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MiniCalendar({ className, showTitle = true }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  // Generate calendar days
  const days: (Date | null)[] = [];
  
  // Add empty slots for days before the first day of the month
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();
  const isToday = (date: Date) => 
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return (
    <Card className={cn("", className)}>
      {showTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-primary" />
            Calendário
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(showTitle ? "pt-0" : "pt-4")}>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={goToToday}
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {MONTHS[month]} {year}
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((day, index) => (
            <div 
              key={day + index} 
              className={cn(
                "text-center text-xs font-medium py-1",
                index === 0 || index === 6 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-7" />;
              }

              const holiday = isHoliday(date);
              const weekend = isWeekend(date);
              const todayDate = isToday(date);

              const isRedDay = weekend || holiday;

              return (
                <Tooltip key={date.toISOString()}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "h-7 w-full rounded text-xs font-medium transition-all",
                        "hover:bg-muted",
                        todayDate && "bg-primary text-primary-foreground hover:bg-primary/90",
                        !todayDate && isRedDay && "text-destructive font-semibold",
                        !todayDate && holiday && "bg-destructive/10",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </TooltipTrigger>
                  {holiday && (
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-muted-foreground capitalize">{holiday.type === "national" ? "Feriado Nacional" : holiday.type === "regional" ? "Feriado Regional" : "Evento Escolar"}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary" />
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-destructive/10 border border-destructive/30" />
            <span>Feriado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-destructive font-semibold">D S</span>
            <span>Fim de semana</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
