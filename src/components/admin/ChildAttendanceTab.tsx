import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Calendar as CalendarIcon, UserCheck, UserX, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV } from "@/components/admin/ReportExport";
import { cn } from "@/lib/utils";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  shift_type: string;
}

interface AttendanceRecord {
  id: string;
  child_id: string;
  date: string;
  status: string;
}

interface AttendanceStats {
  id: string;
  name: string;
  classType: string;
  shiftType: string;
  workDays: number;
  present: number;
  absent: number;
  rate: string;
}

interface ChildAttendanceTabProps {
  children: Child[];
}

export default function ChildAttendanceTab({ children }: ChildAttendanceTabProps) {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    fetchAttendance();
  }, [dateRange, selectedClass, selectedShift, children]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date", format(dateRange.to, "yyyy-MM-dd"));

      if (data) {
        setAttendance(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (attendanceData: AttendanceRecord[]) => {
    const workDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      .filter(day => !isWeekend(day)).length;

    const filteredChildren = children.filter(c => {
      const matchesClass = selectedClass === "all" || c.class_type === selectedClass;
      const matchesShift = selectedShift === "all" || c.shift_type === selectedShift;
      return matchesClass && matchesShift;
    });

    const calculatedStats: AttendanceStats[] = filteredChildren.map(child => {
      const childAttendance = attendanceData.filter(a => a.child_id === child.id);
      const present = childAttendance.filter(a => a.status === "present").length;
      const absent = childAttendance.filter(a => a.status === "absent").length;
      const rate = workDays > 0 ? (present / workDays) * 100 : 0;

      return {
        id: child.id,
        name: child.full_name,
        classType: child.class_type,
        shiftType: child.shift_type,
        workDays,
        present,
        absent,
        rate: rate.toFixed(1),
      };
    });

    setStats(calculatedStats);
  };

  const handleExportCSV = () => {
    exportToCSV(stats.map(s => ({
      aluno: s.name,
      turma: classTypeLabels[s.classType as keyof typeof classTypeLabels] || s.classType,
      turno: shiftTypeLabels[s.shiftType as keyof typeof shiftTypeLabels] || s.shiftType,
      dias_uteis: s.workDays,
      presencas: s.present,
      faltas: s.absent,
      frequencia: `${s.rate}%`,
    })), "frequencia_alunos", [
      { key: "aluno", label: "Aluno" },
      { key: "turma", label: "Turma" },
      { key: "turno", label: "Turno" },
      { key: "dias_uteis", label: "Dias Úteis" },
      { key: "presencas", label: "Presenças" },
      { key: "faltas", label: "Faltas" },
      { key: "frequencia", label: "Frequência" },
    ]);
  };

  // Summary
  const summary = {
    total: stats.length,
    avgRate: stats.length > 0
      ? (stats.reduce((acc, s) => acc + parseFloat(s.rate), 0) / stats.length).toFixed(1)
      : "0",
    totalAbsences: stats.reduce((acc, s) => acc + s.absent, 0),
    lowAttendance: stats.filter(s => parseFloat(s.rate) < 75).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Alunos</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frequência Média</p>
                <p className="text-2xl font-bold">{summary.avgRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Faltas</p>
                <p className="text-2xl font-bold">{summary.totalAbsences}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                summary.lowAttendance > 0 ? "bg-amber-100" : "bg-emerald-100"
              )}>
                <UserX className={cn(
                  "w-5 h-5",
                  summary.lowAttendance > 0 ? "text-amber-600" : "text-emerald-600"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Baixa Frequência</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summary.lowAttendance > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {summary.lowAttendance}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Class Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(classTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turno</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(shiftTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Date Presets */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: startOfMonth(new Date()),
                  to: endOfMonth(new Date()),
                })}
              >
                Este Mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: startOfMonth(subMonths(new Date(), 1)),
                  to: endOfMonth(subMonths(new Date(), 1)),
                })}
              >
                Mês Anterior
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Frequência de Alunos</CardTitle>
            <CardDescription>
              Período: {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-center">Dias Úteis</TableHead>
                <TableHead className="text-center">Presenças</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.id}>
                  <TableCell className="font-medium">{stat.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {classTypeLabels[stat.classType as keyof typeof classTypeLabels] || stat.classType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {shiftTypeLabels[stat.shiftType as keyof typeof shiftTypeLabels] || stat.shiftType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{stat.workDays}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">
                    {stat.present}
                  </TableCell>
                  <TableCell className="text-center text-red-600 font-medium">
                    {stat.absent}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "font-semibold",
                      parseFloat(stat.rate) >= 75 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {stat.rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {stats.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum aluno encontrado com os filtros selecionados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
