import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Clock, UserCheck, UserX, Coffee } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV } from "@/components/admin/ReportExport";
import { cn } from "@/lib/utils";

interface TimeClockRecord {
  id: string;
  employee_id: string;
  user_id: string;
  clock_type: "entry" | "exit" | "break_start" | "break_end";
  timestamp: string;
  employee_profiles?: {
    full_name: string;
    job_title: string | null;
  };
}

interface EmployeeFrequencyStats {
  id: string;
  name: string;
  jobTitle: string;
  workDays: number;
  daysWorked: number;
  absences: number;
  totalHours: number;
  avgHoursPerDay: number;
  rate: string;
}

interface EmployeeFrequencyReportProps {
  dateRange: { from: Date; to: Date };
}

export default function EmployeeFrequencyReport({ dateRange }: EmployeeFrequencyReportProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<TimeClockRecord[]>([]);
  const [stats, setStats] = useState<EmployeeFrequencyStats[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedEmployee]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, job_title")
        .order("full_name");

      if (employeesData) {
        setEmployees(employeesData.map(e => ({ id: e.user_id, name: e.full_name })));
      }

      // Fetch time clock records
      let query = supabase
        .from("employee_time_clock")
        .select(`
          id,
          employee_id,
          user_id,
          clock_type,
          timestamp,
          employee_profiles!employee_time_clock_employee_id_fkey (
            full_name,
            job_title
          )
        `)
        .gte("timestamp", format(dateRange.from, "yyyy-MM-dd"))
        .lte("timestamp", format(dateRange.to, "yyyy-MM-dd'T'23:59:59"))
        .order("timestamp", { ascending: true });

      if (selectedEmployee !== "all") {
        query = query.eq("user_id", selectedEmployee);
      }

      const { data: recordsData, error } = await query;

      if (error) {
        console.error("Error fetching time clock records:", error);
      }

      if (recordsData) {
        setRecords(recordsData as unknown as TimeClockRecord[]);
        calculateStats(recordsData as unknown as TimeClockRecord[], employeesData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    records: TimeClockRecord[],
    allEmployees: { id: string; user_id: string; full_name: string; job_title: string | null }[]
  ) => {
    const workDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      .filter(day => !isWeekend(day)).length;

    // Group records by employee
    const employeeRecords: Record<string, TimeClockRecord[]> = {};
    
    for (const record of records) {
      const empId = record.user_id;
      if (!employeeRecords[empId]) {
        employeeRecords[empId] = [];
      }
      employeeRecords[empId].push(record);
    }

    // Calculate stats for each employee
    const calculatedStats: EmployeeFrequencyStats[] = [];
    
    const employeesToProcess = selectedEmployee === "all" 
      ? allEmployees 
      : allEmployees.filter(e => e.user_id === selectedEmployee);

    for (const emp of employeesToProcess) {
      const empRecords = employeeRecords[emp.user_id] || [];
      
      // Group by day
      const dailyRecords: Record<string, TimeClockRecord[]> = {};
      for (const record of empRecords) {
        const day = record.timestamp.split("T")[0];
        if (!dailyRecords[day]) {
          dailyRecords[day] = [];
        }
        dailyRecords[day].push(record);
      }

      let totalMinutes = 0;
      let daysWorked = 0;

      for (const [, dayRecords] of Object.entries(dailyRecords)) {
        const entry = dayRecords.find(r => r.clock_type === "entry");
        const exit = dayRecords.find(r => r.clock_type === "exit");
        
        if (entry) {
          daysWorked++;
          
          if (exit) {
            let workedMinutes = differenceInMinutes(
              parseISO(exit.timestamp),
              parseISO(entry.timestamp)
            );

            // Subtract break
            const breakStart = dayRecords.find(r => r.clock_type === "break_start");
            const breakEnd = dayRecords.find(r => r.clock_type === "break_end");

            if (breakStart && breakEnd) {
              workedMinutes -= differenceInMinutes(
                parseISO(breakEnd.timestamp),
                parseISO(breakStart.timestamp)
              );
            } else {
              workedMinutes -= 60; // Default 1h break
            }

            totalMinutes += Math.max(0, workedMinutes);
          }
        }
      }

      const totalHours = totalMinutes / 60;
      const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
      const absences = workDays - daysWorked;
      const rate = workDays > 0 ? (daysWorked / workDays) * 100 : 0;

      calculatedStats.push({
        id: emp.user_id,
        name: emp.full_name,
        jobTitle: emp.job_title || "Não informado",
        workDays,
        daysWorked,
        absences: Math.max(0, absences),
        totalHours: Math.round(totalHours * 10) / 10,
        avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
        rate: rate.toFixed(1),
      });
    }

    setStats(calculatedStats);
  };

  const handleExportCSV = () => {
    exportToCSV(stats, "frequencia_funcionarios", [
      { key: "name", label: "Funcionário" },
      { key: "jobTitle", label: "Cargo" },
      { key: "workDays", label: "Dias Úteis" },
      { key: "daysWorked", label: "Dias Trabalhados" },
      { key: "absences", label: "Faltas" },
      { key: "totalHours", label: "Horas Totais" },
      { key: "avgHoursPerDay", label: "Média Horas/Dia" },
      { key: "rate", label: "% Frequência" },
    ]);
  };

  // Summary cards
  const summary = {
    totalEmployees: stats.length,
    avgRate: stats.length > 0 
      ? (stats.reduce((acc, s) => acc + parseFloat(s.rate), 0) / stats.length).toFixed(1)
      : "0",
    totalAbsences: stats.reduce((acc, s) => acc + s.absences, 0),
    totalHours: stats.reduce((acc, s) => acc + s.totalHours, 0).toFixed(1),
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
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Funcionários</p>
                <p className="text-2xl font-bold">{summary.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Clock className="w-5 h-5 text-green-600" />
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
              <div className="p-2 rounded-full bg-blue-100">
                <Coffee className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                <p className="text-2xl font-bold">{summary.totalHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Frequência de Funcionários</CardTitle>
            <CardDescription>
              Período: {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funcionários</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-center">Dias Úteis</TableHead>
                <TableHead className="text-center">Trabalhados</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
                <TableHead className="text-center">Horas Totais</TableHead>
                <TableHead className="text-center">Média/Dia</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.id}>
                  <TableCell className="font-medium">{stat.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{stat.jobTitle}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{stat.workDays}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">
                    {stat.daysWorked}
                  </TableCell>
                  <TableCell className="text-center text-red-600 font-medium">
                    {stat.absences}
                  </TableCell>
                  <TableCell className="text-center">{stat.totalHours}h</TableCell>
                  <TableCell className="text-center">{stat.avgHoursPerDay}h</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "font-semibold",
                      parseFloat(stat.rate) >= 75 ? "text-green-600" : "text-red-600"
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
              Nenhum registro de ponto encontrado para o período selecionado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
