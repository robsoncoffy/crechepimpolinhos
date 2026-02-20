import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Users, Baby, Utensils } from "lucide-react";

interface AttendanceStats {
  totalChildren: number;
  presentToday: number;
  absentToday: number;
  excusedToday: number;
  byClass: {
    bercario: { total: number; present: number };
    maternal: { total: number; present: number };
    jardim: { total: number; present: number };
  };
}

export function TodayAttendanceWidget() {
  const [stats, setStats] = useState<AttendanceStats>({
    totalChildren: 0,
    presentToday: 0,
    absentToday: 0,
    excusedToday: 0,
    byClass: {
      bercario: { total: 0, present: 0 },
      maternal: { total: 0, present: 0 },
      jardim: { total: 0, present: 0 },
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const today = new Date().toISOString().split("T")[0];

        // Fetch all children with class type
        const { data: children } = await supabase
          .from("children")
          .select("id, class_type");

        if (!children) return;

        // Fetch today's attendance
        const { data: attendance } = await supabase
          .from("attendance")
          .select("child_id, status")
          .eq("date", today);

        const attendanceMap = new Map(
          attendance?.map((a) => [a.child_id, a.status]) || []
        );

        // Calculate stats
        const byClass = {
          bercario: { total: 0, present: 0 },
          maternal: { total: 0, present: 0 },
          jardim: { total: 0, present: 0 },
        };

        let present = 0;
        let absent = 0;
        let excused = 0;

        children.forEach((child) => {
          const status = attendanceMap.get(child.id);
          const classType = child.class_type as keyof typeof byClass;

          if (byClass[classType]) {
            byClass[classType].total++;
            if (status === "present") {
              byClass[classType].present++;
              present++;
            } else if (status === "excused") {
              excused++;
            } else if (status === "absent") {
              absent++;
            }
          }
        });

        setStats({
          totalChildren: children.length,
          presentToday: present,
          absentToday: absent,
          excusedToday: excused,
          byClass,
        });
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAttendance();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("attendance-widget")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => fetchAttendance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const percentage = stats.totalChildren > 0 
    ? Math.round((stats.presentToday / stats.totalChildren) * 100) 
    : 0;

  const classLabels = {
    bercario: "Berçário",
    maternal: "Maternal",
    jardim: "Jardim",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Presença Hoje
          </div>
          <div className="flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-muted-foreground" />
            <span className="text-lg font-bold text-primary">{stats.presentToday}</span>
            <span className="text-sm text-muted-foreground">refeições</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground text-center py-4">Carregando...</div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {stats.presentToday} de {stats.totalChildren} crianças
                </span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                <Baby className="w-3 h-3 mr-1" />
                {stats.presentToday} presentes
              </Badge>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                {stats.excusedToday} justificados
              </Badge>
              <Badge variant="outline" className="text-red-600 border-red-300">
                {stats.absentToday} ausentes
              </Badge>
            </div>

            {/* By Class */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {(Object.entries(stats.byClass) as [keyof typeof classLabels, { total: number; present: number }][]).map(([key, value]) => (
                <div key={key} className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">{classLabels[key]}</p>
                  <p className="font-semibold text-sm">
                    {value.present}/{value.total}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
