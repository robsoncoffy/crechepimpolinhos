import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Download, FileText, Search, User, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV } from "@/components/admin/ReportExport";
import { roleLabels } from "@/lib/constants";

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

interface EmployeeRegistrationReportProps {
  employees: EmployeeProfile[];
  userRoles: { user_id: string; role: string }[];
  loading: boolean;
}

export default function EmployeeRegistrationReport({ 
  employees, 
  userRoles,
  loading 
}: EmployeeRegistrationReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cpf.includes(searchTerm) ||
    (emp.pis_pasep && emp.pis_pasep.includes(searchTerm))
  );

  const getRolesForUser = (userId: string) => {
    return userRoles
      .filter(r => r.user_id === userId)
      .map(r => roleLabels[r.role as keyof typeof roleLabels] || r.role);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getGenderLabel = (gender: string | null) => {
    const labels: Record<string, string> = {
      masculino: "Masculino",
      feminino: "Feminino",
      outro: "Outro",
      prefiro_nao_informar: "Não informado",
    };
    return gender ? labels[gender] || gender : "-";
  };

  const getMaritalStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      solteiro: "Solteiro(a)",
      casado: "Casado(a)",
      divorciado: "Divorciado(a)",
      viuvo: "Viúvo(a)",
      uniao_estavel: "União Estável",
    };
    return status ? labels[status] || status : "-";
  };

  const getBankAccountTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      corrente: "Conta Corrente",
      poupanca: "Poupança",
    };
    return type ? labels[type] || type : "-";
  };

  const handlePrintEmployee = () => {
    if (!printRef.current) return;
    
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha Cadastral - ${selectedEmployee?.full_name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .header h1 { font-size: 18px; margin-bottom: 5px; }
            .header h2 { font-size: 14px; font-weight: normal; color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 8px; margin-bottom: 10px; border-left: 4px solid #333; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .field { padding: 5px 0; }
            .field-label { font-weight: bold; color: #555; font-size: 10px; text-transform: uppercase; }
            .field-value { font-size: 12px; border-bottom: 1px solid #ddd; padding: 3px 0; min-height: 20px; }
            .full-width { grid-column: span 2; }
            .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-line { width: 45%; text-align: center; }
            .signature-line div { border-top: 1px solid #000; padding-top: 5px; margin-top: 50px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const exportEmployeesToCSV = () => {
    const data = employees.map(emp => ({
      nome: emp.full_name,
      cpf: emp.cpf,
      rg: emp.rg || "",
      pis_pasep: emp.pis_pasep || "",
      ctps: emp.ctps_number ? `${emp.ctps_number}/${emp.ctps_series}-${emp.ctps_state}` : "",
      data_nascimento: formatDate(emp.birth_date),
      telefone: emp.phone || "",
      endereco: emp.street ? `${emp.street}, ${emp.street_number} - ${emp.neighborhood}, ${emp.city}/${emp.state}` : "",
      banco: emp.bank_name || "",
      agencia: emp.bank_agency || "",
      conta: emp.bank_account || "",
      pix: emp.pix_key || "",
      cargo: emp.job_title || "",
      data_admissao: formatDate(emp.hire_date),
    }));
    
    exportToCSV(data, "funcionarios_cadastro", [
      { key: "nome", label: "Nome" },
      { key: "cpf", label: "CPF" },
      { key: "rg", label: "RG" },
      { key: "pis_pasep", label: "PIS/PASEP" },
      { key: "ctps", label: "CTPS" },
      { key: "data_nascimento", label: "Data Nascimento" },
      { key: "telefone", label: "Telefone" },
      { key: "endereco", label: "Endereço" },
      { key: "banco", label: "Banco" },
      { key: "agencia", label: "Agência" },
      { key: "conta", label: "Conta" },
      { key: "pix", label: "PIX" },
      { key: "cargo", label: "Cargo" },
      { key: "data_admissao", label: "Data Admissão" },
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Ficha Cadastral de Funcionários
            </CardTitle>
            <CardDescription>
              Dados para envio ao contador e admissão
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou PIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-[250px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportEmployeesToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>PIS/PASEP</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell>{emp.cpf}</TableCell>
                  <TableCell>{emp.pis_pasep || "-"}</TableCell>
                  <TableCell>{emp.job_title || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getRolesForUser(emp.user_id).map((role, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Ver Ficha
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEmployees.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum funcionário encontrado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ficha Cadastral - {selectedEmployee?.full_name}</span>
              <Button onClick={handlePrintEmployee} className="ml-4">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div ref={printRef}>
              {/* Print Header */}
              <div className="header hidden print:block">
                <h1>CRECHE PIMPOLINHOS</h1>
                <h2>Ficha Cadastral de Funcionário</h2>
              </div>

              {/* Personal Data */}
              <div className="section">
                <h3 className="section-title font-semibold text-lg bg-muted p-3 rounded-t-lg border-l-4 border-primary">
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-b-lg">
                  <div className="field col-span-2">
                    <p className="field-label text-xs text-muted-foreground uppercase">Nome Completo</p>
                    <p className="field-value font-medium">{selectedEmployee.full_name}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Data de Nascimento</p>
                    <p className="field-value">{formatDate(selectedEmployee.birth_date)}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Gênero</p>
                    <p className="field-value">{getGenderLabel(selectedEmployee.gender)}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Estado Civil</p>
                    <p className="field-value">{getMaritalStatusLabel(selectedEmployee.marital_status)}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Nacionalidade</p>
                    <p className="field-value">{selectedEmployee.nationality || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Naturalidade</p>
                    <p className="field-value">{selectedEmployee.place_of_birth || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Nome da Mãe</p>
                    <p className="field-value">{selectedEmployee.mother_name || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Nome do Pai</p>
                    <p className="field-value">{selectedEmployee.father_name || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="section mt-4">
                <h3 className="section-title font-semibold text-lg bg-muted p-3 rounded-t-lg border-l-4 border-primary">
                  Documentos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-b-lg">
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">CPF</p>
                    <p className="field-value font-medium">{selectedEmployee.cpf}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">RG</p>
                    <p className="field-value">{selectedEmployee.rg || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Órgão Emissor</p>
                    <p className="field-value">{selectedEmployee.rg_issuer || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Data de Emissão RG</p>
                    <p className="field-value">{formatDate(selectedEmployee.rg_issue_date)}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">PIS/PASEP</p>
                    <p className="field-value font-medium">{selectedEmployee.pis_pasep || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">CTPS Número</p>
                    <p className="field-value">{selectedEmployee.ctps_number || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">CTPS Série</p>
                    <p className="field-value">{selectedEmployee.ctps_series || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">CTPS UF</p>
                    <p className="field-value">{selectedEmployee.ctps_state || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Título de Eleitor</p>
                    <p className="field-value">{selectedEmployee.voter_title || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Zona Eleitoral</p>
                    <p className="field-value">{selectedEmployee.voter_zone || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Seção Eleitoral</p>
                    <p className="field-value">{selectedEmployee.voter_section || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Certificado Militar</p>
                    <p className="field-value">{selectedEmployee.military_certificate || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="section mt-4">
                <h3 className="section-title font-semibold text-lg bg-muted p-3 rounded-t-lg border-l-4 border-primary">
                  Endereço
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-b-lg">
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">CEP</p>
                    <p className="field-value">{selectedEmployee.zip_code || "-"}</p>
                  </div>
                  <div className="field col-span-2">
                    <p className="field-label text-xs text-muted-foreground uppercase">Logradouro</p>
                    <p className="field-value">{selectedEmployee.street || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Número</p>
                    <p className="field-value">{selectedEmployee.street_number || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Complemento</p>
                    <p className="field-value">{selectedEmployee.complement || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Bairro</p>
                    <p className="field-value">{selectedEmployee.neighborhood || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Cidade</p>
                    <p className="field-value">{selectedEmployee.city || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Estado</p>
                    <p className="field-value">{selectedEmployee.state || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="section mt-4">
                <h3 className="section-title font-semibold text-lg bg-muted p-3 rounded-t-lg border-l-4 border-primary">
                  Contato
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-b-lg">
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Telefone</p>
                    <p className="field-value">{selectedEmployee.phone || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Contato de Emergência</p>
                    <p className="field-value">{selectedEmployee.emergency_contact_name || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Telefone Emergência</p>
                    <p className="field-value">{selectedEmployee.emergency_contact_phone || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Bank Data */}
              <div className="section mt-4">
                <h3 className="section-title font-semibold text-lg bg-muted p-3 rounded-t-lg border-l-4 border-primary">
                  Dados Bancários
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-b-lg">
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Banco</p>
                    <p className="field-value">{selectedEmployee.bank_name || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Agência</p>
                    <p className="field-value">{selectedEmployee.bank_agency || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Conta</p>
                    <p className="field-value">{selectedEmployee.bank_account || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Tipo de Conta</p>
                    <p className="field-value">{getBankAccountTypeLabel(selectedEmployee.bank_account_type)}</p>
                  </div>
                  <div className="field col-span-2">
                    <p className="field-label text-xs text-muted-foreground uppercase">Chave PIX</p>
                    <p className="field-value">{selectedEmployee.pix_key || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Professional Data */}
              <div className="section mt-4">
                <h3 className="section-title font-semibold text-lg bg-muted p-3 rounded-t-lg border-l-4 border-primary">
                  Dados Profissionais
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-b-lg">
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Cargo</p>
                    <p className="field-value">{selectedEmployee.job_title || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Turno</p>
                    <p className="field-value">{selectedEmployee.work_shift || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Escolaridade</p>
                    <p className="field-value">{selectedEmployee.education_level || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Especialização</p>
                    <p className="field-value">{selectedEmployee.specialization || "-"}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">Data de Admissão</p>
                    <p className="field-value">{formatDate(selectedEmployee.hire_date)}</p>
                  </div>
                  <div className="field">
                    <p className="field-label text-xs text-muted-foreground uppercase">PCD</p>
                    <p className="field-value">
                      {selectedEmployee.has_disability 
                        ? `Sim - ${selectedEmployee.disability_description || "Não especificado"}`
                        : "Não"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature Area (for print) */}
              <div className="signature-area mt-8 hidden print:flex justify-between">
                <div className="signature-line w-[45%] text-center">
                  <div className="border-t border-black pt-2 mt-12">Assinatura do Funcionário</div>
                </div>
                <div className="signature-line w-[45%] text-center">
                  <div className="border-t border-black pt-2 mt-12">Assinatura do Responsável RH</div>
                </div>
              </div>

              <div className="footer mt-8 text-center text-xs text-muted-foreground hidden print:block">
                Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
