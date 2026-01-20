import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Download, Calendar as CalendarIcon, Users, ClipboardList, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { classTypeLabels } from "@/lib/constants";
import FinancialReportsTab from "@/components/admin/FinancialReportsTab";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
}

interface AttendanceRecord {
  id: string;
  child_id: string;
  date: string;
  status: string;
}

interface DailyRecord {
  id: string;
  child_id: string;
  date: string;
  mood: string;
  breakfast: string;
  lunch: string;
  snack: string;
  note: string;
  updated_at: string;
  children?: { full_name: string; class_type: string };
}

interface QuarterlyEvaluation {
  id: string;
  child_id: string;
  quarter: number;
  year: number;
  cognitive_development: string | null;
  motor_development: string | null;
  social_emotional: string | null;
  language_development: string | null;
  creativity_arts: string | null;
  children?: { full_name: string; class_type: string; plan_type: string | null };
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState("frequencia");
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [evaluations, setEvaluations] = useState<QuarterlyEvaluation[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, dateRange, selectedClass, selectedChild]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch children
      const { data: childrenData } = await supabase
        .from("children")
        .select("id, full_name, class_type")
        .order("full_name");
      
      if (childrenData) setChildren(childrenData as unknown as Child[]);

      // Fetch based on active tab
      if (activeTab === "frequencia") {
        let query = supabase
          .from("attendance")
          .select("*")
          .gte("date", format(dateRange.from, "yyyy-MM-dd"))
          .lte("date", format(dateRange.to, "yyyy-MM-dd"));
        
        if (selectedChild !== "all") {
          query = query.eq("child_id", selectedChild);
        }
        
        const { data } = await query;
        if (data) setAttendance(data);
      }

      if (activeTab === "agenda") {
        let query = supabase
          .from("daily_records")
          .select("*, children(full_name, class_type)")
          .gte("date", format(dateRange.from, "yyyy-MM-dd"))
          .lte("date", format(dateRange.to, "yyyy-MM-dd"))
          .order("date", { ascending: false });
        
        if (selectedChild !== "all") {
          query = query.eq("child_id", selectedChild);
        }
        
        const { data } = await query;
        if (data) setDailyRecords(data as any);
      }

      if (activeTab === "desenvolvimento") {
        const { data } = await supabase
          .from("quarterly_evaluations")
          .select("*, children(full_name, class_type, plan_type)")
          .order("year", { ascending: false })
          .order("quarter", { ascending: false });
        
        if (data) setEvaluations(data as unknown as QuarterlyEvaluation[]);
      }

