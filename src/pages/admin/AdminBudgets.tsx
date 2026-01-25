import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  PRICES, 
  CLASS_NAMES, 
  PLAN_NAMES, 
  ENROLLMENT_FEE, 
  formatCurrency,
  type ClassType,
  type PlanType 
} from "@/lib/pricing";

interface BudgetItem {
  id: string;
  description: string;
  value: number;
}

interface BudgetFormData {
  parentName: string;
  childName: string;
  childBirthDate: string;
  classType: ClassType | "";
  planType: PlanType | "";
  includeEnrollmentFee: boolean;
  additionalItems: BudgetItem[];
  observations: string;
  validityDays: number;
}

const initialFormData: BudgetFormData = {
  parentName: "",
  childName: "",
  childBirthDate: "",
  classType: "",
  planType: "",
  includeEnrollmentFee: true,
  additionalItems: [],
  observations: "",
  validityDays: 30,
};

export default function AdminBudgets() {
  const [formData, setFormData] = useState<BudgetFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof BudgetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAdditionalItem = () => {
    const newItem: BudgetItem = {
      id: crypto.randomUUID(),
      description: "",
      value: 0,
    };
    setFormData(prev => ({
      ...prev,
      additionalItems: [...prev.additionalItems, newItem],
    }));
  };

  const updateAdditionalItem = (id: string, field: keyof BudgetItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      additionalItems: prev.additionalItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeAdditionalItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      additionalItems: prev.additionalItems.filter(item => item.id !== id),
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    
    if (formData.classType && formData.planType) {
      total += PRICES[formData.classType][formData.planType];
    }
    
    if (formData.includeEnrollmentFee) {
      total += ENROLLMENT_FEE;
    }
    
    formData.additionalItems.forEach(item => {
      total += item.value || 0;
    });
    
    return total;
  };

  const generatePdf = () => {
    if (!formData.parentName || !formData.childName || !formData.classType || !formData.planType) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + formData.validityDays);

      const monthlyValue = formData.classType && formData.planType 
        ? PRICES[formData.classType][formData.planType] 
        : 0;
      const total = calculateTotal();

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Orçamento - ${formData.childName}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 15mm;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              background: white;
              color: #333;
              line-height: 1.6;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #3b82f6;
            }
            
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .logo-section img {
              height: 80px;
            }
            
            .school-info h1 {
              font-size: 24px;
              color: #3b82f6;
              margin-bottom: 5px;
            }
            
            .school-info p {
              font-size: 12px;
              color: #666;
            }
            
            .document-info {
              text-align: right;
            }
            
            .document-info h2 {
              font-size: 20px;
              color: #333;
              margin-bottom: 10px;
            }
            
            .document-info p {
              font-size: 12px;
              color: #666;
            }
            
            .section {
              margin-bottom: 25px;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #3b82f6;
              text-transform: uppercase;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            
            .info-item {
              display: flex;
              gap: 10px;
            }
            
            .info-label {
              font-weight: 600;
              color: #555;
              min-width: 120px;
            }
            
            .info-value {
              color: #333;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            
            th, td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
            }
            
            th {
              background: #3b82f6;
              color: white;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            td {
              font-size: 13px;
            }
            
            .text-right {
              text-align: right;
            }
            
            .total-row {
              background: #f0f9ff;
              font-weight: 600;
            }
            
            .total-row td {
              font-size: 14px;
              color: #1e40af;
            }
            
            .monthly-row {
              background: #fefce8;
            }
            
            .observations {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
            }
            
            .observations p {
              font-size: 13px;
              color: #555;
            }
            
            .validity {
              margin-top: 20px;
              padding: 15px;
              background: #fef3c7;
              border-radius: 8px;
              text-align: center;
            }
            
            .validity p {
              font-size: 12px;
              color: #92400e;
            }
            
            .footer {
              margin-top: 40px;
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            
            .footer p {
              font-size: 11px;
              color: #888;
            }
            
            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-around;
            }
            
            .signature-line {
              text-align: center;
              width: 200px;
            }
            
            .signature-line .line {
              border-top: 1px solid #333;
              margin-bottom: 5px;
            }
            
            .signature-line p {
              font-size: 11px;
              color: #666;
            }
            
            .no-print {
              margin-bottom: 20px;
              text-align: center;
            }
            
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #3b82f6; color: white; border: none; border-radius: 8px; margin-right: 10px;">
              🖨️ Imprimir / Salvar PDF
            </button>
            <button onclick="window.close()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #6b7280; color: white; border: none; border-radius: 8px;">
              ✕ Fechar
            </button>
          </div>
          
          <div class="header">
            <div class="logo-section">
              <img src="/lovable-uploads/eed7b86f-7ea7-4bb8-befc-3aefe00dce68.png" alt="Pimpolinhos" />
              <div class="school-info">
                <h1>Creche Pimpolinhos</h1>
                <p>CNPJ: 00.000.000/0001-00</p>
                <p>Rua Exemplo, 123 - Bairro - Cidade/RS</p>
                <p>Tel: (51) 9 8996-5423</p>
              </div>
            </div>
            <div class="document-info">
              <h2>ORÇAMENTO</h2>
              <p><strong>Data:</strong> ${format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><strong>Válido até:</strong> ${format(validUntil, "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Dados do Solicitante</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Responsável:</span>
                <span class="info-value">${formData.parentName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Criança:</span>
                <span class="info-value">${formData.childName}</span>
              </div>
              ${formData.childBirthDate ? `
              <div class="info-item">
                <span class="info-label">Data Nasc.:</span>
                <span class="info-value">${format(new Date(formData.childBirthDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Turma:</span>
                <span class="info-value">${CLASS_NAMES[formData.classType as ClassType]}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Plano:</span>
                <span class="info-value">${PLAN_NAMES[formData.planType as PlanType]}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Detalhamento de Valores</div>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th class="text-right" style="width: 150px;">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr class="monthly-row">
                  <td><strong>Mensalidade ${PLAN_NAMES[formData.planType as PlanType]} - ${CLASS_NAMES[formData.classType as ClassType]}</strong><br/><small style="color: #666;">Valor mensal recorrente</small></td>
                  <td class="text-right"><strong>${formatCurrency(monthlyValue)}/mês</strong></td>
                </tr>
                ${formData.includeEnrollmentFee ? `
                <tr>
                  <td>Taxa de Matrícula<br/><small style="color: #666;">Cobrança única (primeira parcela)</small></td>
                  <td class="text-right">${formatCurrency(ENROLLMENT_FEE)}</td>
                </tr>
                ` : ''}
                ${formData.additionalItems.map(item => `
                <tr>
                  <td>${item.description || 'Item adicional'}</td>
                  <td class="text-right">${formatCurrency(item.value)}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL PRIMEIRA PARCELA</strong></td>
                  <td class="text-right"><strong>${formatCurrency(total)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          ${formData.observations ? `
          <div class="section">
            <div class="section-title">Observações</div>
            <div class="observations">
              <p>${formData.observations.replace(/\n/g, '<br/>')}</p>
            </div>
          </div>
          ` : ''}
          
          <div class="validity">
            <p><strong>⚠️ Este orçamento é válido por ${formData.validityDays} dias a partir da data de emissão.</strong></p>
            <p>Após este período, os valores podem sofrer alterações sem aviso prévio.</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-line">
              <div class="line"></div>
              <p>Creche Pimpolinhos</p>
            </div>
            <div class="signature-line">
              <div class="line"></div>
              <p>Responsável</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Este documento é um orçamento estimativo e não constitui contrato.</p>
            <p>Para efetivação da matrícula, consulte os termos e condições completos.</p>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        toast.success("Orçamento gerado com sucesso!");
      } else {
        toast.error("Bloqueador de pop-ups ativo. Por favor, permita pop-ups para este site.");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-fredoka font-bold text-foreground">Orçamentos</h1>
        <p className="text-muted-foreground">
          Gere orçamentos em PDF para ações judiciais e solicitações de responsáveis
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados do Orçamento
              </CardTitle>
              <CardDescription>
                Preencha as informações para gerar o documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parent & Child Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Nome do Responsável *</Label>
                  <Input
                    id="parentName"
                    placeholder="Nome completo"
                    value={formData.parentName}
                    onChange={(e) => handleInputChange("parentName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childName">Nome da Criança *</Label>
                  <Input
                    id="childName"
                    placeholder="Nome completo"
                    value={formData.childName}
                    onChange={(e) => handleInputChange("childName", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="childBirthDate">Data de Nascimento</Label>
                  <Input
                    id="childBirthDate"
                    type="date"
                    value={formData.childBirthDate}
                    onChange={(e) => handleInputChange("childBirthDate", e.target.value)}
                  />
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
                <div className="space-y-2">
                  <Label>Plano *</Label>
                  <Select
                    value={formData.planType}
                    onValueChange={(value) => handleInputChange("planType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="plus">Plus+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enrollment Fee */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeEnrollmentFee"
                  checked={formData.includeEnrollmentFee}
                  onChange={(e) => handleInputChange("includeEnrollmentFee", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="includeEnrollmentFee" className="cursor-pointer">
                  Incluir Taxa de Matrícula ({formatCurrency(ENROLLMENT_FEE)})
                </Label>
              </div>

              {/* Additional Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Itens Adicionais</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>
                {formData.additionalItems.map((item) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <Input
                      placeholder="Descrição do item"
                      value={item.description}
                      onChange={(e) => updateAdditionalItem(item.id, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      value={item.value || ""}
                      onChange={(e) => updateAdditionalItem(item.id, "value", parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAdditionalItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Validity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="validityDays">Validade do Orçamento (dias)</Label>
                  <Input
                    id="validityDays"
                    type="number"
                    min={1}
                    max={90}
                    value={formData.validityDays}
                    onChange={(e) => handleInputChange("validityDays", parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Informações adicionais, condições especiais, etc."
                  value={formData.observations}
                  onChange={(e) => handleInputChange("observations", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.classType && formData.planType && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mensalidade:</span>
                    <span className="font-medium">
                      {formatCurrency(PRICES[formData.classType][formData.planType])}
                    </span>
                  </div>
                  {formData.includeEnrollmentFee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de Matrícula:</span>
                      <span>{formatCurrency(ENROLLMENT_FEE)}</span>
                    </div>
                  )}
                  {formData.additionalItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {item.description || "Item adicional"}:
                      </span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total 1ª Parcela:</span>
                    <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              )}

              {(!formData.classType || !formData.planType) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecione a turma e o plano para ver o resumo
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={generatePdf}
              disabled={loading || !formData.parentName || !formData.childName || !formData.classType || !formData.planType}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Limpar Formulário
            </Button>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Após gerar o PDF, você pode salvá-lo usando a opção 
                "Salvar como PDF" na janela de impressão do navegador.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
