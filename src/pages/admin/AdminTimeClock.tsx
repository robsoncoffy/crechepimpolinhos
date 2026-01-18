import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Loader2,
  UserCheck,
  UserX,
  Coffee,
  LogIn,
  LogOut,
  Plus,
  Settings,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  AlertCircle,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import { format, startOfDay, endOfDay, parseISO, differenceInMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeClockRecord {
  id: string;
  employee_id: string;
  user_id: string;
  clock_type: "entry" | "exit" | "break_start" | "break_end";
  timestamp: string;
  source: "controlid" | "manual" | "mobile";
  device_id: string | null;
  verified: boolean;
  notes: string | null;
  created_by?: string | null;
  employee_profiles?: {
    full_name: string;
    job_title: string | null;
  } | null;
}

interface EmployeeStatus {
  employee_id: string;
  user_id: string;
  full_name: string;
  job_title: string | null;
  lastRecord: TimeClockRecord | null;
  status: "present" | "absent" | "on_break" | "left";
  entryTime: string | null;
}

interface SetupTask {
  id: string;
  task_key: string;
  task_label: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  order_index: number;
}

interface TimeClockConfig {
  id: string;
  device_name: string;
  device_ip: string | null;
  webhook_secret: string;
  is_active: boolean;
  work_start_time: string;
  work_end_time: string;
  tolerance_minutes: number;
  break_duration_minutes: number;
}

export default function AdminTimeClock() {
  const [loading, setLoading] = useState(true);
  const [todayRecords, setTodayRecords] = useState<TimeClockRecord[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [setupTasks, setSetupTasks] = useState<SetupTask[]>([]);
  const [config, setConfig] = useState<TimeClockConfig | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [reportData, setReportData] = useState<TimeClockRecord[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualFormLoading, setManualFormLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; user_id: string; full_name: string; job_title: string | null }[]>([]);
  const [manualForm, setManualForm] = useState({
    employee_id: "",
    clock_type: "entry" as "entry" | "exit" | "break_start" | "break_end",
    timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: "",
  });

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("time-clock-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_time_clock" },
        () => {
          fetchTodayRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchTodayRecords(),
      fetchSetupTasks(),
      fetchConfig(),
      fetchEmployees(),
    ]);
    setLoading(false);
  }

  async function fetchTodayRecords() {
    try {
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(new Date());

      const { data: records, error } = await supabase
        .from("employee_time_clock")
        .select(`
          *,
          employee_profiles (
            full_name,
            job_title
          )
        `)
        .gte("timestamp", today.toISOString())
        .lte("timestamp", tomorrow.toISOString())
        .order("timestamp", { ascending: false });

      if (error) throw error;

      setTodayRecords((records as TimeClockRecord[]) || []);
      
      // Calculate employee statuses
      await calculateEmployeeStatuses((records as TimeClockRecord[]) || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Erro ao carregar registros");
    }
  }

  async function calculateEmployeeStatuses(records: TimeClockRecord[]) {
    try {
      // Get all employees
      const { data: allEmployees } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, job_title");

      if (!allEmployees) return;

      const statuses: EmployeeStatus[] = (allEmployees as { id: string; user_id: string; full_name: string; job_title: string | null }[]).map((emp) => {
        const empRecords = records.filter((r) => r.employee_id === emp.id);
        const lastRecord = empRecords[0] || null;
        
        let status: "present" | "absent" | "on_break" | "left" = "absent";
        let entryTime: string | null = null;

        if (lastRecord) {
          const entryRecord = empRecords.find((r) => r.clock_type === "entry");
          entryTime = entryRecord?.timestamp || null;

          switch (lastRecord.clock_type) {
            case "entry":
            case "break_end":
              status = "present";
              break;
            case "break_start":
              status = "on_break";
              break;
            case "exit":
              status = "left";
              break;
          }
        }

        return {
          employee_id: emp.id,
          user_id: emp.user_id,
          full_name: emp.full_name,
          job_title: emp.job_title || "Funcionário",
          lastRecord,
          status,
          entryTime,
        };
      });

      setEmployeeStatuses(statuses);
    } catch (error) {
      console.error("Error calculating statuses:", error);
    }
  }

  async function fetchSetupTasks() {
    try {
      const { data, error } = await supabase
        .from("time_clock_setup_tasks")
        .select("*")
        .order("order_index");

      if (error) throw error;
      setSetupTasks(data || []);
    } catch (error) {
      console.error("Error fetching setup tasks:", error);
    }
  }

  async function fetchConfig() {
    try {
      const { data, error } = await supabase
        .from("time_clock_config")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setConfig(data);
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  }

  async function fetchEmployees() {
    try {
      const { data } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, job_title")
        .order("full_name");

      setEmployees((data as { id: string; user_id: string; full_name: string; job_title: string | null }[]) || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async function fetchReportData() {
    setReportLoading(true);
    try {
      const monthDate = parseISO(selectedMonth + "-01");
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      let query = supabase
        .from("employee_time_clock")
        .select(`
          *,
          employee_profiles (
            full_name,
            job_title
          )
        `)
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .order("timestamp", { ascending: true });

      if (selectedEmployee !== "all") {
        query = query.eq("employee_id", selectedEmployee);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReportData((data as TimeClockRecord[]) || []);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setReportLoading(false);
    }
  }

  interface DailyRecord {
    date: Date;
    entry: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    exit: string | null;
    totalMinutes: number;
    overtime: number;
  }

  function calculateEmployeeMonthlyData(employeeId: string): DailyRecord[] {
    const monthDate = parseISO(selectedMonth + "-01");
    const days = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });

    const employeeRecords = reportData.filter((r) => r.employee_id === employeeId);
    const workMinutesPerDay = config
      ? differenceInMinutes(
          parseISO(`2000-01-01T${config.work_end_time}`),
          parseISO(`2000-01-01T${config.work_start_time}`)
        ) - (config.break_duration_minutes || 60)
      : 8 * 60 - 60; // Default 8h - 1h break

    return days.map((day) => {
      const dayRecords = employeeRecords.filter((r) =>
        isSameDay(parseISO(r.timestamp), day)
      );

      const entry = dayRecords.find((r) => r.clock_type === "entry");
      const breakStart = dayRecords.find((r) => r.clock_type === "break_start");
      const breakEnd = dayRecords.find((r) => r.clock_type === "break_end");
      const exit = dayRecords.find((r) => r.clock_type === "exit");

      let totalMinutes = 0;
      if (entry && exit) {
        totalMinutes = differenceInMinutes(parseISO(exit.timestamp), parseISO(entry.timestamp));
        // Subtract break time if recorded
        if (breakStart && breakEnd) {
          totalMinutes -= differenceInMinutes(parseISO(breakEnd.timestamp), parseISO(breakStart.timestamp));
        } else if (config) {
          totalMinutes -= config.break_duration_minutes || 60;
        }
      }

      const overtime = Math.max(0, totalMinutes - workMinutesPerDay);

      return {
        date: day,
        entry: entry ? format(parseISO(entry.timestamp), "HH:mm") : null,
        breakStart: breakStart ? format(parseISO(breakStart.timestamp), "HH:mm") : null,
        breakEnd: breakEnd ? format(parseISO(breakEnd.timestamp), "HH:mm") : null,
        exit: exit ? format(parseISO(exit.timestamp), "HH:mm") : null,
        totalMinutes,
        overtime,
      };
    });
  }

  function formatMinutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, "0")}min`;
  }

  function exportToCSV() {
    if (employees.length === 0) {
      toast.error("Nenhum funcionário para exportar");
      return;
    }

    const targetEmployees = selectedEmployee === "all" 
      ? employees 
      : employees.filter((e) => e.id === selectedEmployee);

    let csv = "FOLHA DE PONTO - CRECHE PIMPOLINHOS\n";
    csv += `Período: ${format(parseISO(selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}\n\n`;

    targetEmployees.forEach((emp) => {
      const monthlyData = calculateEmployeeMonthlyData(emp.id);
      const totalWorked = monthlyData.reduce((acc, d) => acc + d.totalMinutes, 0);
      const totalOvertime = monthlyData.reduce((acc, d) => acc + d.overtime, 0);

      csv += `Funcionário: ${emp.full_name}\n`;
      csv += `Função: ${emp.job_title || "Não informado"}\n\n`;
      csv += "Data;Dia;Entrada;Início Intervalo;Fim Intervalo;Saída;Horas Trabalhadas;Hora Extra\n";

      monthlyData.forEach((day) => {
        const dayName = format(day.date, "EEE", { locale: ptBR });
        csv += `${format(day.date, "dd/MM/yyyy")};`;
        csv += `${dayName};`;
        csv += `${day.entry || "-"};`;
        csv += `${day.breakStart || "-"};`;
        csv += `${day.breakEnd || "-"};`;
        csv += `${day.exit || "-"};`;
        csv += `${day.totalMinutes > 0 ? formatMinutesToHours(day.totalMinutes) : "-"};`;
        csv += `${day.overtime > 0 ? formatMinutesToHours(day.overtime) : "-"}\n`;
      });

      csv += `\nTotal de Horas Trabalhadas: ${formatMinutesToHours(totalWorked)}\n`;
      csv += `Total de Horas Extras: ${formatMinutesToHours(totalOvertime)}\n`;
      csv += "\n---\n\n";
    });

    csv += `\nRelatório gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}\n`;

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `folha-ponto-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success("Relatório exportado com sucesso!");
  }

  function printTimeSheet() {
    if (selectedEmployee === "all") {
      toast.error("Selecione um funcionário para imprimir");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmployee);
    if (!emp) return;

    const monthlyData = calculateEmployeeMonthlyData(selectedEmployee);
    const totalWorked = monthlyData.reduce((acc, d) => acc + d.totalMinutes, 0);
    const totalOvertime = monthlyData.reduce((acc, d) => acc + d.overtime, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Folha de Ponto - ${emp.full_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
          h2 { text-align: center; font-size: 14px; color: #666; margin-top: 0; }
          .info { margin: 20px 0; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
          th { background: #f0f0f0; font-weight: bold; }
          .totals { margin-top: 20px; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature-line { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 5px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>FOLHA DE PONTO</h1>
        <h2>Creche Pimpolinhos - ${format(parseISO(selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}</h2>
        
        <div class="info">
          <p><strong>Funcionário:</strong> ${emp.full_name}</p>
          <p><strong>Função:</strong> ${emp.job_title || "Não informado"}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Dia</th>
              <th>Entrada</th>
              <th>Início Int.</th>
              <th>Fim Int.</th>
              <th>Saída</th>
              <th>Horas</th>
              <th>H. Extra</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyData.map((day) => `
              <tr>
                <td>${format(day.date, "dd/MM")}</td>
                <td>${format(day.date, "EEE", { locale: ptBR })}</td>
                <td>${day.entry || "-"}</td>
                <td>${day.breakStart || "-"}</td>
                <td>${day.breakEnd || "-"}</td>
                <td>${day.exit || "-"}</td>
                <td>${day.totalMinutes > 0 ? formatMinutesToHours(day.totalMinutes) : "-"}</td>
                <td>${day.overtime > 0 ? formatMinutesToHours(day.overtime) : "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <div class="totals">
          <p><strong>Total de Horas Trabalhadas:</strong> ${formatMinutesToHours(totalWorked)}</p>
          <p><strong>Total de Horas Extras:</strong> ${formatMinutesToHours(totalOvertime)}</p>
        </div>
        
        <div class="signature">
          <div class="signature-line">Funcionário</div>
          <div class="signature-line">Responsável RH</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  async function toggleSetupTask(taskId: string, completed: boolean) {
    try {
      const { error } = await supabase
        .from("time_clock_setup_tasks")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;
      
      setSetupTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, is_completed: completed, completed_at: completed ? new Date().toISOString() : null }
            : t
        )
      );
      
      toast.success(completed ? "Tarefa concluída!" : "Tarefa desmarcada");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  }

  async function updateConfig(updates: Partial<TimeClockConfig>) {
    if (!config) return;
    
    try {
      const { error } = await supabase
        .from("time_clock_config")
        .update(updates)
        .eq("id", config.id);

      if (error) throw error;
      
      setConfig({ ...config, ...updates });
      toast.success("Configuração atualizada!");
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Erro ao atualizar configuração");
    }
  }

  async function handleManualRecord(e: React.FormEvent) {
    e.preventDefault();
    setManualFormLoading(true);

    try {
      const employee = employees.find((e) => e.id === manualForm.employee_id);
      if (!employee) throw new Error("Funcionário não encontrado");

      const { error } = await supabase.from("employee_time_clock").insert({
        employee_id: manualForm.employee_id,
        user_id: employee.user_id,
        clock_type: manualForm.clock_type,
        timestamp: new Date(manualForm.timestamp).toISOString(),
        source: "manual",
        notes: manualForm.notes || null,
      });

      if (error) throw error;

      toast.success("Registro manual adicionado!");
      setManualDialogOpen(false);
      setManualForm({
        employee_id: "",
        clock_type: "entry",
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: "",
      });
      fetchTodayRecords();
    } catch (error: any) {
      console.error("Error adding manual record:", error);
      toast.error(error.message || "Erro ao adicionar registro");
    } finally {
      setManualFormLoading(false);
    }
  }

  function copyWebhookUrl() {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/controlid-webhook`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  }

  function copyWebhookSecret() {
    if (config?.webhook_secret) {
      navigator.clipboard.writeText(config.webhook_secret);
      toast.success("Secret copiado!");
    }
  }

  const stats = {
    present: employeeStatuses.filter((e) => e.status === "present").length,
    absent: employeeStatuses.filter((e) => e.status === "absent").length,
    onBreak: employeeStatuses.filter((e) => e.status === "on_break").length,
    left: employeeStatuses.filter((e) => e.status === "left").length,
  };

  const completedTasks = setupTasks.filter((t) => t.is_completed).length;
  const totalTasks = setupTasks.length;

  function getClockTypeLabel(type: string) {
    switch (type) {
      case "entry": return "Entrada";
      case "exit": return "Saída";
      case "break_start": return "Início Intervalo";
      case "break_end": return "Fim Intervalo";
      default: return type;
    }
  }

  function getClockTypeIcon(type: string) {
    switch (type) {
      case "entry": return <LogIn className="w-4 h-4 text-green-500" />;
      case "exit": return <LogOut className="w-4 h-4 text-red-500" />;
      case "break_start": return <Coffee className="w-4 h-4 text-orange-500" />;
      case "break_end": return <Coffee className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Presente</Badge>;
      case "absent":
        return <Badge variant="secondary">Ausente</Badge>;
      case "on_break":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">Intervalo</Badge>;
      case "left":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Saiu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
            Ponto Eletrônico
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de frequência com integração Control iD
          </p>
        </div>
        <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registro Manual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registro Manual de Ponto</DialogTitle>
              <DialogDescription>
                Adicione um registro de ponto manualmente para correções
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualRecord}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select
                    value={manualForm.employee_id}
                    onValueChange={(v) => setManualForm({ ...manualForm, employee_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Registro</Label>
                  <Select
                    value={manualForm.clock_type}
                    onValueChange={(v) => setManualForm({ ...manualForm, clock_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entrada</SelectItem>
                      <SelectItem value="break_start">Início Intervalo</SelectItem>
                      <SelectItem value="break_end">Fim Intervalo</SelectItem>
                      <SelectItem value="exit">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input
                    type="datetime-local"
                    value={manualForm.timestamp}
                    onChange={(e) => setManualForm({ ...manualForm, timestamp: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    placeholder="Motivo do registro manual..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setManualDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={manualFormLoading || !manualForm.employee_id}>
                  {manualFormLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Setup Warning */}
      {completedTasks < totalTasks && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            <div className="flex-1">
              <h3 className="font-semibold">Configuração Pendente</h3>
              <p className="text-sm text-muted-foreground">
                Complete as tarefas de configuração na aba "Configuração" para ativar o relógio de ponto.
              </p>
            </div>
            <Badge variant="outline" className="text-orange-600">
              {completedTasks}/{totalTasks} tarefas
            </Badge>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="manual">Registros</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* Today Tab */}
        <TabsContent value="today" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-full bg-green-500/10">
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.present}</p>
                  <p className="text-sm text-muted-foreground">Presentes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-full bg-muted">
                  <UserX className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.absent}</p>
                  <p className="text-sm text-muted-foreground">Ausentes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <Coffee className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.onBreak}</p>
                  <p className="text-sm text-muted-foreground">Em Intervalo</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <LogOut className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.left}</p>
                  <p className="text-sm text-muted-foreground">Saíram</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Status List */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Funcionários</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeeStatuses.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeStatuses.map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {emp.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{emp.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{emp.job_title}</TableCell>
                        <TableCell>
                          {emp.entryTime
                            ? format(parseISO(emp.entryTime), "HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(emp.status)}</TableCell>
                        <TableCell>
                          {emp.lastRecord ? (
                            <div className="flex items-center gap-2">
                              {getClockTypeIcon(emp.lastRecord.clock_type)}
                              <span className="text-sm">
                                {format(parseISO(emp.lastRecord.timestamp), "HH:mm")}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Today's Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Hoje</CardTitle>
              <CardDescription>Últimos registros de ponto</CardDescription>
            </CardHeader>
            <CardContent>
              {todayRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum registro hoje</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayRecords.slice(0, 20).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      {getClockTypeIcon(record.clock_type)}
                      <div className="flex-1">
                        <p className="font-medium">
                          {record.employee_profiles?.full_name || "Funcionário"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getClockTypeLabel(record.clock_type)}
                          {record.source === "manual" && " (manual)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">
                          {format(parseISO(record.timestamp), "HH:mm:ss")}
                        </p>
                        {record.verified && (
                          <Badge variant="outline" className="text-xs">
                            Biometria
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Folha de Ponto para Contador
              </CardTitle>
              <CardDescription>
                Gere relatórios no formato tradicional de folha de ponto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mês/Ano</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Funcionários</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchReportData} disabled={reportLoading} className="w-full">
                    {reportLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    Gerar Relatório
                  </Button>
                </div>
              </div>

              {/* Export Buttons */}
              {reportData.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={printTimeSheet}
                    disabled={selectedEmployee === "all"}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Folha
                  </Button>
                </div>
              )}

              {/* Report Preview */}
              {reportData.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Selecione o mês e clique em "Gerar Relatório"
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(selectedEmployee === "all" ? employees : employees.filter((e) => e.id === selectedEmployee)).map((emp) => {
                    const monthlyData = calculateEmployeeMonthlyData(emp.id);
                    const totalWorked = monthlyData.reduce((acc, d) => acc + d.totalMinutes, 0);
                    const totalOvertime = monthlyData.reduce((acc, d) => acc + d.overtime, 0);
                    const hasRecords = monthlyData.some((d) => d.entry !== null);

                    if (!hasRecords && selectedEmployee === "all") return null;

                    return (
                      <Card key={emp.id} className="border-2">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{emp.full_name}</CardTitle>
                              <CardDescription>{emp.job_title || "Não informado"}</CardDescription>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Total Trabalhado</p>
                              <p className="font-bold text-lg">{formatMinutesToHours(totalWorked)}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-24">Data</TableHead>
                                  <TableHead className="w-16">Dia</TableHead>
                                  <TableHead className="w-20 text-center">Entrada</TableHead>
                                  <TableHead className="w-20 text-center">Início Int.</TableHead>
                                  <TableHead className="w-20 text-center">Fim Int.</TableHead>
                                  <TableHead className="w-20 text-center">Saída</TableHead>
                                  <TableHead className="w-24 text-center">Horas</TableHead>
                                  <TableHead className="w-24 text-center">H. Extra</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {monthlyData.map((day) => (
                                  <TableRow 
                                    key={day.date.toISOString()}
                                    className={!day.entry ? "text-muted-foreground bg-muted/20" : ""}
                                  >
                                    <TableCell className="font-mono text-sm">
                                      {format(day.date, "dd/MM")}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {format(day.date, "EEE", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                      {day.entry || "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                      {day.breakStart || "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                      {day.breakEnd || "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                      {day.exit || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {day.totalMinutes > 0 ? formatMinutesToHours(day.totalMinutes) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {day.overtime > 0 ? (
                                        <Badge variant="outline" className="text-green-600">
                                          +{formatMinutesToHours(day.overtime)}
                                        </Badge>
                                      ) : "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <div className="flex gap-6">
                              <div>
                                <p className="text-sm text-muted-foreground">Total Trabalhado</p>
                                <p className="font-bold">{formatMinutesToHours(totalWorked)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Horas Extras</p>
                                <p className="font-bold text-green-600">{formatMinutesToHours(totalOvertime)}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Records Tab */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Registros Manuais</CardTitle>
              <CardDescription>
                Registros adicionados manualmente para correções
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayRecords.filter((r) => r.source === "manual").length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhum registro manual hoje
                  </p>
                  <Button onClick={() => setManualDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Registro
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayRecords
                      .filter((r) => r.source === "manual")
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.employee_profiles?.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getClockTypeIcon(record.clock_type)}
                              {getClockTypeLabel(record.clock_type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(record.timestamp), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-6">
          {/* Setup Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração do Control iD
              </CardTitle>
              <CardDescription>
                Complete as tarefas abaixo para configurar o relógio de ponto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setupTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    task.is_completed
                      ? "bg-green-500/5 border-green-500/30"
                      : "bg-muted/30"
                  }`}
                >
                  <Checkbox
                    id={task.id}
                    checked={task.is_completed}
                    onCheckedChange={(checked) =>
                      toggleSetupTask(task.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={task.id}
                      className={`font-medium cursor-pointer ${
                        task.is_completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.task_label}
                    </label>
                    {task.task_key === "configure_webhook" && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/controlid-webhook
                        </code>
                        <Button size="sm" variant="ghost" onClick={copyWebhookUrl}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {task.task_key === "set_webhook_secret" && config?.webhook_secret && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {config.webhook_secret}
                        </code>
                        <Button size="sm" variant="ghost" onClick={copyWebhookSecret}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {task.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t">
                <Button variant="outline" asChild>
                  <a
                    href="https://www.controlid.com.br/suporte/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Documentação Control iD
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Work Schedule Config */}
          <Card>
            <CardHeader>
              <CardTitle>Horários de Trabalho</CardTitle>
              <CardDescription>
                Configure os horários padrão de entrada e saída
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Horário de Entrada</Label>
                  <Input
                    type="time"
                    value={config?.work_start_time?.slice(0, 5) || "08:00"}
                    onChange={(e) =>
                      updateConfig({ work_start_time: e.target.value + ":00" })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário de Saída</Label>
                  <Input
                    type="time"
                    value={config?.work_end_time?.slice(0, 5) || "17:00"}
                    onChange={(e) =>
                      updateConfig({ work_end_time: e.target.value + ":00" })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tolerância de Atraso (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={config?.tolerance_minutes || 10}
                    onChange={(e) =>
                      updateConfig({ tolerance_minutes: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração do Intervalo (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={config?.break_duration_minutes || 60}
                    onChange={(e) =>
                      updateConfig({ break_duration_minutes: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Dispositivo</CardTitle>
              <CardDescription>
                Dados do relógio de ponto (para referência)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do Dispositivo</Label>
                  <Input
                    value={config?.device_name || ""}
                    onChange={(e) => updateConfig({ device_name: e.target.value })}
                    placeholder="Ex: Control iD Entrada"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP do Dispositivo (opcional)</Label>
                  <Input
                    value={config?.device_ip || ""}
                    onChange={(e) => updateConfig({ device_ip: e.target.value })}
                    placeholder="Ex: 192.168.1.100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
