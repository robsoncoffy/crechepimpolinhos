import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  FileText, 
  Download, 
  DollarSign, 
  Calendar, 
  File,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Payslip {
  id: string;
  period_year: number;
  period_month: number;
  base_salary: number;
  net_salary: number | null;
  hours_worked: number;
  overtime_hours: number;
  status: string;
  created_at: string;
  lines: PayslipLine[];
}

interface PayslipLine {
  id: string;
  kind: string;
  label: string;
  amount: number;
  sort_order: number;
}

interface EmployeeDocument {
  id: string;
  doc_type: string;
  title: string;
  file_path: string;
  created_at: string;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const docTypeLabels: Record<string, string> = {
  contract: "Contrato de Trabalho",
  ctps: "CTPS Digital",
  receipt: "Comprovante",
  declaration: "Declaração",
  holerite: "Holerite/Contracheque",
  other: "Outro",
};

export function MyReportsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [payslipDocs, setPayslipDocs] = useState<EmployeeDocument[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<{
    salary: number | null;
    net_salary: number | null;
    salary_payment_day: number | null;
    job_title: string | null;
  } | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [activeTab, setActiveTab] = useState("holerites");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch employee profile for salary info
      const { data: profileData } = await supabase
        .from("employee_profiles")
        .select("salary, net_salary, salary_payment_day, job_title")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setEmployeeProfile(profileData);

      // Fetch payslips with lines
      const { data: payslipsData, error: payslipsError } = await supabase
        .from("payroll_payslips")
        .select(`
          *,
          lines:payroll_payslip_lines(*)
        `)
        .eq("employee_user_id", user.id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });

      if (payslipsError) throw payslipsError;
      setPayslips(payslipsData || []);

      // Fetch all documents
      const { data: docsData, error: docsError } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_user_id", user.id)
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;
      
      // Separate payslip docs from other documents
      const payslipDocuments = docsData?.filter(d => d.doc_type === "holerite") || [];
      const otherDocuments = docsData?.filter(d => d.doc_type !== "holerite") || [];
      
