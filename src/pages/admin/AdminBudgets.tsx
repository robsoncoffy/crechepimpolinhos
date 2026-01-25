import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInMonths, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CLASS_NAMES, 
  type ClassType 
} from "@/lib/pricing";

// Judicial prices (different from standard pricing)
const JUDICIAL_PRICES: Record<ClassType, { integral: number; meioTurno: number }> = {
  bercario: { integral: 1050, meioTurno: 650 },
  maternal: { integral: 930, meioTurno: 550 },
  jardim: { integral: 850, meioTurno: 500 },
};

interface BudgetFormData {
  childName: string;
  childCpf: string;
  childBirthDate: string;
  classType: ClassType | "";
}

const initialFormData: BudgetFormData = {
  childName: "",
  childCpf: "",
  childBirthDate: "",
  classType: "",
};

// Format CPF as user types
const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Calculate age description from birth date
const getAgeDescription = (birthDate: string): string => {
  if (!birthDate) return "";
  const birth = new Date(birthDate + "T12:00:00");
  const today = new Date();
  const years = differenceInYears(today, birth);
  const months = differenceInMonths(today, birth) % 12;
  
  if (years === 0) {
    return `${months} ${months === 1 ? "mês" : "meses"}`;
  }
  if (months === 0) {
    return `${years} ${years === 1 ? "ano" : "anos"}`;
  }
  return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
};

// Suggest class type based on age
const getSuggestedClassType = (birthDate: string): ClassType | "" => {
  if (!birthDate) return "";
  const birth = new Date(birthDate + "T12:00:00");
  const today = new Date();
  const months = differenceInMonths(today, birth);
  
  if (months < 24) return "bercario";
  if (months < 48) return "maternal";
  return "jardim";
};

