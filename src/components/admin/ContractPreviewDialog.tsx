import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, FileText, Send, Pencil, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { formatCPF, formatPhone } from "@/lib/formatters";
import { getPrice, formatCurrency, ClassType, PlanType, getClassDisplayName } from "@/lib/pricing";

export interface ContractData {
  parentName: string;
  parentCpf: string;
  parentRg?: string;
  parentPhone: string;
  parentEmail: string;
  parentRelationship?: string;
  address: string;
  childName: string;
  childCpf?: string;
  birthDate: string;
  classType: string;
  shiftType: string;
  planType?: string;
  emergencyContact?: string;
  // Clause customizations
  clauseObject?: string;
  clauseEnrollment?: string;
  clauseMonthlyFee?: string;
  clauseHours?: string;
  clauseFood?: string;
  clauseMedication?: string;
  clauseUniform?: string;
  clauseHealth?: string;
  clauseRegulations?: string;
  clauseImageRights?: string;
  clauseTermination?: string;
  clauseLGPD?: string;
  clauseGeneral?: string;
  clauseForum?: string;
  clausePenalty?: string;
  clauseSocialMedia?: string;
  clauseValidity?: string;
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
  maternal_1: "Maternal I",
  maternal_2: "Maternal II",
  jardim: "Jardim",
  jardim_1: "Jardim I",
  jardim_2: "Jardim II",
};

const shiftTypeLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

const shiftHours: Record<string, string> = {
  manha: "07h00min às 12h00min",
  tarde: "13h00min às 18h00min",
  integral: "07h00min às 16h00min (9 horas)",
};

const planTypeLabels: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  plus: "Plus+",
};

