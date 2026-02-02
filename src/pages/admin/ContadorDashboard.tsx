import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  Download,
  FileText,
  Search,
  Briefcase,
  Calculator,
  AlertCircle
} from "lucide-react";
import { roleLabels } from "@/lib/constants";

export default function ContadorDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch employees with profiles
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["contador-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select(`
          *,
          user_roles:user_id(role)
        `)
        .order("full_name");
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch time clock records for current month
  const { data: timeClockRecords, isLoading: loadingTimeClock } = useQuery({
    queryKey: ["contador-time-clock", selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
      
      const { data, error } = await supabase
        .from("employee_time_clock")
        .select(`
          *,
          employee:employee_id(full_name)
        `)
        .gte("timestamp", startDate.toISOString())
        .lte("timestamp", endDate.toISOString())
        .order("timestamp", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch absences
  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["contador-absences", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_absences")
        .select("*")
        .gte("start_date", `${selectedYear}-01-01`)
        .lte("end_date", `${selectedYear}-12-31`)
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate payroll summary
  const totalPayroll = employees?.reduce((sum, emp) => sum + (emp.salary || 0), 0) || 0;
  const totalNetPayroll = employees?.reduce((sum, emp) => sum + (emp.net_salary || 0), 0) || 0;

  // Filter employees by search
  const filteredEmployees = employees?.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cpf?.includes(searchTerm)
  );

  // Print employee registration form
  const handlePrintEmployee = (employee: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDate = (date: string | null) => 
      date ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) : "-";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha Cadastral - ${employee.full_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header h2 { font-size: 14px; font-weight: normal; color: #666; }
          .section { margin-bottom: 15px; }
          .section-title { background: #f0f0f0; padding: 5px 10px; font-weight: bold; margin-bottom: 8px; border-left: 3px solid #333; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .field { margin-bottom: 5px; }
          .field-label { font-weight: bold; color: #666; font-size: 9px; text-transform: uppercase; }
          .field-value { border-bottom: 1px solid #ddd; padding: 2px 0; min-height: 18px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FICHA CADASTRAL DE FUNCIONÁRIO</h1>
          <h2>Creche Pimpolinhos - Documento para Contabilidade</h2>
        </div>
        
        <div class="section">
          <div class="section-title">DADOS PESSOAIS</div>
          <div class="grid">
            <div class="field"><div class="field-label">Nome Completo</div><div class="field-value">${employee.full_name || "-"}</div></div>
            <div class="field"><div class="field-label">Data de Nascimento</div><div class="field-value">${formatDate(employee.birth_date)}</div></div>
            <div class="field"><div class="field-label">Nacionalidade</div><div class="field-value">${employee.nationality || "-"}</div></div>
            <div class="field"><div class="field-label">Naturalidade</div><div class="field-value">${employee.place_of_birth || "-"}</div></div>
            <div class="field"><div class="field-label">Estado Civil</div><div class="field-value">${employee.marital_status || "-"}</div></div>
            <div class="field"><div class="field-label">Sexo</div><div class="field-value">${employee.gender || "-"}</div></div>
            <div class="field"><div class="field-label">Nome da Mãe</div><div class="field-value">${employee.mother_name || "-"}</div></div>
            <div class="field"><div class="field-label">Nome do Pai</div><div class="field-value">${employee.father_name || "-"}</div></div>
            <div class="field"><div class="field-label">Telefone</div><div class="field-value">${employee.phone || "-"}</div></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">DOCUMENTOS</div>
          <div class="grid">
            <div class="field"><div class="field-label">CPF</div><div class="field-value">${employee.cpf || "-"}</div></div>
            <div class="field"><div class="field-label">RG</div><div class="field-value">${employee.rg || "-"}</div></div>
            <div class="field"><div class="field-label">Órgão Emissor</div><div class="field-value">${employee.rg_issuer || "-"}</div></div>
            <div class="field"><div class="field-label">PIS/PASEP</div><div class="field-value">${employee.pis_pasep || "-"}</div></div>
            <div class="field"><div class="field-label">CTPS Número</div><div class="field-value">${employee.ctps_number || "-"}</div></div>
            <div class="field"><div class="field-label">CTPS Série</div><div class="field-value">${employee.ctps_series || "-"}</div></div>
            <div class="field"><div class="field-label">CTPS UF</div><div class="field-value">${employee.ctps_state || "-"}</div></div>
            <div class="field"><div class="field-label">Título de Eleitor</div><div class="field-value">${employee.voter_title || "-"}</div></div>
            <div class="field"><div class="field-label">Zona/Seção</div><div class="field-value">${employee.voter_zone || "-"} / ${employee.voter_section || "-"}</div></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">ENDEREÇO</div>
          <div class="grid">
            <div class="field"><div class="field-label">CEP</div><div class="field-value">${employee.zip_code || "-"}</div></div>
            <div class="field"><div class="field-label">Logradouro</div><div class="field-value">${employee.street || "-"}</div></div>
            <div class="field"><div class="field-label">Número</div><div class="field-value">${employee.street_number || "-"}</div></div>
            <div class="field"><div class="field-label">Complemento</div><div class="field-value">${employee.complement || "-"}</div></div>
            <div class="field"><div class="field-label">Bairro</div><div class="field-value">${employee.neighborhood || "-"}</div></div>
            <div class="field"><div class="field-label">Cidade/UF</div><div class="field-value">${employee.city || "-"} / ${employee.state || "-"}</div></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">DADOS BANCÁRIOS</div>
          <div class="grid">
            <div class="field"><div class="field-label">Banco</div><div class="field-value">${employee.bank_name || "-"}</div></div>
            <div class="field"><div class="field-label">Agência</div><div class="field-value">${employee.bank_agency || "-"}</div></div>
            <div class="field"><div class="field-label">Conta</div><div class="field-value">${employee.bank_account || "-"}</div></div>
            <div class="field"><div class="field-label">Tipo de Conta</div><div class="field-value">${employee.bank_account_type || "-"}</div></div>
            <div class="field"><div class="field-label">Chave PIX</div><div class="field-value">${employee.pix_key || "-"}</div></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">DADOS PROFISSIONAIS</div>
          <div class="grid">
            <div class="field"><div class="field-label">Cargo</div><div class="field-value">${employee.job_title || "-"}</div></div>
            <div class="field"><div class="field-label">Turno</div><div class="field-value">${employee.work_shift || "-"}</div></div>
            <div class="field"><div class="field-label">Data de Admissão</div><div class="field-value">${formatDate(employee.hire_date)}</div></div>
            <div class="field"><div class="field-label">Salário Bruto</div><div class="field-value">${employee.salary ? `R$ ${employee.salary.toFixed(2)}` : "-"}</div></div>
            <div class="field"><div class="field-label">Salário Líquido</div><div class="field-value">${employee.net_salary ? `R$ ${employee.net_salary.toFixed(2)}` : "-"}</div></div>
            <div class="field"><div class="field-label">Dia de Pagamento</div><div class="field-value">${employee.salary_payment_day || "-"}</div></div>
          </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #999;">
          Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Calculate hours worked per employee
  const calculateHoursWorked = (employeeId: string) => {
    const records = timeClockRecords?.filter(r => r.employee_id === employeeId) || [];
    let totalMinutes = 0;
    
    // Group by date and calculate pairs
    const byDate = records.reduce((acc, r) => {
      const date = format(new Date(r.timestamp), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(r);
      return acc;
    }, {} as Record<string, typeof records>);

    Object.values(byDate).forEach(dayRecords => {
      const sorted = dayRecords.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      for (let i = 0; i < sorted.length - 1; i += 2) {
        if (sorted[i].clock_type === "entry" && sorted[i + 1]?.clock_type === "exit") {
          const diff = new Date(sorted[i + 1].timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
          totalMinutes += diff / (1000 * 60);
        }
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-teal-600" />
          Painel do Contador
        </h1>
        <p className="text-muted-foreground">
          Acesso a dados de funcionários, ponto e folha de pagamento
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Funcionários</p>
                <p className="text-2xl font-bold">{employees?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Folha Bruta</p>
                <p className="text-2xl font-bold">
                  R$ {totalPayroll.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Folha Líquida</p>
                <p className="text-2xl font-bold">
                  R$ {totalNetPayroll.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ausências (ano)</p>
                <p className="text-2xl font-bold">{absences?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="timeclock" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ponto Eletrônico
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Folha de Pagamento
          </TabsTrigger>
          <TabsTrigger value="absences" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ausências
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fichas Cadastrais</CardTitle>
                  <CardDescription>
                    Dados completos dos funcionários para registro
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou CPF..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : (
                <div className="space-y-3">
                  {filteredEmployees?.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-teal-100 rounded-full">
                          <Briefcase className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>CPF: {emp.cpf}</span>
                            <span>•</span>
                            <span>{emp.job_title || "Não definido"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {emp.salary && (
                          <Badge variant="outline" className="text-green-700">
                            R$ {emp.salary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintEmployee(emp)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Ficha PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Clock Tab */}
        <TabsContent value="timeclock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registros de Ponto</CardTitle>
                  <CardDescription>
                    Entradas e saídas dos funcionários
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {format(new Date(2000, i), "MMMM", { locale: ptBR })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {[2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTimeClock ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : (
                <div className="space-y-4">
                  {/* Summary per employee */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees?.map((emp) => {
                      const hours = calculateHoursWorked(emp.id);
                      return (
                        <div key={emp.id} className="p-4 border rounded-lg">
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-sm text-muted-foreground">{emp.job_title}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold">{hours}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recent records */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Funcionário</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Data/Hora</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Tipo</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Origem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeClockRecords?.slice(0, 20).map((record) => (
                          <tr key={record.id} className="border-t">
                            <td className="px-4 py-2 text-sm">
                              {record.employee?.full_name || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {format(new Date(record.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant={record.clock_type === "entry" ? "default" : "secondary"}>
                                {record.clock_type === "entry" ? "Entrada" : record.clock_type === "exit" ? "Saída" : record.clock_type}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">
                              {record.source === "manual" ? "Manual" : "Biométrico"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Folha de Pagamento</CardTitle>
              <CardDescription>
                Salários e informações de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Funcionário</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Cargo</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Salário Bruto</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Salário Líquido</th>
                      <th className="px-4 py-2 text-center text-sm font-medium">Dia Pgto</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Banco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees?.map((emp) => (
                      <tr key={emp.id} className="border-t">
                        <td className="px-4 py-2 text-sm font-medium">{emp.full_name}</td>
                        <td className="px-4 py-2 text-sm">{emp.job_title || "-"}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {emp.salary 
                            ? `R$ ${emp.salary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "-"
                          }
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {emp.net_salary 
                            ? `R$ ${emp.net_salary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "-"
                          }
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          {emp.salary_payment_day || 5}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {emp.bank_name ? `${emp.bank_name} - Ag: ${emp.bank_agency}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 font-bold">TOTAL</td>
                      <td className="px-4 py-2 text-right font-bold">
                        R$ {totalPayroll.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        R$ {totalNetPayroll.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Absences Tab */}
        <TabsContent value="absences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Controle de Ausências</CardTitle>
              <CardDescription>
                Férias, faltas e licenças dos funcionários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAbsences ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : absences?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma ausência registrada
                </div>
              ) : (
                <div className="space-y-3">
                  {absences?.map((absence) => {
                    const emp = employees?.find(e => e.user_id === absence.employee_id);
                    return (
                      <div
                        key={absence.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{emp?.full_name || "Funcionário"}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(absence.start_date), "dd/MM/yyyy", { locale: ptBR })} 
                            {" - "}
                            {format(new Date(absence.end_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {absence.type === "vacation" && "Férias"}
                            {absence.type === "sick_leave" && "Atestado"}
                            {absence.type === "personal" && "Pessoal"}
                            {absence.type === "other" && "Outro"}
                          </Badge>
                          <Badge 
                            variant={absence.status === "approved" ? "default" : "secondary"}
                          >
                            {absence.status === "approved" && "Aprovado"}
                            {absence.status === "pending" && "Pendente"}
                            {absence.status === "rejected" && "Rejeitado"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