      if (activeTab === "financeiro") {
        const { data } = await supabase
          .from("invoices")
          .select("*")
          .order("due_date", { ascending: false });
        
        if (data) setInvoices(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === "string" ? `"${val}"` : val
      ).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate attendance stats
  const getAttendanceStats = () => {
    const filteredChildren = selectedClass === "all" 
      ? children 
      : children.filter(c => c.class_type === selectedClass);
    
    const workDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      .filter(day => !isWeekend(day)).length;

    return filteredChildren.map(child => {
      const childAttendance = attendance.filter(a => a.child_id === child.id);
      const present = childAttendance.filter(a => a.status === "present").length;
      const absent = childAttendance.filter(a => a.status === "absent").length;
      const rate = workDays > 0 ? (present / workDays) * 100 : 0;
      
      return {
        id: child.id,
        name: child.full_name,
        class: classTypeLabels[child.class_type as keyof typeof classTypeLabels] || child.class_type,
        workDays,
        present,
        absent,
        rate: rate.toFixed(1),
      };
    });
  };

  // Get Plus+ evaluations chart data
  const getEvaluationChartData = () => {
    const plusEvaluations = evaluations.filter(e => e.children?.plan_type === "plus");
    const grouped: Record<string, { period: string; count: number }> = {};

    plusEvaluations.forEach(e => {
      const key = `${e.year}-Q${e.quarter}`;
      if (!grouped[key]) {
        grouped[key] = { period: key, count: 0 };
      }
      grouped[key].count++;
    });

    return Object.values(grouped).map((g) => ({
      period: g.period,
      Avaliações: g.count,
    }));
  };

  const attendanceStats = getAttendanceStats();
  const evaluationChartData = getEvaluationChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere e exporte relatórios operacionais
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="frequencia" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Frequência</span>
          </TabsTrigger>
          <TabsTrigger value="desenvolvimento" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Desenvolvimento</span>
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        {activeTab !== "financeiro" && (
          <Card className="mt-4">
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
                {activeTab === "frequencia" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Turma</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todas as turmas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as turmas</SelectItem>
                        {Object.entries(classTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Child Filter */}
                {(activeTab === "agenda" || activeTab === "frequencia") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Criança</label>
                    <Select value={selectedChild} onValueChange={setSelectedChild}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todas as crianças" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as crianças</SelectItem>
                        {children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>{child.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Tab: Frequência */}
        <TabsContent value="frequencia" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Relatório de Frequência</CardTitle>
                <CardDescription>
                  Período: {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV(attendanceStats, "frequencia")}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <FileText className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">Dias Úteis</TableHead>
                    <TableHead className="text-center">Presenças</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">% Frequência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceStats.map((stat) => (
                    <TableRow key={stat.id}>
                      <TableCell className="font-medium">{stat.name}</TableCell>
                      <TableCell>{stat.class}</TableCell>
                      <TableCell className="text-center">{stat.workDays}</TableCell>
                      <TableCell className="text-center text-green-600">{stat.present}</TableCell>
                      <TableCell className="text-center text-red-600">{stat.absent}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-semibold",
                          Number(stat.rate) >= 75 ? "text-green-600" : "text-red-600"
                        )}>
                          {stat.rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {attendanceStats.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum registro de frequência encontrado para o período selecionado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Desenvolvimento */}
        <TabsContent value="desenvolvimento" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Avaliações Trimestrais (Plus+)</CardTitle>
                <CardDescription>
                  Média por área de desenvolvimento
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(evaluations.filter(e => e.children?.plan_type === "plus"), "avaliacoes_plus")}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              {evaluationChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evaluationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Avaliações" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma avaliação Plus+ encontrada.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Individual Evaluations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Individuais</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">Trimestre</TableHead>
                    <TableHead className="text-center">Ano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.filter(e => e.children?.plan_type === "plus").map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.children?.full_name}</TableCell>
                      <TableCell>{classTypeLabels[evaluation.children?.class_type as keyof typeof classTypeLabels] || evaluation.children?.class_type}</TableCell>
                      <TableCell className="text-center">{evaluation.quarter}º Trimestre</TableCell>
                      <TableCell className="text-center">{evaluation.year}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {evaluations.filter(e => e.children?.plan_type === "plus").length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma avaliação Plus+ encontrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Agenda */}
        <TabsContent value="agenda" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Agenda</CardTitle>
                <CardDescription>
                  Registros diários do período selecionado
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(dailyRecords.map(r => ({
                data: r.date,
                aluno: r.children?.full_name,
                humor: r.mood,
                cafeManha: r.breakfast,
                almoco: r.lunch,
                lanche: r.snack,
                bilhete: r.note,
              })), "agenda")}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Humor</TableHead>
                    <TableHead>Café</TableHead>
                    <TableHead>Almoço</TableHead>
                    <TableHead>Lanche</TableHead>
                    <TableHead>Bilhete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(parseISO(record.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{record.children?.full_name}</TableCell>
                      <TableCell>{record.mood || "-"}</TableCell>
                      <TableCell>{record.breakfast || "-"}</TableCell>
                      <TableCell>{record.lunch || "-"}</TableCell>
                      <TableCell>{record.snack || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{record.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dailyRecords.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum registro de agenda encontrado para o período selecionado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Financeiro */}
        <TabsContent value="financeiro" className="mt-6">
          <FinancialReportsTab invoices={invoices} />
        </TabsContent>
      </Tabs>
    </div>
  );
}