      setPayslipDocs(payslipDocuments);
      setDocuments(otherDocuments);
    } catch (error) {
      console.error("Error fetching employee data:", error);
      toast.error("Erro ao carregar seus dados");
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Erro ao baixar documento");
    }
  };

  const generatePayslipPDF = (payslip: Payslip) => {
    const earnings = payslip.lines?.filter(l => l.kind === "earning") || [];
    const deductions = payslip.lines?.filter(l => l.kind === "deduction") || [];
    const totalEarnings = earnings.reduce((sum, l) => sum + Number(l.amount), 0) + Number(payslip.base_salary);
    const totalDeductions = deductions.reduce((sum, l) => sum + Number(l.amount), 0);

    const printContent = `
      <html>
        <head>
          <title>Holerite - ${monthNames[payslip.period_month - 1]}/${payslip.period_year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #2d3748; margin-bottom: 10px; padding: 8px; background: #edf2f7; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .amount { text-align: right; }
            .total { font-weight: bold; background: #f7fafc; }
            .earning { color: #22543d; }
            .deduction { color: #c53030; }
            .net-salary { font-size: 1.5em; color: #2b6cb0; text-align: center; padding: 20px; background: #ebf8ff; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Holerite de Pagamento</h1>
          <div class="header">
            <div><strong>Competência:</strong> ${monthNames[payslip.period_month - 1]}/${payslip.period_year}</div>
            <div>
              <strong>Horas Trabalhadas:</strong> ${payslip.hours_worked}h
              ${payslip.overtime_hours > 0 ? `<br><strong>Horas Extras:</strong> ${payslip.overtime_hours}h` : ''}
            </div>
          </div>
          <div class="section">
            <div class="section-title">PROVENTOS</div>
            <table>
              <tr><td>Salário Base</td><td class="amount earning">R$ ${Number(payslip.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
              ${earnings.map(e => `<tr><td>${e.label}</td><td class="amount earning">R$ ${Number(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
              <tr class="total"><td>Total Proventos</td><td class="amount earning">R$ ${totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
            </table>
          </div>
          ${deductions.length > 0 ? `
          <div class="section">
            <div class="section-title">DESCONTOS</div>
            <table>
              ${deductions.map(d => `<tr><td>${d.label}</td><td class="amount deduction">- R$ ${Number(d.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
              <tr class="total"><td>Total Descontos</td><td class="amount deduction">- R$ ${totalDeductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
            </table>
          </div>
          ` : ''}
          <div class="net-salary">
            <strong>Salário Líquido: R$ ${(payslip.net_salary || totalEarnings - totalDeductions).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <p style="margin-top: 40px; font-size: 0.8em; color: #718096;">
            Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Meus Relatórios
        </h3>
        <p className="text-sm text-muted-foreground">
          Acesse seus holerites e documentos de RH
        </p>
      </div>

      {/* Salary Info Card */}
      {employeeProfile && (employeeProfile.salary || employeeProfile.net_salary) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Salário Atual</p>
                  <p className="font-semibold">
                    {employeeProfile.net_salary 
                      ? formatCurrency(employeeProfile.net_salary) + " líquido"
                      : employeeProfile.salary 
                        ? formatCurrency(employeeProfile.salary) + " bruto"
                        : "-"
                    }
                  </p>
                </div>
              </div>
              {employeeProfile.salary_payment_day && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dia de Pagamento</p>
                    <p className="font-semibold">Dia {employeeProfile.salary_payment_day}</p>
                  </div>
                </div>
              )}
              {employeeProfile.job_title && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-semibold">{employeeProfile.job_title}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="holerites" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Holerites
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Documentos RH
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holerites" className="mt-4">
          {payslips.length === 0 && payslipDocs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Nenhum holerite disponível ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus holerites aparecerão aqui quando forem processados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Uploaded Payslip Documents */}
              {payslipDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contracheques Anexados</CardTitle>
                    <CardDescription>Holerites enviados pela contabilidade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {payslipDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-medium truncate">{doc.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generated Payslips */}
              {payslips.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico de Holerites</CardTitle>
                      <CardDescription>Clique para ver detalhes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {payslips.map((payslip) => (
                            <button
                              key={payslip.id}
                              onClick={() => setSelectedPayslip(payslip)}
                              className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-accent ${
                                selectedPayslip?.id === payslip.id ? 'bg-accent border-primary' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {monthNames[payslip.period_month - 1]} {payslip.period_year}
                                  </p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {payslip.hours_worked}h trabalhadas
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-primary">
                                    {formatCurrency(payslip.net_salary || payslip.base_salary)}
                                  </p>
                                  <Badge variant={payslip.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                                    {payslip.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                                  </Badge>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {selectedPayslip 
                          ? `${monthNames[selectedPayslip.period_month - 1]} ${selectedPayslip.period_year}`
                          : 'Selecione um holerite'
                        }
                      </CardTitle>
                      {selectedPayslip && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => generatePayslipPDF(selectedPayslip)}
                          className="w-fit"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar PDF
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {selectedPayslip ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-xs text-muted-foreground">Salário Base</p>
                              <p className="font-semibold">{formatCurrency(selectedPayslip.base_salary)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-primary/10">
                              <p className="text-xs text-muted-foreground">Salário Líquido</p>
                              <p className="font-semibold text-primary">
                                {formatCurrency(selectedPayslip.net_salary || selectedPayslip.base_salary)}
                              </p>
                            </div>
                          </div>

                          {selectedPayslip.lines?.filter(l => l.kind === 'earning').length > 0 && (
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1 mb-2">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                Proventos
                              </p>
                              <div className="space-y-1">
                                {selectedPayslip.lines
                                  .filter(l => l.kind === 'earning')
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map(line => (
                                    <div key={line.id} className="flex justify-between text-sm">
                                      <span>{line.label}</span>
                                      <span className="text-green-600">+{formatCurrency(line.amount)}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}

                          {selectedPayslip.lines?.filter(l => l.kind === 'deduction').length > 0 && (
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1 mb-2">
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                Descontos
                              </p>
                              <div className="space-y-1">
                                {selectedPayslip.lines
                                  .filter(l => l.kind === 'deduction')
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map(line => (
                                    <div key={line.id} className="flex justify-between text-sm">
                                      <span>{line.label}</span>
                                      <span className="text-red-600">-{formatCurrency(line.amount)}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>Selecione um holerite para ver os detalhes</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Nenhum documento disponível</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Contratos, declarações e outros documentos aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <File className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {docTypeLabels[doc.doc_type] || doc.doc_type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => downloadDocument(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