export default function AdminBudgets() {
  const [formData, setFormData] = useState<BudgetFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  // Auto-suggest class type when birth date changes
  useEffect(() => {
    if (formData.childBirthDate) {
      const suggested = getSuggestedClassType(formData.childBirthDate);
      if (suggested && !formData.classType) {
        setFormData(prev => ({ ...prev, classType: suggested }));
      }
    }
  }, [formData.childBirthDate]);

  const handleInputChange = (field: keyof BudgetFormData, value: string) => {
    if (field === "childCpf") {
      value = formatCpf(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePdf = () => {
    if (!formData.childName || !formData.classType) {
      toast.error("Preencha o nome da criança e selecione a turma");
      return;
    }

    setLoading(true);

    try {
      const today = new Date();
      const prices = JUDICIAL_PRICES[formData.classType as ClassType];
      const ageDescription = getAgeDescription(formData.childBirthDate);
      const birthDateFormatted = formData.childBirthDate 
        ? format(new Date(formData.childBirthDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
        : "";

      // Get class display name with subtype for maternal
      let classDisplay = CLASS_NAMES[formData.classType as ClassType];
      if (formData.classType === "maternal") {
        const birth = new Date(formData.childBirthDate + "T12:00:00");
        const months = differenceInMonths(today, birth);
        classDisplay = months < 36 ? "Maternal 1" : "Maternal 2";
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Orçamento Judicial - ${formData.childName}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              .no-print {
                display: none !important;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background: white;
              color: #333;
              line-height: 1.7;
              font-size: 14px;
            }
            
            .no-print {
              margin-bottom: 20px;
              text-align: center;
              padding: 15px;
              background: #f0f9ff;
              border-radius: 8px;
            }
            
            .no-print button {
              padding: 12px 24px;
              font-size: 14px;
              cursor: pointer;
              border: none;
              border-radius: 6px;
              margin: 0 5px;
              font-weight: 500;
            }
            
            .btn-print {
              background: #3b82f6;
              color: white;
            }
            
            .btn-close {
              background: #6b7280;
              color: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .header img {
              height: 80px;
              margin-bottom: 10px;
            }
            
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .content {
              margin-bottom: 25px;
            }
            
            .content p {
              margin-bottom: 15px;
              text-align: justify;
            }
            
            .child-info {
              margin: 20px 0;
              padding: 15px 0;
            }
            
            .child-info p {
              margin-bottom: 8px;
              text-align: left;
            }
            
            .child-name {
              font-weight: bold;
              font-size: 15px;
            }
            
            .class-name {
              font-weight: bold;
              font-size: 15px;
              margin-top: 10px;
              display: block;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            
            th, td {
              border: 1px solid #333;
              padding: 12px 15px;
              text-align: left;
            }
            
            th {
              background: #f5f5f5;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
            }
            
            td {
              font-size: 13px;
            }
            
            .text-center {
              text-align: center;
            }
            
            .incluso-section {
              margin: 25px 0;
            }
            
            .incluso-section h3 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            
            .incluso-section ul {
              margin-left: 20px;
            }
            
            .incluso-section li {
              margin-bottom: 6px;
              font-size: 13px;
            }
            
            .note {
              margin: 20px 0;
              font-size: 13px;
              text-align: justify;
            }
            
            .date-location {
              margin: 30px 0 20px 0;
              font-size: 14px;
            }
            
            .company-info {
              margin: 30px 0;
              font-size: 12px;
              line-height: 1.5;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 11px;
              color: #666;
            }
            
            .footer p {
              margin-bottom: 3px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">
              🖨️ Imprimir / Salvar PDF
            </button>
            <button class="btn-close" onclick="window.close()">
              ✕ Fechar
            </button>
          </div>
          
          <div class="header">
            <img src="/lovable-uploads/eed7b86f-7ea7-4bb8-befc-3aefe00dce68.png" alt="Creche Pimpolinhos" />
            <h1>Creche Infantil Pimpolinhos - Orçamento Judicial</h1>
          </div>
          
          <div class="content">
            <p>
              Para fins de instrução processual, certificamos que a Creche Infantil Pimpolinhos, 
              situada na Rua Coronel Camisão, nº 495, Bairro Harmonia, Canoas/RS, apresenta o 
              presente orçamento judicial de mensalidade, referente ao aluno:
            </p>
            
            <div class="child-info">
              <p class="child-name">${formData.childName}${formData.childCpf ? ` - CPF ${formData.childCpf}` : ""}</p>
              ${birthDateFormatted ? `<p>Data de nascimento: ${birthDateFormatted}${ageDescription ? ` (${ageDescription} na atual data)` : ""}</p>` : ""}
              <span class="class-name">${classDisplay}</span>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Modalidade</th>
                  <th>Horário</th>
                  <th class="text-center">Valor Mensal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>INTEGRAL</strong></td>
                  <td>07h às 19h</td>
                  <td class="text-center">R$${prices.integral.toFixed(2).replace(".", ",")}</td>
                </tr>
                <tr>
                  <td><strong>MEIO TURNO</strong></td>
                  <td>07h às 12h ou 13h às 19h</td>
                  <td class="text-center">R$${prices.meioTurno.toFixed(2).replace(".", ",")}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="incluso-section">
              <h3>Incluso na mensalidade:</h3>
              <ul>
                <li>Alimentação completa no período contratado (cardápio balanceado)</li>
                <li>Acompanhamento e supervisão de nutricionista</li>
                <li>Equipe pedagógica qualificada</li>
                <li>Ambiente seguro e estruturado especialmente para a educação infantil</li>
                <li>Atividades lúdicas, motoras e de desenvolvimento social, emocional e cognitivo</li>
              </ul>
            </div>
            
            <p class="note">
              Ressaltamos que os valores acima correspondem ao atendimento regular, com foco no 
              cuidado, acolhimento e desenvolvimento integral das crianças.
            </p>
            
            <p class="date-location">
              Canoas/RS, ${format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
            </p>
            
            <div class="company-info">
              <p><strong>60.141.634/0001-96</strong></p>
              <p>Escola de Ensino Infantil Pimpolinhos LTDA</p>
              <p>Rua Coronel Camisão 495</p>
              <p>Harmonia - CANOAS</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Endereço:</strong> Rua Coronel Camisão, nº 495, Harmonia – Canoas/RS 92310-020</p>
            <p><strong>WhatsApp:</strong> (51) 98996-5423</p>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        toast.success("Orçamento judicial gerado com sucesso!");
      } else {
        toast.error("Bloqueador de pop-ups ativo. Por favor, permita pop-ups.");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar orçamento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    toast.info("Formulário limpo");
  };

  const prices = formData.classType ? JUDICIAL_PRICES[formData.classType as ClassType] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-fredoka font-bold text-foreground">Orçamentos Judiciais</h1>
        <p className="text-muted-foreground">
          Gere orçamentos em PDF para ações judiciais e solicitações de responsáveis
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados do Aluno
              </CardTitle>
              <CardDescription>
                Preencha as informações para gerar o orçamento judicial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="childName">Nome Completo da Criança *</Label>
                  <Input
                    id="childName"
                    placeholder="Ex: João Pedro Silva"
                    value={formData.childName}
                    onChange={(e) => handleInputChange("childName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childCpf">CPF da Criança</Label>
                  <Input
                    id="childCpf"
                    placeholder="000.000.000-00"
                    value={formData.childCpf}
                    onChange={(e) => handleInputChange("childCpf", e.target.value)}
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="childBirthDate">Data de Nascimento</Label>
                  <Input
                    id="childBirthDate"
                    type="date"
                    value={formData.childBirthDate}
                    onChange={(e) => handleInputChange("childBirthDate", e.target.value)}
                  />
                  {formData.childBirthDate && (
                    <p className="text-sm text-muted-foreground">
                      Idade atual: {getAgeDescription(formData.childBirthDate)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Turma *</Label>
                  <Select
                    value={formData.classType}
                    onValueChange={(value) => handleInputChange("classType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bercario">Berçário</SelectItem>
                      <SelectItem value="maternal">Maternal</SelectItem>
                      <SelectItem value="jardim">Jardim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Valores da Turma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prices ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Integral</p>
                      <p className="text-xs text-muted-foreground">07h às 19h</p>
                    </div>
                    <span className="font-bold text-primary">
                      R${prices.integral.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Meio Turno</p>
                      <p className="text-xs text-muted-foreground">07h às 12h ou 13h às 19h</p>
                    </div>
                    <span className="font-bold text-primary">
                      R${prices.meioTurno.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecione a turma para ver os valores
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={generatePdf}
              disabled={loading || !formData.childName || !formData.classType}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Gerar Orçamento PDF
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Limpar Formulário
            </Button>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Na janela de impressão, selecione "Salvar como PDF" 
                para baixar o documento.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
