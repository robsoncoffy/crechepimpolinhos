import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Phone, Mail, User, MoreVertical, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScheduledVisit } from "@/pages/admin/AdminVisits";

interface VisitListViewProps {
  visits: ScheduledVisit[];
  isLoading: boolean;
  onVisitClick: (visit: ScheduledVisit) => void;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  confirmed: { label: "Confirmada", variant: "default" },
  completed: { label: "Realizada", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export function VisitListView({ visits, isLoading, onVisitClick }: VisitListViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Nenhuma visita agendada
          </h3>
          <p className="text-sm text-muted-foreground">
            Clique em "Agendar Visita" para criar um novo agendamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group visits by date
  const groupedVisits = visits.reduce((acc, visit) => {
    const dateKey = format(parseISO(visit.scheduled_at), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(visit);
    return acc;
  }, {} as Record<string, ScheduledVisit[]>);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedVisits).map(([dateKey, dayVisits]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {getDateLabel(dateKey)}
          </h3>
          <div className="space-y-3">
            {dayVisits.map((visit) => {
              const date = parseISO(visit.scheduled_at);
              const status = statusConfig[visit.status] || statusConfig.pending;
              const isOverdue = isPast(date) && visit.status === "pending";

              return (
                <Card
                  key={visit.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isOverdue ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                  onClick={() => onVisitClick(visit)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-foreground truncate">
                            {visit.contact_name}
                          </span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {isOverdue && (
                            <Badge variant="destructive">Atrasada</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>{format(date, "HH:mm")}</span>
                          </div>
                          {visit.contact_phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-4 w-4" />
                              <span>{visit.contact_phone}</span>
                            </div>
                          )}
                          {visit.contact_email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-4 w-4" />
                              <span className="truncate max-w-[200px]">
                                {visit.contact_email}
                              </span>
                            </div>
                          )}
                        </div>

                        {visit.notes && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                            {visit.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {visit.status === "pending" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Quick confirm
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Quick cancel
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
