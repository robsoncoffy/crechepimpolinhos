import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, X, Clock, AlertCircle, Users, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface Child {
  id: string;
  full_name: string;
  class_type: string | null;
  shift_type: string | null;
}

interface AttendanceRecord {
  id: string;
  child_id: string;
  date: string;
  status: AttendanceStatus;
  arrival_time: string | null;
  departure_time: string | null;
  notes: string | null;
}

const statusConfig = {
  present: { label: "Presente", icon: Check, color: "bg-green-500" },
  absent: { label: "Ausente", icon: X, color: "bg-red-500" },
  late: { label: "Atrasado", icon: Clock, color: "bg-yellow-500" },
  excused: { label: "Justificado", icon: AlertCircle, color: "bg-blue-500" },
};

const AdminAttendance = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const queryClient = useQueryClient();

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch all children
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["children-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, full_name, class_type, shift_type")
        .order("full_name");
      if (error) throw error;
      return data as Child[];
    },
  });

  // Fetch attendance for selected date
  const { data: attendanceRecords = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["attendance", formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", formattedDate);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // Create attendance map for quick lookup
  const attendanceMap = new Map(
    attendanceRecords.map((record) => [record.child_id, record])
  );

  // Filter children
  const filteredChildren = children.filter((child) => {
    if (selectedClass !== "all" && child.class_type !== selectedClass) return false;
    if (selectedShift !== "all" && child.shift_type !== selectedShift) return false;
    return true;
  });

  // Save attendance mutation
  const saveAttendance = useMutation({
    mutationFn: async ({
      childId,
      status,
      arrivalTime,
      notes,
    }: {
      childId: string;
      status: AttendanceStatus;
      arrivalTime?: string;
      notes?: string;
    }) => {
      const existingRecord = attendanceMap.get(childId);
      
      if (existingRecord) {
        const { error } = await supabase
          .from("attendance")
          .update({
            status,
            arrival_time: arrivalTime || null,
            notes: notes || null,
          })
          .eq("id", existingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          child_id: childId,
          date: formattedDate,
          status,
          arrival_time: arrivalTime || null,
          notes: notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
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
      const promises = filteredChildren.map((child) => {
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
      queryClient.invalidateQueries({ queryKey: ["attendance", formattedDate] });
      toast.success("Todas as crianças marcadas como presentes!");
    },
    onError: () => {
      toast.error("Erro ao marcar presença");
    },
  });

  // Calculate stats
  const stats = {
    total: filteredChildren.length,
    present: filteredChildren.filter(
      (c) => attendanceMap.get(c.id)?.status === "present"
    ).length,
    absent: filteredChildren.filter(
      (c) => attendanceMap.get(c.id)?.status === "absent"
    ).length,
    late: filteredChildren.filter(
      (c) => attendanceMap.get(c.id)?.status === "late"
    ).length,
    excused: filteredChildren.filter(
      (c) => attendanceMap.get(c.id)?.status === "excused"
    ).length,
    pending: filteredChildren.filter((c) => !attendanceMap.get(c.id)).length,
  };

  const isLoading = loadingChildren || loadingAttendance;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chamada Diária</h1>
          <p className="text-muted-foreground">
            Registre a presença das crianças
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="bercario">Berçário</SelectItem>
              <SelectItem value="maternal">Maternal</SelectItem>
              <SelectItem value="jardim">Jardim</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedShift} onValueChange={setSelectedShift}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Turno" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="manha">Manhã</SelectItem>
              <SelectItem value="tarde">Tarde</SelectItem>
              <SelectItem value="integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Presentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <UserX className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Ausentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => markAllPresent.mutate()}
          disabled={markAllPresent.isPending || filteredChildren.length === 0}
        >
          <UserCheck className="mr-2 h-4 w-4" />
          Marcar Todos Presentes
        </Button>
      </div>

      {/* Children List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Crianças</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">
              Carregando...
            </p>
          ) : filteredChildren.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma criança encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {filteredChildren.map((child) => {
                const record = attendanceMap.get(child.id);
                const currentStatus = record?.status;

                return (
                  <div
                    key={child.id}
                    className={cn(
                      "flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-lg border",
                      currentStatus === "present" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                      currentStatus === "absent" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                      currentStatus === "late" && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
                      currentStatus === "excused" && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
                      !currentStatus && "bg-muted/30"
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{child.full_name}</p>
                      <div className="flex gap-2 mt-1">
                        {child.class_type && (
                          <Badge variant="secondary" className="text-xs">
                            {child.class_type === "bercario"
                              ? "Berçário"
                              : child.class_type === "maternal"
                              ? "Maternal"
                              : "Jardim"}
                          </Badge>
                        )}
                        {child.shift_type && (
                          <Badge variant="outline" className="text-xs">
                            {child.shift_type === "manha"
                              ? "Manhã"
                              : child.shift_type === "tarde"
                              ? "Tarde"
                              : "Integral"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(statusConfig) as AttendanceStatus[]).map(
                        (status) => {
                          const config = statusConfig[status];
                          const Icon = config.icon;
                          const isActive = currentStatus === status;

                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              className={cn(
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
                              <Icon className="h-4 w-4 mr-1" />
                              {config.label}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    {record?.arrival_time && (
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Entrada: {record.arrival_time.slice(0, 5)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAttendance;
