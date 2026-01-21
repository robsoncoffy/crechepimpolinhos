import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, AlertCircle, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type Child = Database["public"]["Tables"]["children"]["Row"];

interface AttendanceRecord {
  id: string;
  child_id: string;
  date: string;
  status: AttendanceStatus;
  arrival_time: string | null;
  departure_time: string | null;
  notes: string | null;
}

interface TeacherAttendanceTabProps {
  children: Child[];
  selectedDate: Date;
}

const statusConfig = {
  present: { label: "Presente", icon: Check, color: "bg-green-500" },
  absent: { label: "Ausente", icon: X, color: "bg-red-500" },
  late: { label: "Atrasado", icon: Clock, color: "bg-yellow-500" },
  excused: { label: "Justificado", icon: AlertCircle, color: "bg-blue-500" },
};

export function TeacherAttendanceTab({ children, selectedDate }: TeacherAttendanceTabProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch attendance records
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", formattedDate);
      
      if (error) throw error;
      setAttendanceRecords(data as AttendanceRecord[] || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Erro ao carregar chamada");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();

    // Subscribe to realtime changes for sync with Admin page
    const channel = supabase
      .channel("teacher-attendance-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `date=eq.${formattedDate}`,
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formattedDate]);

  // Create attendance map for quick lookup
  const attendanceMap = new Map(
    attendanceRecords.map((record) => [record.child_id, record])
  );

  // Save attendance mutation
  const saveAttendance = useMutation({
    mutationFn: async ({
      childId,
      status,
      arrivalTime,
    }: {
      childId: string;
      status: AttendanceStatus;
      arrivalTime?: string;
    }) => {
      const existingRecord = attendanceMap.get(childId);
      
      if (existingRecord) {
        const { error } = await supabase
          .from("attendance")
          .update({
            status,
            arrival_time: arrivalTime || null,
          })
          .eq("id", existingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          child_id: childId,
          date: formattedDate,
          status,
          arrival_time: arrivalTime || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      fetchAttendance();
      queryClient.invalidateQueries({ queryKey: ["attendance", formattedDate] });
      toast.success("Presença registrada!");
    },
    onError: (error) => {
      console.error("Error saving attendance:", error);
      toast.error("Erro ao registrar presença");
    },
  });

  // Mark all present
  const markAllPresent = useMutation({
    mutationFn: async () => {
      const now = format(new Date(), "HH:mm");
      const promises = children.map((child) => {
        const existingRecord = attendanceMap.get(child.id);
        if (existingRecord) {
          return supabase
            .from("attendance")
            .update({ status: "present", arrival_time: now })
            .eq("id", existingRecord.id);
        } else {
          return supabase.from("attendance").insert({
            child_id: child.id,
            date: formattedDate,
            status: "present",
            arrival_time: now,
          });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      fetchAttendance();
      queryClient.invalidateQueries({ queryKey: ["attendance", formattedDate] });
      toast.success("Todos marcados como presentes!");
    },
    onError: () => {
      toast.error("Erro ao marcar presença");
    },
  });

  // Calculate stats
  const stats = {
    total: children.length,
    present: children.filter((c) => attendanceMap.get(c.id)?.status === "present").length,
    absent: children.filter((c) => attendanceMap.get(c.id)?.status === "absent").length,
    late: children.filter((c) => attendanceMap.get(c.id)?.status === "late").length,
    pending: children.filter((c) => !attendanceMap.get(c.id)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <Badge variant="outline" className="py-1.5">
            <UserCheck className="w-3 h-3 mr-1.5 text-green-500" />
            {stats.present} Presentes
          </Badge>
          <Badge variant="outline" className="py-1.5">
            <X className="w-3 h-3 mr-1.5 text-red-500" />
            {stats.absent} Ausentes
          </Badge>
          <Badge variant="outline" className="py-1.5">
            <Clock className="w-3 h-3 mr-1.5 text-yellow-500" />
            {stats.pending} Pendentes
          </Badge>
        </div>
        
        <Button
          size="sm"
          onClick={() => markAllPresent.mutate()}
          disabled={markAllPresent.isPending || children.length === 0}
        >
          <UserCheck className="mr-2 h-4 w-4" />
          Marcar Todos Presentes
        </Button>
      </div>

      {/* Children List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {children.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma criança na sua turma</p>
            </div>
          ) : (
            children.map((child) => {
              const record = attendanceMap.get(child.id);
              const currentStatus = record?.status;

              return (
                <div
                  key={child.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-colors",
                    currentStatus === "present" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                    currentStatus === "absent" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                    currentStatus === "late" && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
                    currentStatus === "excused" && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
                    !currentStatus && "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      {child.photo_url && (
                        <AvatarImage src={child.photo_url} alt={child.full_name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {child.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{child.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {classTypeLabels[child.class_type]} • {shiftTypeLabels[child.shift_type]}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                      const config = statusConfig[status];
                      const Icon = config.icon;
                      const isActive = currentStatus === status;

                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className={cn(
                            "h-8 px-2.5",
                            isActive && config.color,
                            isActive && "text-white hover:opacity-90"
                          )}
                          onClick={() =>
                            saveAttendance.mutate({
                              childId: child.id,
                              status,
                              arrivalTime:
                                status === "present" || status === "late"
                                  ? format(new Date(), "HH:mm")
                                  : undefined,
                            })
                          }
                          disabled={saveAttendance.isPending}
                        >
                          <Icon className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">{config.label}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {record?.arrival_time && (
                    <div className="text-xs text-muted-foreground shrink-0">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {record.arrival_time.slice(0, 5)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
