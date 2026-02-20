import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { CalendarOff, UserMinus, Stethoscope, Plane, Baby } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StaffAbsence {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  employee?: {
    full_name: string;
    photo_url: string | null;
    job_title: string | null;
  };
}

const absenceTypeConfig: Record<string, { label: string; icon: typeof CalendarOff; color: string }> = {
  vacation: { label: "Férias", icon: Plane, color: "bg-blue-100 text-blue-700" },
  sick_leave: { label: "Atestado", icon: Stethoscope, color: "bg-red-100 text-red-700" },
  maternity: { label: "Licença Maternidade", icon: Baby, color: "bg-pink-100 text-pink-700" },
  personal: { label: "Pessoal", icon: UserMinus, color: "bg-yellow-100 text-yellow-700" },
  other: { label: "Outro", icon: CalendarOff, color: "bg-gray-100 text-gray-700" },
};

export function StaffAbsencesWidget() {
  const [absences, setAbsences] = useState<StaffAbsence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAbsences() {
      try {
        const today = new Date().toISOString().split("T")[0];

        // Fetch approved absences that include today
        const { data: absenceData } = await supabase
          .from("employee_absences")
          .select("*")
          .eq("status", "approved")
          .lte("start_date", today)
          .gte("end_date", today);

        if (!absenceData || absenceData.length === 0) {
          setAbsences([]);
          setLoading(false);
          return;
        }

        // Fetch employee profiles
        const employeeIds = absenceData.map((a) => a.employee_id);
        const { data: profiles } = await supabase
          .from("employee_profiles")
          .select("user_id, full_name, photo_url, job_title")
          .in("user_id", employeeIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p]) || []
        );

        const enrichedAbsences = absenceData.map((absence) => ({
          ...absence,
          employee: profileMap.get(absence.employee_id),
        }));

        setAbsences(enrichedAbsences);
      } catch (error) {
        console.error("Error fetching staff absences:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAbsences();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("staff-absences-widget")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_absences" },
        () => fetchAbsences()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-orange-500" />
            Ausências da Equipe
          </div>
          {absences.length > 0 && (
            <Badge variant="secondary">{absences.length} hoje</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-muted-foreground text-center py-4">Carregando...</div>
        ) : absences.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma ausência hoje</p>
            <p className="text-xs">Toda a equipe presente! 🎉</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {absences.map((absence) => {
                const config = absenceTypeConfig[absence.type] || absenceTypeConfig.other;
                const AbsenceIcon = config.icon;

                return (
                  <div
                    key={absence.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={absence.employee?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {absence.employee?.full_name
                          ? getInitials(absence.employee.full_name)
                          : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {absence.employee?.full_name || "Funcionário"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {absence.employee?.job_title || "Cargo não definido"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-xs ${config.color}`}>
                        <AbsenceIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        até {format(parseISO(absence.end_date), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