// Default clause texts
const DEFAULT_CLAUSES = {
  clauseObject: `O presente contrato tem por objeto a prestação de serviços educacionais e cuidados infantis, compreendendo atividades pedagógicas, recreativas, alimentação e acompanhamento do desenvolvimento da criança durante o período contratado.`,
  
  clauseEnrollment: `O presente contrato terá vigência a partir da data de sua assinatura até o dia 31 de dezembro de ${new Date().getFullYear()}. A matrícula será efetivada mediante assinatura deste contrato e pagamento da primeira mensalidade. A vaga é pessoal e intransferível. A renovação para o ano seguinte deverá ser solicitada até 30 de novembro.`,
  
  clauseMonthlyFee: `O valor das mensalidades será conforme tabela de preços vigente, com vencimento sempre no mesmo dia da assinatura deste contrato, a cada mês subsequente. O atraso no pagamento acarretará multa de 2% e juros de 1% ao mês.`,
  
  clauseHours: `A CONTRATADA funciona de segunda a sexta-feira, das 07h00min às 19h00min. O horário de permanência deve respeitar o turno contratado (Integral: 9 horas; Meio Turno Manhã: 7h às 12h; Meio Turno Tarde: 13h às 18h). Há tolerância de 15 minutos para entrada e saída.`,
  
  clauseFood: `A alimentação será fornecida conforme cardápio elaborado por nutricionista, adequado à faixa etária da criança. Alergias e restrições alimentares devem ser informadas por escrito.`,
  
  clauseMedication: `A administração de medicamentos somente será realizada mediante prescrição médica, com autorização por escrito do responsável, contendo nome do medicamento, dosagem e horários.`,
  
  clauseUniform: `O uso do uniforme escolar é facultativo, sendo recomendado para melhor identificação dos alunos. Os materiais escolares devem ser entregues conforme lista fornecida no ato da matrícula.`,
  
  clauseHealth: `Em caso de febre, vômitos, diarreia ou doenças contagiosas, a criança não poderá permanecer na escola. Os pais serão comunicados imediatamente para buscar a criança.`,
  
  clauseRegulations: `O CONTRATANTE declara conhecer e aceitar o Regulamento Interno da escola, que é parte integrante deste contrato.`,
  
  clauseImageRights: `O CONTRATANTE autoriza o uso de imagem da criança para fins pedagógicos, institucionais e de divulgação da escola em redes sociais e materiais promocionais, sem fins comerciais diretos.`,
  
  clauseTermination: `A rescisão deste contrato pode ser solicitada por qualquer das partes, mediante aviso prévio de 30 dias por escrito. A desistência sem aviso prévio implica no pagamento de multa equivalente a uma mensalidade.`,
  
  clauseLGPD: `A CONTRATADA se compromete a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), utilizando-os exclusivamente para as finalidades descritas neste contrato.`,
  
  clauseGeneral: `Os casos omissos serão resolvidos de comum acordo entre as partes, prevalecendo sempre o melhor interesse da criança.`,
  
  clauseForum: `Fica eleito o Foro da Comarca de Canoas/RS para dirimir quaisquer questões oriundas do presente contrato.`,

  clausePenalty: `Em caso de rescisão antecipada do contrato por iniciativa do CONTRATANTE, sem cumprimento do aviso prévio de 30 dias, ou por inadimplência, fica o CONTRATANTE obrigado ao pagamento de multa correspondente a 20% (vinte por cento) do valor total anual do contrato, calculado com base no plano contratado.`,

  clauseSocialMedia: `O CONTRATANTE autoriza expressamente a CONTRATADA a capturar, utilizar e divulgar imagens (fotos e vídeos) da criança matriculada para fins de publicação em redes sociais oficiais da creche (Instagram, Facebook, WhatsApp e demais plataformas), com objetivo exclusivamente institucional, pedagógico e promocional, sem qualquer remuneração ou compensação. A autorização poderá ser revogada a qualquer momento mediante solicitação por escrito.`,

  clauseValidity: `O presente contrato somente terá validade e eficácia após a confirmação do pagamento da primeira mensalidade. Sem a comprovação deste pagamento, a vaga não será garantida e o contrato será considerado nulo de pleno direito.`,
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
  const [openClauses, setOpenClauses] = useState<Record<string, boolean>>({});

  // Reset edited data when contract data changes
  useEffect(() => {
    setEditedData({
      ...contractData,
      clauseObject: contractData.clauseObject || DEFAULT_CLAUSES.clauseObject,
      clauseEnrollment: contractData.clauseEnrollment || DEFAULT_CLAUSES.clauseEnrollment,
      clauseMonthlyFee: contractData.clauseMonthlyFee || DEFAULT_CLAUSES.clauseMonthlyFee,
      clauseHours: contractData.clauseHours || DEFAULT_CLAUSES.clauseHours,
      clauseFood: contractData.clauseFood || DEFAULT_CLAUSES.clauseFood,
      clauseMedication: contractData.clauseMedication || DEFAULT_CLAUSES.clauseMedication,
      clauseUniform: contractData.clauseUniform || DEFAULT_CLAUSES.clauseUniform,
      clauseHealth: contractData.clauseHealth || DEFAULT_CLAUSES.clauseHealth,
      clauseRegulations: contractData.clauseRegulations || DEFAULT_CLAUSES.clauseRegulations,
      clauseImageRights: contractData.clauseImageRights || DEFAULT_CLAUSES.clauseImageRights,
      clauseTermination: contractData.clauseTermination || DEFAULT_CLAUSES.clauseTermination,
      clauseLGPD: contractData.clauseLGPD || DEFAULT_CLAUSES.clauseLGPD,
      clauseGeneral: contractData.clauseGeneral || DEFAULT_CLAUSES.clauseGeneral,
      clauseForum: contractData.clauseForum || DEFAULT_CLAUSES.clauseForum,
      clausePenalty: contractData.clausePenalty || DEFAULT_CLAUSES.clausePenalty,
      clauseSocialMedia: contractData.clauseSocialMedia || DEFAULT_CLAUSES.clauseSocialMedia,
      clauseValidity: contractData.clauseValidity || DEFAULT_CLAUSES.clauseValidity,
    });
    setActiveTab("preview");
    setOpenClauses({});
  }, [contractData]);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const handleInputChange = (field: keyof ContractData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const toggleClause = (clauseKey: string) => {
    setOpenClauses(prev => ({ ...prev, [clauseKey]: !prev[clauseKey] }));
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

  const ClauseEditor = ({ 
    clauseKey, 
    title, 
    clauseNumber 
  }: { 
    clauseKey: keyof ContractData; 
    title: string; 
    clauseNumber: number;
  }) => {
    const isOpen = openClauses[clauseKey] || false;
    
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleClause(clauseKey)}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-card hover:bg-accent/50 rounded-lg border text-left transition-colors">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">CLÁUSULA {clauseNumber} – {title}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 pl-6">
          <Textarea
            value={editedData[clauseKey] as string || ''}
            onChange={(e) => handleInputChange(clauseKey, e.target.value)}
            className="min-h-[120px] text-sm"
            placeholder={`Texto da cláusula ${clauseNumber}...`}
          />
        </CollapsibleContent>
      </Collapsible>
    );
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

                {/* Cláusula 1 - Partes */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 1 – DAS PARTES CONTRATANTES</h4>
                  
                  <p className="mb-2">
                    <strong>CONTRATADA:</strong> {COMPANY_DATA.name}, pessoa jurídica de direito privado, 
                    inscrita no CNPJ sob nº {COMPANY_DATA.cnpj}, com sede na {COMPANY_DATA.address}.
                  </p>
                  
                  <p className="mb-2">
                    <strong>CONTRATANTE ({editedData.parentRelationship || 'Responsável'}):</strong> {editedData.parentName || '[Nome não informado]'}, 
                    inscrito(a) no CPF sob nº {editedData.parentCpf ? formatCPF(editedData.parentCpf) : '[CPF não informado]'}
                    {editedData.parentRg ? `, RG nº ${editedData.parentRg}` : ''}, 
                    residente e domiciliado(a) em {editedData.address || 'Canoas/RS'}, 
                    telefone: {editedData.parentPhone ? formatPhone(editedData.parentPhone) : '[Telefone não informado]'}, 
                    e-mail: {editedData.parentEmail || '[Email não informado]'}.
                  </p>
                  
                  <p>
                    <strong>ALUNO(A):</strong> {editedData.childName}
                    {editedData.childCpf ? `, inscrito(a) no CPF sob nº ${formatCPF(editedData.childCpf)}` : ''}
                    , nascido(a) em {editedData.birthDate}.
                  </p>
                </div>

                {/* Cláusula 2 - Objeto */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 2 – DO OBJETO DO CONTRATO</h4>
                  <p>{editedData.clauseObject || DEFAULT_CLAUSES.clauseObject}</p>
                </div>

                {/* Cláusula 3 - Matrícula */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 3 – DA MATRÍCULA</h4>
                  <p className="mb-2">
                    <strong>Turma:</strong> {classTypeLabels[editedData.classType] || editedData.classType}
                  </p>
                  <p className="mb-2">
                    <strong>Turno:</strong> {shiftTypeLabels[editedData.shiftType] || editedData.shiftType} 
                    ({shiftHours[editedData.shiftType] || 'conforme contratado'})
                  </p>
                  <p>{editedData.clauseEnrollment || DEFAULT_CLAUSES.clauseEnrollment}</p>
                </div>

                {/* Cláusula 4 - Mensalidades */}
                {(() => {
                  const classKey = editedData.classType as ClassType;
                  const planKey = editedData.planType as PlanType;
                  // Use getPrice which handles Maternal I pricing (same as Berçário)
                  const priceValue = classKey && planKey ? getPrice(classKey, planKey) : 0;
                  const monthlyValue = priceValue > 0 ? formatCurrency(priceValue) : null;
                  
                  return (
                    <div className="bg-card p-4 rounded-lg border mb-4">
                      <h4 className="font-semibold mb-2">CLÁUSULA 4 – DAS MENSALIDADES</h4>
                      <p className="mb-2">
                        <strong>Plano Contratado:</strong> {editedData.planType ? planTypeLabels[editedData.planType] || editedData.planType : 'Conforme acordado'}
                      </p>
                      {monthlyValue && (
                        <p className="mb-2">
                          <strong>Valor Mensal:</strong> {monthlyValue}
                        </p>
                      )}
                      <p>{editedData.clauseMonthlyFee || DEFAULT_CLAUSES.clauseMonthlyFee}</p>
                    </div>
                  );
                })()}

                {/* Cláusula 5 - Horário */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 5 – DO HORÁRIO DE FUNCIONAMENTO</h4>
                  <p>{editedData.clauseHours || DEFAULT_CLAUSES.clauseHours}</p>
                </div>

                {/* Cláusula 6 - Alimentação */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 6 – DA ALIMENTAÇÃO</h4>
                  <p>{editedData.clauseFood || DEFAULT_CLAUSES.clauseFood}</p>
                </div>

                {/* Cláusula 7 - Medicamentos */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 7 – DA ADMINISTRAÇÃO DE MEDICAMENTOS</h4>
                  <p>{editedData.clauseMedication || DEFAULT_CLAUSES.clauseMedication}</p>
                </div>

                {/* Cláusula 8 - Saúde e Segurança */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 8 – DA SAÚDE E SEGURANÇA</h4>
                  {editedData.emergencyContact && (
                    <p className="mb-2">
                      <strong>Contato de Emergência:</strong> {editedData.emergencyContact}
                    </p>
                  )}
                  <p>{editedData.clauseHealth || DEFAULT_CLAUSES.clauseHealth}</p>
                </div>

                {/* Cláusula 9 - Uniforme */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 9 – DO UNIFORME E MATERIAIS</h4>
                  <p>{editedData.clauseUniform || DEFAULT_CLAUSES.clauseUniform}</p>
                </div>

                {/* Cláusula 10 - Regulamento */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 10 – DO REGULAMENTO INTERNO</h4>
                  <p>{editedData.clauseRegulations || DEFAULT_CLAUSES.clauseRegulations}</p>
                </div>

                {/* Cláusula 11 - Imagem */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 11 – DO USO DE IMAGEM</h4>
                  <p>{editedData.clauseImageRights || DEFAULT_CLAUSES.clauseImageRights}</p>
                </div>

                {/* Cláusula 12 - Rescisão */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 12 – DA RESCISÃO</h4>
                  <p>{editedData.clauseTermination || DEFAULT_CLAUSES.clauseTermination}</p>
                </div>

                {/* Cláusula 13 - LGPD */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 13 – DA PROTEÇÃO DE DADOS (LGPD)</h4>
                  <p>{editedData.clauseLGPD || DEFAULT_CLAUSES.clauseLGPD}</p>
                </div>

                {/* Cláusula 14 - Foro */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 14 – DO FORO</h4>
                  <p>{editedData.clauseForum || DEFAULT_CLAUSES.clauseForum}</p>
                </div>

                {/* Cláusula 15 - Multa */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 15 – DA MULTA POR RESCISÃO</h4>
                  <p>{editedData.clausePenalty || DEFAULT_CLAUSES.clausePenalty}</p>
                </div>

                {/* Cláusula 16 - Redes Sociais */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 16 – AUTORIZAÇÃO PARA REDES SOCIAIS</h4>
                  <p>{editedData.clauseSocialMedia || DEFAULT_CLAUSES.clauseSocialMedia}</p>
                </div>

                {/* Cláusula 17 - Validade */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">CLÁUSULA 17 – DA VALIDADE DO CONTRATO</h4>
                  <p>{editedData.clauseValidity || DEFAULT_CLAUSES.clauseValidity}</p>
                </div>

                {/* Disposições Gerais */}
                <div className="bg-card p-4 rounded-lg border mb-4">
                  <h4 className="font-semibold mb-2">DISPOSIÇÕES GERAIS</h4>
                  <p>{editedData.clauseGeneral || DEFAULT_CLAUSES.clauseGeneral}</p>
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
                {/* Dados do Responsável */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Dados do Responsável (Cláusula 1)</h4>
                  
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

                {/* Dados da Criança */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Dados da Criança (Cláusula 1)</h4>
                  
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

                {/* Contato de Emergência */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Contato de Emergência (Cláusula 8)</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Contato de Emergência</Label>
                    <Input
                      id="emergencyContact"
                      value={editedData.emergencyContact || ''}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Nome (parentesco) - Telefone"
                    />
                  </div>
                </div>

                {/* Cláusulas Editáveis */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Cláusulas do Contrato</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique em cada cláusula para expandir e editar o texto. As cláusulas possuem textos padrão que podem ser personalizados conforme necessário.
                  </p>
                  
                  <div className="space-y-2">
                    <ClauseEditor 
                      clauseKey="clauseObject" 
                      title="DO OBJETO DO CONTRATO" 
                      clauseNumber={2} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseEnrollment" 
                      title="DA MATRÍCULA" 
                      clauseNumber={3} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseMonthlyFee" 
                      title="DAS MENSALIDADES" 
                      clauseNumber={4} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseHours" 
                      title="DO HORÁRIO DE FUNCIONAMENTO" 
                      clauseNumber={5} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseFood" 
                      title="DA ALIMENTAÇÃO" 
                      clauseNumber={6} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseMedication" 
                      title="DA ADMINISTRAÇÃO DE MEDICAMENTOS" 
                      clauseNumber={7} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseHealth" 
                      title="DA SAÚDE E SEGURANÇA" 
                      clauseNumber={8} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseUniform" 
                      title="DO UNIFORME E MATERIAIS" 
                      clauseNumber={9} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseRegulations" 
                      title="DO REGULAMENTO INTERNO" 
                      clauseNumber={10} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseImageRights" 
                      title="DO USO DE IMAGEM" 
                      clauseNumber={11} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseTermination" 
                      title="DA RESCISÃO" 
                      clauseNumber={12} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseLGPD" 
                      title="DA PROTEÇÃO DE DADOS (LGPD)" 
                      clauseNumber={13} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseForum" 
                      title="DO FORO" 
                      clauseNumber={14} 
                    />
                    <ClauseEditor 
                      clauseKey="clausePenalty" 
                      title="DA MULTA POR RESCISÃO" 
                      clauseNumber={15} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseSocialMedia" 
                      title="AUTORIZAÇÃO PARA REDES SOCIAIS" 
                      clauseNumber={16} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseValidity" 
                      title="DA VALIDADE DO CONTRATO" 
                      clauseNumber={17} 
                    />
                    <ClauseEditor 
                      clauseKey="clauseGeneral" 
                      title="DISPOSIÇÕES GERAIS" 
                      clauseNumber={0} 
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
