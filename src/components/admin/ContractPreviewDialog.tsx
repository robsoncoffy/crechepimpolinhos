import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, FileText, Send, Pencil, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { formatCPF, formatPhone } from "@/lib/formatters";
import { getPrice, formatCurrency, ClassType, PlanType } from "@/lib/pricing";

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
  // Custom pricing override
  customMonthlyValue?: number;
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
  viewOnly?: boolean;
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
  viewOnly = false,
}: ContractPreviewDialogProps) {
  const [sending, setSending] = useState(false);
  const [editedData, setEditedData] = useState<ContractData>(contractData);
  const [openClauses, setOpenClauses] = useState<Record<string, boolean>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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
    // Reset clauses state
    setOpenClauses({});
    setConfirmDialogOpen(false);
  }, [contractData]);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const handleInputChange = (field: keyof ContractData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const toggleClause = (clauseKey: string) => {
    setOpenClauses(prev => ({ ...prev, [clauseKey]: !prev[clauseKey] }));
  };

  // Opens the confirmation dialog - does NOT send the contract
  const handleRequestSend = () => {
    setConfirmDialogOpen(true);
  };

  // Actually sends the contract after user confirms
  const handleConfirmedSend = async () => {
    setConfirmDialogOpen(false);
    setSending(true);
    try {
      await onConfirmSend(editedData);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  // Helper component for inline editable fields
  const EditableField = ({ 
    label, 
    value, 
    onChange, 
    placeholder,
    type = "text",
    maxLength
  }: { 
    label: string; 
    value: string; 
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    maxLength?: number;
  }) => (
    <div className="flex items-center gap-2 group">
      <span className="font-semibold whitespace-nowrap">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-7 text-sm flex-1 bg-background/50 border-dashed focus:border-solid"
      />
    </div>
  );

  // Helper for editable clause sections
  const EditableClauseSection = ({
    title,
    clauseNumber,
    clauseKey,
    children,
  }: {
    title: string;
    clauseNumber: number;
    clauseKey: keyof ContractData;
    children?: React.ReactNode;
  }) => {
    const isOpen = openClauses[clauseKey] || false;
    const value = (editedData[clauseKey] as string) || '';
    
    return (
      <div className="bg-card p-4 rounded-lg border mb-4">
        <Collapsible open={isOpen} onOpenChange={() => toggleClause(clauseKey)}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
            <h4 className="font-semibold flex-1">CLÁUSULA {clauseNumber} – {title}</h4>
            <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          
          {children && <div className="mt-2">{children}</div>}
          
          {!isOpen && (
            <p className="mt-2 text-sm">{value || DEFAULT_CLAUSES[clauseKey as keyof typeof DEFAULT_CLAUSES]}</p>
          )}
          
          <CollapsibleContent className="mt-2">
            <Textarea
              value={value}
              onChange={(e) => handleInputChange(clauseKey, e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder={`Texto da cláusula ${clauseNumber}...`}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  // Calculate monthly value for display
  const classKey = editedData.classType as ClassType;
  const planKey = editedData.planType as PlanType;
  const priceValue = editedData.customMonthlyValue || (classKey && planKey ? getPrice(classKey, planKey) : 0);
  const monthlyValue = priceValue > 0 ? formatCurrency(priceValue) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prévia do Contrato de Matrícula
          </DialogTitle>
          <DialogDescription>
            Clique nos campos ou cláusulas para editar diretamente
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] border rounded-lg p-6 bg-muted/30">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-center font-bold text-lg mb-4">
              CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E CUIDADOS INFANTIS
            </h2>
            <h3 className="text-center text-base mb-6">{COMPANY_DATA.name}</h3>

            <p className="text-sm text-muted-foreground mb-4">
              Pelo presente instrumento particular de Contrato de Prestação de Serviços 
              Educacionais e Cuidados Infantis, de um lado:
            </p>

            {/* Cláusula 1 - Partes (Editável) */}
            <div className="bg-card p-4 rounded-lg border mb-4 space-y-3">
              <h4 className="font-semibold mb-2">CLÁUSULA 1 – DAS PARTES CONTRATANTES</h4>
              
              <p className="text-sm">
                <strong>CONTRATADA:</strong> {COMPANY_DATA.name}, pessoa jurídica de direito privado, 
                inscrita no CNPJ sob nº {COMPANY_DATA.cnpj}, com sede na {COMPANY_DATA.address}.
              </p>
              
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  <Pencil className="h-3 w-3 inline mr-1" />
                  Dados do Responsável (editáveis)
                </p>
                <EditableField 
                  label="Nome:" 
                  value={editedData.parentName} 
                  onChange={(v) => handleInputChange('parentName', v)}
                  placeholder="Nome do responsável"
                />
                <EditableField 
                  label="CPF:" 
                  value={formatCPF(editedData.parentCpf)} 
                  onChange={(v) => handleInputChange('parentCpf', v.replace(/\D/g, ''))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                <EditableField 
                  label="RG:" 
                  value={editedData.parentRg || ''} 
                  onChange={(v) => handleInputChange('parentRg', v)}
                  placeholder="RG (opcional)"
                />
                <EditableField 
                  label="Endereço:" 
                  value={editedData.address} 
                  onChange={(v) => handleInputChange('address', v)}
                  placeholder="Rua, número, bairro, cidade/UF"
                />
                <EditableField 
                  label="Telefone:" 
                  value={formatPhone(editedData.parentPhone)} 
                  onChange={(v) => handleInputChange('parentPhone', v.replace(/\D/g, ''))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <EditableField 
                  label="E-mail:" 
                  value={editedData.parentEmail} 
                  onChange={(v) => handleInputChange('parentEmail', v)}
                  placeholder="email@exemplo.com"
                  type="email"
                />
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  <Pencil className="h-3 w-3 inline mr-1" />
                  Dados do Aluno (editáveis)
                </p>
                <EditableField 
                  label="Nome:" 
                  value={editedData.childName} 
                  onChange={(v) => handleInputChange('childName', v)}
                  placeholder="Nome da criança"
                />
                <EditableField 
                  label="Nascimento:" 
                  value={editedData.birthDate} 
                  onChange={(v) => handleInputChange('birthDate', v)}
                  placeholder="DD/MM/AAAA"
                />
              </div>
            </div>

            {/* Cláusula 2 - Objeto */}
            <EditableClauseSection title="DO OBJETO DO CONTRATO" clauseNumber={2} clauseKey="clauseObject" />

            {/* Cláusula 3 - Matrícula */}
            <EditableClauseSection title="DA MATRÍCULA" clauseNumber={3} clauseKey="clauseEnrollment">
              <div className="text-sm space-y-1 mb-2">
                <p><strong>Turma:</strong> {classTypeLabels[editedData.classType] || editedData.classType}</p>
                <p><strong>Turno:</strong> {shiftTypeLabels[editedData.shiftType] || editedData.shiftType} ({shiftHours[editedData.shiftType] || 'conforme contratado'})</p>
              </div>
            </EditableClauseSection>

            {/* Cláusula 4 - Mensalidades */}
            <EditableClauseSection title="DAS MENSALIDADES" clauseNumber={4} clauseKey="clauseMonthlyFee">
              <div className="text-sm space-y-1 mb-2">
                <p><strong>Plano Contratado:</strong> {editedData.planType ? planTypeLabels[editedData.planType] || editedData.planType : 'Conforme acordado'}</p>
                {monthlyValue && <p><strong>Valor Mensal:</strong> {monthlyValue}</p>}
              </div>
            </EditableClauseSection>

            {/* Cláusula 5 - Horário */}
            <EditableClauseSection title="DO HORÁRIO DE FUNCIONAMENTO" clauseNumber={5} clauseKey="clauseHours" />

            {/* Cláusula 6 - Alimentação */}
            <EditableClauseSection title="DA ALIMENTAÇÃO" clauseNumber={6} clauseKey="clauseFood" />

            {/* Cláusula 7 - Medicamentos */}
            <EditableClauseSection title="DA ADMINISTRAÇÃO DE MEDICAMENTOS" clauseNumber={7} clauseKey="clauseMedication" />

            {/* Cláusula 8 - Saúde */}
            <EditableClauseSection title="DA SAÚDE E SEGURANÇA" clauseNumber={8} clauseKey="clauseHealth">
              <div className="bg-muted/50 p-2 rounded mb-2">
                <EditableField 
                  label="Contato de Emergência:" 
                  value={editedData.emergencyContact || ''} 
                  onChange={(v) => handleInputChange('emergencyContact', v)}
                  placeholder="Nome (parentesco) - Telefone"
                />
              </div>
            </EditableClauseSection>

            {/* Cláusula 9 - Uniforme */}
            <EditableClauseSection title="DO UNIFORME E MATERIAIS" clauseNumber={9} clauseKey="clauseUniform" />

            {/* Cláusula 10 - Regulamento */}
            <EditableClauseSection title="DO REGULAMENTO INTERNO" clauseNumber={10} clauseKey="clauseRegulations" />

            {/* Cláusula 11 - Imagem */}
            <EditableClauseSection title="DO USO DE IMAGEM" clauseNumber={11} clauseKey="clauseImageRights" />

            {/* Cláusula 12 - Rescisão */}
            <EditableClauseSection title="DA RESCISÃO" clauseNumber={12} clauseKey="clauseTermination" />

            {/* Cláusula 13 - LGPD */}
            <EditableClauseSection title="DA PROTEÇÃO DE DADOS (LGPD)" clauseNumber={13} clauseKey="clauseLGPD" />

            {/* Cláusula 14 - Foro */}
            <EditableClauseSection title="DO FORO" clauseNumber={14} clauseKey="clauseForum" />

            {/* Cláusula 15 - Multa */}
            <EditableClauseSection title="DA MULTA POR RESCISÃO" clauseNumber={15} clauseKey="clausePenalty" />

            {/* Cláusula 16 - Redes Sociais */}
            <EditableClauseSection title="AUTORIZAÇÃO PARA REDES SOCIAIS" clauseNumber={16} clauseKey="clauseSocialMedia" />

            {/* Cláusula 17 - Validade */}
            <EditableClauseSection title="DA VALIDADE DO CONTRATO" clauseNumber={17} clauseKey="clauseValidity" />

            {/* Disposições Gerais */}
            <EditableClauseSection title="DISPOSIÇÕES GERAIS" clauseNumber={18} clauseKey="clauseGeneral" />

            <div className="mt-6 pt-4 border-t">
              <p className="text-center text-sm text-muted-foreground">
                Canoas/RS, {currentDate}
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {viewOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!viewOnly && (
            <Button onClick={handleRequestSend} disabled={sending || loading}>
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
          )}
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog - prevents accidental approvals */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Aprovação e Envio
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Você está prestes a <strong>APROVAR</strong> esta matrícula e enviar o contrato para assinatura.
              </p>
              <p className="text-amber-600 font-medium">
                Esta ação não pode ser desfeita facilmente. A criança será registrada como aluna imediatamente.
              </p>
              <p>
                Deseja realmente continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedSend} 
              disabled={sending}
              className="bg-primary hover:bg-primary/90"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Sim, Aprovar e Enviar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
