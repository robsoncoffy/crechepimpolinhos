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
import { FileText, Calendar as CalendarIcon, Users, ClipboardList, TrendingUp, DollarSign, Loader2, Download, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { classTypeLabels } from "@/lib/constants";
import FinancialReportsTab from "@/components/admin/FinancialReportsTab";
import EmployeeFrequencyReport from "@/components/admin/EmployeeFrequencyReport";
import EmployeeRegistrationReport from "@/components/admin/EmployeeRegistrationReport";
import { ExportButtons, exportToCSV } from "@/components/admin/ReportExport";
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

interface EmployeeProfile {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string;
  gender: string | null;
  marital_status: string | null;
  nationality: string | null;
  place_of_birth: string | null;
  mother_name: string | null;
  father_name: string | null;
  cpf: string;
  rg: string | null;
  rg_issuer: string | null;
  rg_issue_date: string | null;
  pis_pasep: string | null;
  ctps_number: string | null;
  ctps_series: string | null;
  ctps_state: string | null;
  voter_title: string | null;
  voter_zone: string | null;
  voter_section: string | null;
  military_certificate: string | null;
  zip_code: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  education_level: string | null;
  specialization: string | null;
  job_title: string | null;
  work_shift: string | null;
  has_disability: boolean;
  disability_description: string | null;
  hire_date: string | null;
  salary: number | null;
  created_at: string;
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState("frequencia-funcionarios");
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [evaluations, setEvaluations] = useState<QuarterlyEvaluation[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [userRoles, setUserRoles] = useState<{ user_id: string; role: string }[]>([]);
  
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
      // Fetch children for agenda/desenvolvimento tabs
      if (activeTab === "agenda" || activeTab === "desenvolvimento") {
        const { data: childrenData } = await supabase
          .from("children")
          .select("id, full_name, class_type")
          .order("full_name");
        
        if (childrenData) setChildren(childrenData as unknown as Child[]);
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

      if (activeTab === "ficha-cadastral") {
        const [employeesRes, rolesRes] = await Promise.all([
          supabase.from("employee_profiles").select("*").order("full_name"),
          supabase.from("user_roles").select("user_id, role"),
        ]);
        
        if (employeesRes.data) setEmployees(employeesRes.data as unknown as EmployeeProfile[]);
        if (rolesRes.data) setUserRoles(rolesRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
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
            Gere e exporte relatórios operacionais e de RH
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="frequencia-funcionarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Frequência RH</span>
          </TabsTrigger>
          <TabsTrigger value="ficha-cadastral" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">Ficha Cadastral</span>
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

        {/* Filters - Only for tabs that need date range */}
        {(activeTab === "frequencia-funcionarios" || activeTab === "agenda" || activeTab === "desenvolvimento") && (
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

                {/* Child Filter - Only for agenda */}
                {activeTab === "agenda" && (
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

        {/* Tab: Frequência Funcionários */}
        <TabsContent value="frequencia-funcionarios" className="mt-6">
          <EmployeeFrequencyReport dateRange={dateRange} />
        </TabsContent>

        {/* Tab: Ficha Cadastral */}
        <TabsContent value="ficha-cadastral" className="mt-6">
          <EmployeeRegistrationReport 
            employees={employees} 
            userRoles={userRoles}
            loading={loading}
          />
        </TabsContent>

        {/* Tab: Desenvolvimento */}
        <TabsContent value="desenvolvimento" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
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
            </>
          )}
        </TabsContent>

        {/* Tab: Agenda */}
        <TabsContent value="agenda" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
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
                {dailyRecords.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum registro de agenda encontrado para o período selecionado.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Financeiro */}
        <TabsContent value="financeiro" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <FinancialReportsTab invoices={invoices} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
