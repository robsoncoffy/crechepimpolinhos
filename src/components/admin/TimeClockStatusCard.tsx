import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Clock, UserCheck, UserX, Coffee, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { startOfDay, endOfDay } from "date-fns";

interface EmployeeStatus {
  present: number;
  absent: number;
  onBreak: number;
}

export function TimeClockStatusCard() {
  const [stats, setStats] = useState<EmployeeStatus>({ present: 0, absent: 0, onBreak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("time-clock-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_time_clock" },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStats() {
    try {
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(new Date());

      // Get all employees
      const { data: employees } = await supabase
        .from("employee_profiles")
        .select("id");

      if (!employees) {
        setLoading(false);
        return;
      }

      // Get today's records
      const { data: records } = await supabase
        .from("employee_time_clock")
        .select("employee_id, clock_type, timestamp")
        .gte("timestamp", today.toISOString())
        .lte("timestamp", tomorrow.toISOString())
        .order("timestamp", { ascending: false });

      // Calculate stats
      let present = 0;
      let onBreak = 0;
      let absent = employees.length;

      const processedEmployees = new Set<string>();

      if (records) {
        for (const record of records) {
          if (processedEmployees.has(record.employee_id)) continue;
          processedEmployees.add(record.employee_id);
          absent--;

          switch (record.clock_type) {
            case "entry":
            case "break_end":
              present++;
              break;
            case "break_start":
              onBreak++;
              break;
            // exit means they left, so not counted as present
          }
        }
      }

      setStats({ present, absent, onBreak });
    } catch (error) {
      console.error("Error fetching time clock stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Clock className="w-6 h-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ponto Eletrônico</h3>
                <p className="text-sm text-muted-foreground">Status de hoje</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/painel/ponto">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserCheck className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xl font-bold">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Presentes</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Coffee className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xl font-bold">{stats.onBreak}</p>
            <p className="text-xs text-muted-foreground">Intervalo</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserX className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Ausentes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
