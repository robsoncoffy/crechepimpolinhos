import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, differenceInMinutes, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV } from "@/components/admin/ReportExport";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface TimeClockRecord {
  id: string;
  employee_id: string;
  user_id: string;
  clock_type: "entry" | "exit" | "break_start" | "break_end";
  timestamp: string;
}

interface EmployeeProfile {
  id: string;
  user_id: string;
  full_name: string;
  job_title: string | null;
}

interface EmployeeTimeBank {
  id: string;
  name: string;
  jobTitle: string;
  expectedHours: number;
  workedHours: number;
  overtimeHours: number;
  balanceHours: number;
  weeklyData: { week: string; hours: number; overtime: number }[];
}

interface OvertimeAlert {
  employeeId: string;
  employeeName: string;
  workedHours: number;
  overtimeHours: number;
  alertType: "warning" | "danger";
}

const DAILY_WORK_HOURS = 8;
const WEEKLY_WORK_HOURS = 40;

export default function EmployeeOvertimeReport() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [timeBankData, setTimeBankData] = useState<EmployeeTimeBank[]>([]);
  const [alerts, setAlerts] = useState<OvertimeAlert[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedEmployee]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, job_title")
        .order("full_name");

      if (employeesData) {
        setEmployees(employeesData);
      }

      // Parse selected month
      const [year, month] = selectedMonth.split("-").map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(monthStart);

      // Fetch time clock records for the month
      let query = supabase
        .from("employee_time_clock")
        .select("id, employee_id, user_id, clock_type, timestamp")
        .gte("timestamp", format(monthStart, "yyyy-MM-dd"))
        .lte("timestamp", format(monthEnd, "yyyy-MM-dd'T'23:59:59"))
        .order("timestamp", { ascending: true });

      if (selectedEmployee !== "all") {
        query = query.eq("user_id", selectedEmployee);
      }

      const { data: recordsData } = await query;

      if (recordsData && employeesData) {
        calculateTimeBankData(recordsData, employeesData, monthStart, monthEnd);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeBankData = (
    records: TimeClockRecord[],
    allEmployees: EmployeeProfile[],
    monthStart: Date,
    monthEnd: Date
  ) => {
    // Calculate work days in the month
    const workDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(day => !isWeekend(day)).length;
    
    const expectedMonthlyHours = workDays * DAILY_WORK_HOURS;

    // Group records by employee
    const employeeRecords: Record<string, TimeClockRecord[]> = {};
    for (const record of records) {
      const empId = record.user_id;
      if (!employeeRecords[empId]) {
        employeeRecords[empId] = [];
      }
      employeeRecords[empId].push(record);
    }

    // Calculate time bank for each employee
    const timeBankResults: EmployeeTimeBank[] = [];
    const overtimeAlerts: OvertimeAlert[] = [];

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
      let overtimeMinutes = 0;
      const weeklyData: Record<string, { hours: number; overtime: number }> = {};

      for (const [dateStr, dayRecords] of Object.entries(dailyRecords)) {
        const date = parseISO(dateStr);
        const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), "dd/MM");
        
        if (!weeklyData[weekStart]) {
          weeklyData[weekStart] = { hours: 0, overtime: 0 };
        }

        const entry = dayRecords.find(r => r.clock_type === "entry");
        const exit = dayRecords.find(r => r.clock_type === "exit");
        
        if (entry && exit) {
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

          workedMinutes = Math.max(0, workedMinutes);
          totalMinutes += workedMinutes;

          const dailyOvertime = Math.max(0, workedMinutes - (DAILY_WORK_HOURS * 60));
          overtimeMinutes += dailyOvertime;

          weeklyData[weekStart].hours += workedMinutes / 60;
          weeklyData[weekStart].overtime += dailyOvertime / 60;
        }
      }

      const workedHours = totalMinutes / 60;
      const overtimeHours = overtimeMinutes / 60;
      const balanceHours = workedHours - expectedMonthlyHours;

      timeBankResults.push({
        id: emp.user_id,
        name: emp.full_name,
        jobTitle: emp.job_title || "Não informado",
        expectedHours: expectedMonthlyHours,
        workedHours: Math.round(workedHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        balanceHours: Math.round(balanceHours * 10) / 10,
        weeklyData: Object.entries(weeklyData).map(([week, data]) => ({
          week,
          hours: Math.round(data.hours * 10) / 10,
          overtime: Math.round(data.overtime * 10) / 10,
        })),
      });

      // Check for alerts (weekly overtime approaching or exceeding limit)
      // We check the current week
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const currentWeekRecords = empRecords.filter(r => {
        const recordDate = parseISO(r.timestamp);
        return recordDate >= currentWeekStart && recordDate <= endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      });

      // Calculate current week hours
      const currentWeekDays: Record<string, TimeClockRecord[]> = {};
      for (const record of currentWeekRecords) {
        const day = record.timestamp.split("T")[0];
        if (!currentWeekDays[day]) {
          currentWeekDays[day] = [];
        }
        currentWeekDays[day].push(record);
      }

      let weeklyMinutes = 0;
      for (const [, dayRecs] of Object.entries(currentWeekDays)) {
        const entry = dayRecs.find(r => r.clock_type === "entry");
        const exit = dayRecs.find(r => r.clock_type === "exit");
        if (entry && exit) {
          let mins = differenceInMinutes(parseISO(exit.timestamp), parseISO(entry.timestamp));
          const bs = dayRecs.find(r => r.clock_type === "break_start");
          const be = dayRecs.find(r => r.clock_type === "break_end");
          if (bs && be) {
            mins -= differenceInMinutes(parseISO(be.timestamp), parseISO(bs.timestamp));
          } else {
            mins -= 60;
          }
          weeklyMinutes += Math.max(0, mins);
        }
      }

      const weeklyHours = weeklyMinutes / 60;
      if (weeklyHours >= WEEKLY_WORK_HOURS * 0.8) {
        overtimeAlerts.push({
          employeeId: emp.user_id,
          employeeName: emp.full_name,
          workedHours: Math.round(weeklyHours * 10) / 10,
          overtimeHours: Math.round(Math.max(0, weeklyHours - WEEKLY_WORK_HOURS) * 10) / 10,
          alertType: weeklyHours >= WEEKLY_WORK_HOURS ? "danger" : "warning",
        });
      }
    }

    setTimeBankData(timeBankResults);
    setAlerts(overtimeAlerts);
  };

  const handleExportCSV = () => {
    exportToCSV(timeBankData.map(emp => ({
      funcionario: emp.name,
      cargo: emp.jobTitle,
      horas_esperadas: emp.expectedHours,
      horas_trabalhadas: emp.workedHours,
      horas_extras: emp.overtimeHours,
      banco_horas: emp.balanceHours,
    })), "banco_horas", [
      { key: "funcionario", label: "Funcionário" },
      { key: "cargo", label: "Cargo" },
      { key: "horas_esperadas", label: "Horas Esperadas" },
      { key: "horas_trabalhadas", label: "Horas Trabalhadas" },
      { key: "horas_extras", label: "Horas Extras" },
      { key: "banco_horas", label: "Banco de Horas" },
    ]);
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: ptBR }),
    };
  });

  // Summary stats
  const summary = {
    totalOvertime: timeBankData.reduce((acc, e) => acc + e.overtimeHours, 0),
    totalBalance: timeBankData.reduce((acc, e) => acc + e.balanceHours, 0),
    employeesWithOvertime: timeBankData.filter(e => e.overtimeHours > 0).length,
    dangerAlerts: alerts.filter(a => a.alertType === "danger").length,
  };

  // Chart data - aggregate weekly overtime
  const chartData = timeBankData.length > 0 && timeBankData[0].weeklyData.length > 0
    ? timeBankData[0].weeklyData.map((_, weekIndex) => {
        const weekLabel = timeBankData[0].weeklyData[weekIndex]?.week || `Semana ${weekIndex + 1}`;
        let totalHours = 0;
        let totalOvertime = 0;
        
        for (const emp of timeBankData) {
          if (emp.weeklyData[weekIndex]) {
            totalHours += emp.weeklyData[weekIndex].hours;
            totalOvertime += emp.weeklyData[weekIndex].overtime;
          }
        }
        
        return {
          week: weekLabel,
          "Horas Normais": Math.round((totalHours - totalOvertime) * 10) / 10,
          "Horas Extras": Math.round(totalOvertime * 10) / 10,
        };
      })
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.filter(a => a.alertType === "danger").map((alert) => (
            <Alert key={alert.employeeId} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Limite de Horas Excedido</AlertTitle>
              <AlertDescription>
                <strong>{alert.employeeName}</strong> já trabalhou{" "}
                <strong>{alert.workedHours}h</strong> esta semana, excedendo o limite de {WEEKLY_WORK_HOURS}h.
                {alert.overtimeHours > 0 && ` (${alert.overtimeHours}h extras)`}
              </AlertDescription>
            </Alert>
          ))}
          {alerts.filter(a => a.alertType === "warning").map((alert) => (
            <Alert key={alert.employeeId} className="border-amber-500 bg-amber-50 text-amber-900">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Aproximando do Limite</AlertTitle>
              <AlertDescription className="text-amber-800">
                <strong>{alert.employeeName}</strong> já trabalhou{" "}
                <strong>{alert.workedHours}h</strong> esta semana ({Math.round((alert.workedHours / WEEKLY_WORK_HOURS) * 100)}% do limite).
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Horas Extras</p>
                <p className="text-2xl font-bold">{summary.totalOvertime.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                summary.totalBalance >= 0 ? "bg-emerald-100" : "bg-red-100"
              )}>
                {summary.totalBalance >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Banco de Horas</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summary.totalBalance >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {summary.totalBalance >= 0 ? "+" : ""}{summary.totalBalance.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Com Horas Extras</p>
                <p className="text-2xl font-bold">{summary.employeesWithOvertime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                summary.dangerAlerts > 0 ? "bg-red-100" : "bg-emerald-100"
              )}>
                <AlertTriangle className={cn(
                  "w-5 h-5",
                  summary.dangerAlerts > 0 ? "text-red-600" : "text-emerald-600"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summary.dangerAlerts > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {summary.dangerAlerts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Semanal de Horas</CardTitle>
            <CardDescription>Horas normais vs. horas extras por semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Horas Normais" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="Horas Extras" stackId="a" fill="hsl(var(--destructive))" />
                  <ReferenceLine y={WEEKLY_WORK_HOURS} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Limite" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Banco de Horas e Horas Extras</CardTitle>
            <CardDescription>
              Controle mensal de horas trabalhadas
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funcionários</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.user_id} value={emp.user_id}>{emp.full_name}</SelectItem>
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
                <TableHead className="text-center">Esperado</TableHead>
                <TableHead className="text-center">Trabalhado</TableHead>
                <TableHead className="text-center">Horas Extras</TableHead>
                <TableHead className="text-center">Banco de Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeBankData.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{emp.jobTitle}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{emp.expectedHours}h</TableCell>
                  <TableCell className="text-center font-medium">{emp.workedHours}h</TableCell>
                  <TableCell className="text-center">
                    {emp.overtimeHours > 0 ? (
                      <Badge variant="destructive">{emp.overtimeHours}h</Badge>
                    ) : (
                      <span className="text-muted-foreground">0h</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {emp.balanceHours > 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : emp.balanceHours < 0 ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "font-semibold",
                        emp.balanceHours > 0 ? "text-emerald-600" : 
                        emp.balanceHours < 0 ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {emp.balanceHours > 0 ? "+" : ""}{emp.balanceHours}h
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {timeBankData.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro de ponto encontrado para o período selecionado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
