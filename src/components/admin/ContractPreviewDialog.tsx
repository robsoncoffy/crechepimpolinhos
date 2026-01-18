import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Send, Pencil, Eye } from "lucide-react";
import { formatCPF, formatPhone } from "@/lib/formatters";

export interface ContractData {
  parentName: string;
  parentCpf: string;
  parentRg?: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  childName: string;
  birthDate: string;
  classType: string;
  shiftType: string;
  planType?: string;
  emergencyContact?: string;
}

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractData: ContractData;
  onConfirmSend: (editedData: ContractData) => Promise<void>;
  loading?: boolean;
}

const COMPANY_DATA = {
  name: "ESCOLA DE ENSINO INFANTIL PIMPOLINHOS LTDA",
  cnpj: "60.141.634/0001-96",
  address: "Rua Coronel Camisao, nº 495, Bairro Harmonia, Canoas/RS, CEP 92310-410",
};

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const shiftTypeLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

const shiftHours: Record<string, string> = {
  manha: "07h00min às 12h30min",
  tarde: "13h00min às 18h00min",
  integral: "07h00min às 19h00min",
};

const planTypeLabels: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  plus: "Plus+",
};

export function ContractPreviewDialog({
  open,
  onOpenChange,
  contractData,
  onConfirmSend,
  loading = false,
}: ContractPreviewDialogProps) {
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedData, setEditedData] = useState<ContractData>(contractData);

  // Reset edited data when contract data changes
  useEffect(() => {
    setEditedData(contractData);
    setActiveTab("preview");
  }, [contractData]);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const handleInputChange = (field: keyof ContractData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirmSend(editedData);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prévia do Contrato de Matrícula
          </DialogTitle>
          <DialogDescription>
            Revise os dados e edite se necessário antes de enviar para assinatura
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visualizar Contrato
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar Dados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <ScrollArea className="h-[55vh] border rounded-lg p-6 bg-muted/30">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-center font-bold text-lg mb-4">
                  CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E CUIDADOS INFANTIS
                </h2>
                <h3 className="text-center text-base mb-6">{COMPANY_DATA.name}</h3>

                <p className="text-sm text-muted-foreground mb-4">
                  Pelo presente instrumento particular de Contrato de Prestação de Serviços 
                  Educacionais e Cuidados Infantis, de um lado:
                </p>

                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 1 – DAS PARTES CONTRATANTES</h4>
                  
                  <p className="mb-2">
                    <strong>CONTRATADA:</strong> {COMPANY_DATA.name}, pessoa jurídica de direito privado, 
                    inscrita no CNPJ sob nº {COMPANY_DATA.cnpj}, com sede na {COMPANY_DATA.address}.
                  </p>
                  
                  <p className="mb-2">
                    <strong>CONTRATANTE:</strong> {editedData.parentName || '[Nome não informado]'}, 
                    inscrito(a) no CPF sob nº {editedData.parentCpf ? formatCPF(editedData.parentCpf) : '[CPF não informado]'}
                    {editedData.parentRg ? `, RG nº ${editedData.parentRg}` : ''}, 
                    residente e domiciliado(a) em {editedData.address || 'Canoas/RS'}, 
                    telefone: {editedData.parentPhone ? formatPhone(editedData.parentPhone) : '[Telefone não informado]'}, 
                    e-mail: {editedData.parentEmail || '[Email não informado]'}.
                  </p>
                  
                  <p>
                    <strong>ALUNO(A):</strong> {editedData.childName}, nascido(a) em {editedData.birthDate}.
                  </p>
                </div>

                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 5 – DO HORÁRIO DE FUNCIONAMENTO</h4>
                  <p className="mb-2">
                    <strong>Turno:</strong> {shiftTypeLabels[editedData.shiftType] || editedData.shiftType} 
                    ({shiftHours[editedData.shiftType] || 'conforme contratado'})
                  </p>
                  <p>
                    <strong>Turma:</strong> {classTypeLabels[editedData.classType] || editedData.classType}
                  </p>
                </div>

                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 4 – DAS MENSALIDADES</h4>
                  <p>
                    <strong>Plano Contratado:</strong> {editedData.planType ? planTypeLabels[editedData.planType] || editedData.planType : 'Conforme acordado'}
                  </p>
                </div>

                {editedData.emergencyContact && (
                  <div className="bg-card p-4 rounded-lg border mb-4">
                    <h4 className="font-semibold mb-2">CLÁUSULA 8 – DA SAÚDE E SEGURANÇA</h4>
                    <p>
                      <strong>Contato de Emergência:</strong> {editedData.emergencyContact}
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground mt-6">
                  <p className="mb-2">
                    <em>O contrato completo contém 14 cláusulas que abordam:</em>
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Objeto do contrato e serviços oferecidos</li>
                    <li>Condições de matrícula</li>
                    <li>Mensalidades e forma de pagamento</li>
                    <li>Horário de funcionamento e tolerâncias</li>
                    <li>Alimentação e administração de medicamentos</li>
                    <li>Uniforme e materiais</li>
                    <li>Saúde e segurança</li>
                    <li>Regulamento interno</li>
                    <li>Uso de imagem</li>
                    <li>Condições de rescisão</li>
                    <li>Proteção de dados (LGPD)</li>
                    <li>Foro competente</li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <p className="text-center text-sm text-muted-foreground">
                    Canoas/RS, {currentDate}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="edit" className="mt-4">
            <ScrollArea className="h-[55vh] border rounded-lg p-6 bg-muted/30">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Dados do Responsável</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parentName">Nome Completo *</Label>
                      <Input
                        id="parentName"
                        value={editedData.parentName}
                        onChange={(e) => handleInputChange('parentName', e.target.value)}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">E-mail *</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={editedData.parentEmail}
                        onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="parentCpf">CPF *</Label>
                      <Input
                        id="parentCpf"
                        value={formatCPF(editedData.parentCpf)}
                        onChange={(e) => handleInputChange('parentCpf', e.target.value.replace(/\D/g, ''))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="parentRg">RG</Label>
                      <Input
                        id="parentRg"
                        value={editedData.parentRg || ''}
                        onChange={(e) => handleInputChange('parentRg', e.target.value)}
                        placeholder="RG do responsável"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Telefone *</Label>
                      <Input
                        id="parentPhone"
                        value={formatPhone(editedData.parentPhone)}
                        onChange={(e) => handleInputChange('parentPhone', e.target.value.replace(/\D/g, ''))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Endereço Completo *</Label>
                      <Input
                        id="address"
                        value={editedData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Rua, número, bairro, cidade/UF"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Dados da Criança</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="childName">Nome da Criança *</Label>
                      <Input
                        id="childName"
                        value={editedData.childName}
                        onChange={(e) => handleInputChange('childName', e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Data de Nascimento</Label>
                      <Input
                        id="birthDate"
                        value={editedData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Contato de Emergência</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Contato de Emergência</Label>
                    <Input
                      id="emergencyContact"
                      value={editedData.emergencyContact || ''}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Nome (parentesco)"
                    />
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Nota:</strong> Os campos de Turma, Turno e Plano são definidos na aprovação 
                    e não podem ser alterados aqui. Se precisar alterar, cancele e refaça a aprovação.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || loading}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Aprovar e Enviar Contrato
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
