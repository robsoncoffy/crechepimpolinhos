import { useState, useEffect, useCallback, memo } from "react";
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
import { Loader2, FileText, Send, Pencil, ChevronDown, ChevronRight, AlertTriangle, Save, Building2 } from "lucide-react";
import { formatCPF, formatPhone } from "@/lib/formatters";

export interface MunicipalContractData {
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
  emergencyContact?: string;
  // Clause customizations for municipal contract
  clauseObject?: string;
  clauseConvenio?: string;
  clauseEnrollment?: string;
  clauseFrequency?: string;
  clauseHours?: string;
  clauseFood?: string;
  clauseMedication?: string;
  clauseUniform?: string;
  clauseHealth?: string;
  clauseRegulations?: string;
  clauseImageRights?: string;
  clauseLGPD?: string;
  clauseTermination?: string;
  clauseDigitalComm?: string;
  clauseForum?: string;
}

interface MunicipalContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractData: MunicipalContractData;
  onConfirmSend: (editedData: MunicipalContractData) => Promise<void>;
  onSaveChanges?: (editedData: MunicipalContractData) => Promise<void>;
  loading?: boolean;
  viewOnly?: boolean;
}

const COMPANY_DATA = {
  name: "CRECHE INFANTIL PIMPOLINHOS LTDA",
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
  manha: "08h00min às 12h30min",
  tarde: "13h00min às 18h00min",
  integral: "07h00min às 19h00min",
};

// Default clause texts for MUNICIPAL contract
const DEFAULT_MUNICIPAL_CLAUSES = {
  clauseObject: `O presente contrato tem por objeto a prestação de serviços educacionais e de cuidados infantis, em conformidade com a Lei nº 9.394/1996 (Lei de Diretrizes e Bases da Educação Nacional), normas da Secretaria Municipal de Educação de Canoas/RS e demais legislações aplicáveis à Educação Infantil.

Os serviços compreendem atividades pedagógicas, recreativas, de socialização, cuidados básicos, higiene, alimentação e repouso, respeitando a faixa etária da criança.`,

  clauseConvenio: `2.1. O atendimento prestado ao(à) aluno(a) é realizado por meio de convênio firmado entre a CONTRATADA e o Município de Canoas/RS, sendo o custeio financeiro de responsabilidade do Município, enquanto vigente o referido convênio.

2.2. Não haverá cobrança de mensalidade ao responsável legal, desde que mantidas as condições estabelecidas pelo convênio e pela Secretaria Municipal de Educação.

2.3. A vaga do(a) aluno(a) está condicionada:
a) à vigência do convênio com o Município;
b) ao cumprimento deste contrato e do Regulamento Interno;
c) à frequência regular da criança.`,

  clauseEnrollment: `3.1. A matrícula é pessoal e intransferível e assegura a vaga do(a) aluno(a) na turma correspondente à sua faixa etária.

3.2. A efetivação da matrícula ocorrerá mediante assinatura deste contrato e entrega da documentação exigida pela instituição e pela SME.`,

  clauseFrequency: `4.1. O(a) aluno(a) deverá frequentar regularmente a instituição, conforme critérios definidos pelo convênio municipal.

4.2. Faltas excessivas, sem justificativa formal, poderão resultar na perda da vaga, conforme normas da Secretaria Municipal de Educação.`,

  clauseHours: `5.1. O horário de funcionamento da instituição é:
• Integral: das 7h às 19h;
• Meio Turno Manhã: das 8h às 12h30;
• Meio Turno Tarde: das 13h às 18h.

5.2. Será concedida tolerância máxima de 15 (quinze) minutos para a retirada da criança após o término do horário contratado.

5.3. Ultrapassado o período de tolerância, será aplicada multa de R$ 30,00 (trinta reais) a cada 15 (quinze) minutos de atraso, a ser paga pelo responsável legal.

5.4. Caso o atraso ultrapasse 01 (uma) hora, sem contato prévio ou justificativa plausível, a CONTRATADA poderá acionar o Conselho Tutelar, visando garantir a segurança e o bem-estar da criança.

5.5. Somente pais, responsáveis legais ou pessoas previamente autorizadas poderão retirar o(a) aluno(a).`,

  clauseFood: `6.1. A instituição fornecerá alimentação balanceada, elaborada e supervisionada por nutricionista.

6.2. Crianças com restrições alimentares deverão apresentar laudo médico e trazer sua alimentação identificada, quando necessário.`,

  clauseMedication: `7.1. Medicamentos somente serão administrados mediante apresentação de receita médica, contendo dosagem e horários.

7.2. Crianças com temperatura igual ou superior a 37,9°C não permanecerão na instituição, devendo o responsável providenciar a retirada imediata.`,

  clauseUniform: `8.1. O uso do uniforme é opcional, porém recomendado.

8.2. Materiais de uso pessoal (fraldas, lenços, pomadas, mamadeiras, fórmulas, entre outros) são de responsabilidade da família.`,

  clauseHealth: `9.1. Crianças com doenças contagiosas não deverão frequentar a instituição até liberação médica.`,

  clauseRegulations: `O responsável declara ter lido e concordado com o Regulamento Interno da Creche Infantil Pimpolinhos, que integra este contrato.`,

  clauseImageRights: `Fica autorizada a utilização da imagem e voz do(a) aluno(a) para fins pedagógicos e institucionais, sem fins lucrativos, respeitando a legislação vigente.`,

  clauseLGPD: `Os dados pessoais serão tratados conforme a Lei Geral de Proteção de Dados – LGPD (Lei nº 13.709/2018), exclusivamente para fins legais, administrativos e pedagógicos.`,

  clauseTermination: `13.1. O contrato poderá ser rescindido por qualquer das partes.

13.2. A CONTRATADA poderá rescindir o contrato nos casos de:
a) descumprimento das normas internas;
b) reiterados atrasos na retirada da criança;
c) omissão de informações relevantes;
d) encerramento ou suspensão do convênio com o Município.`,

  clauseDigitalComm: `As partes reconhecem como válidas as comunicações realizadas por WhatsApp, e-mail ou aplicativos institucionais.`,

  clauseForum: `Fica eleito o Foro da Comarca de Canoas/RS, com renúncia a qualquer outro.`,
};

// ==================== COMPONENTS DEFINED OUTSIDE ====================

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}

const EditableField = memo(function EditableField({ 
  label, 
  value, 
  onChange, 
  placeholder,
  type = "text",
  maxLength
}: EditableFieldProps) {
  return (
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
});

interface EditableClauseSectionProps {
  title: string;
  clauseNumber: number;
  clauseKey: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}

const EditableClauseSection = memo(function EditableClauseSection({
  title,
  clauseNumber,
  clauseKey,
  value,
  isOpen,
  onToggle,
  onChange,
  children,
}: EditableClauseSectionProps) {
  const displayValue = value || DEFAULT_MUNICIPAL_CLAUSES[clauseKey as keyof typeof DEFAULT_MUNICIPAL_CLAUSES] || '';
  
  return (
    <div className="bg-card p-4 rounded-lg border mb-4">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
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
          <p className="mt-2 text-sm whitespace-pre-line">{displayValue}</p>
        )}
        
        <CollapsibleContent className="mt-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder={`Texto da cláusula ${clauseNumber}...`}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

// ==================== MAIN COMPONENT ====================

export function MunicipalContractPreviewDialog({
  open,
  onOpenChange,
  contractData,
  onConfirmSend,
  onSaveChanges,
  loading = false,
  viewOnly = false,
}: MunicipalContractPreviewDialogProps) {
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<MunicipalContractData>(contractData);
  const [openClauses, setOpenClauses] = useState<Record<string, boolean>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset edited data when contract data changes
  useEffect(() => {
    setEditedData({
      ...contractData,
      clauseObject: contractData.clauseObject || DEFAULT_MUNICIPAL_CLAUSES.clauseObject,
      clauseConvenio: contractData.clauseConvenio || DEFAULT_MUNICIPAL_CLAUSES.clauseConvenio,
      clauseEnrollment: contractData.clauseEnrollment || DEFAULT_MUNICIPAL_CLAUSES.clauseEnrollment,
      clauseFrequency: contractData.clauseFrequency || DEFAULT_MUNICIPAL_CLAUSES.clauseFrequency,
      clauseHours: contractData.clauseHours || DEFAULT_MUNICIPAL_CLAUSES.clauseHours,
      clauseFood: contractData.clauseFood || DEFAULT_MUNICIPAL_CLAUSES.clauseFood,
      clauseMedication: contractData.clauseMedication || DEFAULT_MUNICIPAL_CLAUSES.clauseMedication,
      clauseUniform: contractData.clauseUniform || DEFAULT_MUNICIPAL_CLAUSES.clauseUniform,
      clauseHealth: contractData.clauseHealth || DEFAULT_MUNICIPAL_CLAUSES.clauseHealth,
      clauseRegulations: contractData.clauseRegulations || DEFAULT_MUNICIPAL_CLAUSES.clauseRegulations,
      clauseImageRights: contractData.clauseImageRights || DEFAULT_MUNICIPAL_CLAUSES.clauseImageRights,
      clauseLGPD: contractData.clauseLGPD || DEFAULT_MUNICIPAL_CLAUSES.clauseLGPD,
      clauseTermination: contractData.clauseTermination || DEFAULT_MUNICIPAL_CLAUSES.clauseTermination,
      clauseDigitalComm: contractData.clauseDigitalComm || DEFAULT_MUNICIPAL_CLAUSES.clauseDigitalComm,
      clauseForum: contractData.clauseForum || DEFAULT_MUNICIPAL_CLAUSES.clauseForum,
    });
    setOpenClauses({});
    setConfirmDialogOpen(false);
    setHasUnsavedChanges(false);
  }, [contractData]);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const handleInputChange = useCallback((field: keyof MunicipalContractData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const toggleClause = useCallback((clauseKey: string) => {
    setOpenClauses(prev => ({ ...prev, [clauseKey]: !prev[clauseKey] }));
  }, []);

  // Save changes without sending contract
  const handleSaveChanges = async () => {
    if (!onSaveChanges) return;
    setSaving(true);
    try {
      await onSaveChanges(editedData);
      setHasUnsavedChanges(false);
    } finally {
      setSaving(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-pimpo-blue" />
            Contrato Municipal - Convênio Prefeitura
          </DialogTitle>
          <DialogDescription>
            Clique nos campos ou cláusulas para editar diretamente
            {hasUnsavedChanges && (
              <span className="ml-2 text-amber-600 font-medium">• Alterações não salvas</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] border rounded-lg p-6 bg-muted/30">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-center font-bold text-lg mb-4">
              CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS E CUIDADOS INFANTIS
            </h2>
            <h3 className="text-center text-base mb-2">{COMPANY_DATA.name}</h3>
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-pimpo-blue/10 text-pimpo-blue rounded-full text-sm font-medium">
                <Building2 className="h-4 w-4" />
                CONVÊNIO PREFEITURA
              </span>
            </div>

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

            {/* Cláusula 2 - Objeto (Municipal) */}
            <EditableClauseSection 
              title="DO OBJETO" 
              clauseNumber={2} 
              clauseKey="clauseObject"
              value={editedData.clauseObject || ''}
              isOpen={openClauses.clauseObject || false}
              onToggle={() => toggleClause('clauseObject')}
              onChange={(v) => handleInputChange('clauseObject', v)}
            />

            {/* Cláusula 3 - Convênio e Custeio (Específico Municipal) */}
            <EditableClauseSection 
              title="DO CONVÊNIO E DO CUSTEIO" 
              clauseNumber={3} 
              clauseKey="clauseConvenio"
              value={editedData.clauseConvenio || ''}
              isOpen={openClauses.clauseConvenio || false}
              onToggle={() => toggleClause('clauseConvenio')}
              onChange={(v) => handleInputChange('clauseConvenio', v)}
            >
              <div className="p-3 bg-pimpo-blue/10 border border-pimpo-blue/20 rounded-lg mb-2">
                <p className="text-sm font-medium text-pimpo-blue flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vaga custeada pelo Município de Canoas/RS
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Não há cobrança de mensalidade ao responsável legal
                </p>
              </div>
            </EditableClauseSection>

            {/* Cláusula 4 - Matrícula */}
            <EditableClauseSection 
              title="DA MATRÍCULA" 
              clauseNumber={4} 
              clauseKey="clauseEnrollment"
              value={editedData.clauseEnrollment || ''}
              isOpen={openClauses.clauseEnrollment || false}
              onToggle={() => toggleClause('clauseEnrollment')}
              onChange={(v) => handleInputChange('clauseEnrollment', v)}
            >
              <div className="text-sm space-y-1 mb-2">
                <p><strong>Turma:</strong> {classTypeLabels[editedData.classType] || editedData.classType}</p>
                <p><strong>Turno:</strong> {shiftTypeLabels[editedData.shiftType] || editedData.shiftType} ({shiftHours[editedData.shiftType] || 'conforme contratado'})</p>
              </div>
            </EditableClauseSection>

            {/* Cláusula 5 - Frequência e Perda da Vaga */}
            <EditableClauseSection 
              title="DA FREQUÊNCIA E PERDA DA VAGA" 
              clauseNumber={5} 
              clauseKey="clauseFrequency"
              value={editedData.clauseFrequency || ''}
              isOpen={openClauses.clauseFrequency || false}
              onToggle={() => toggleClause('clauseFrequency')}
              onChange={(v) => handleInputChange('clauseFrequency', v)}
            />

            {/* Cláusula 6 - Horário e Pontualidade */}
            <EditableClauseSection 
              title="DO HORÁRIO E DA PONTUALIDADE" 
              clauseNumber={6} 
              clauseKey="clauseHours"
              value={editedData.clauseHours || ''}
              isOpen={openClauses.clauseHours || false}
              onToggle={() => toggleClause('clauseHours')}
              onChange={(v) => handleInputChange('clauseHours', v)}
            />

            {/* Cláusula 7 - Alimentação */}
            <EditableClauseSection 
              title="DA ALIMENTAÇÃO" 
              clauseNumber={7} 
              clauseKey="clauseFood"
              value={editedData.clauseFood || ''}
              isOpen={openClauses.clauseFood || false}
              onToggle={() => toggleClause('clauseFood')}
              onChange={(v) => handleInputChange('clauseFood', v)}
            />

            {/* Cláusula 8 - Medicamentos */}
            <EditableClauseSection 
              title="DA ADMINISTRAÇÃO DE MEDICAMENTOS" 
              clauseNumber={8} 
              clauseKey="clauseMedication"
              value={editedData.clauseMedication || ''}
              isOpen={openClauses.clauseMedication || false}
              onToggle={() => toggleClause('clauseMedication')}
              onChange={(v) => handleInputChange('clauseMedication', v)}
            />

            {/* Cláusula 9 - Uniforme e Materiais */}
            <EditableClauseSection 
              title="DO UNIFORME, MATERIAIS E PERTENCES" 
              clauseNumber={9} 
              clauseKey="clauseUniform"
              value={editedData.clauseUniform || ''}
              isOpen={openClauses.clauseUniform || false}
              onToggle={() => toggleClause('clauseUniform')}
              onChange={(v) => handleInputChange('clauseUniform', v)}
            />

            {/* Cláusula 10 - Saúde */}
            <EditableClauseSection 
              title="DA SAÚDE E SEGURANÇA" 
              clauseNumber={10} 
              clauseKey="clauseHealth"
              value={editedData.clauseHealth || ''}
              isOpen={openClauses.clauseHealth || false}
              onToggle={() => toggleClause('clauseHealth')}
              onChange={(v) => handleInputChange('clauseHealth', v)}
            >
              <div className="bg-muted/50 p-2 rounded mb-2">
                <EditableField 
                  label="Contato de Emergência:" 
                  value={editedData.emergencyContact || ''} 
                  onChange={(v) => handleInputChange('emergencyContact', v)}
                  placeholder="Nome (parentesco) - Telefone"
                />
              </div>
            </EditableClauseSection>

            {/* Cláusula 11 - Regulamento */}
            <EditableClauseSection 
              title="DO REGULAMENTO INTERNO" 
              clauseNumber={11} 
              clauseKey="clauseRegulations"
              value={editedData.clauseRegulations || ''}
              isOpen={openClauses.clauseRegulations || false}
              onToggle={() => toggleClause('clauseRegulations')}
              onChange={(v) => handleInputChange('clauseRegulations', v)}
            />

            {/* Cláusula 12 - Imagem */}
            <EditableClauseSection 
              title="DO USO DE IMAGEM" 
              clauseNumber={12} 
              clauseKey="clauseImageRights"
              value={editedData.clauseImageRights || ''}
              isOpen={openClauses.clauseImageRights || false}
              onToggle={() => toggleClause('clauseImageRights')}
              onChange={(v) => handleInputChange('clauseImageRights', v)}
            />

            {/* Cláusula 13 - LGPD */}
            <EditableClauseSection 
              title="DA PROTEÇÃO DE DADOS" 
              clauseNumber={13} 
              clauseKey="clauseLGPD"
              value={editedData.clauseLGPD || ''}
              isOpen={openClauses.clauseLGPD || false}
              onToggle={() => toggleClause('clauseLGPD')}
              onChange={(v) => handleInputChange('clauseLGPD', v)}
            />

            {/* Cláusula 14 - Rescisão */}
            <EditableClauseSection 
              title="DA RESCISÃO" 
              clauseNumber={14} 
              clauseKey="clauseTermination"
              value={editedData.clauseTermination || ''}
              isOpen={openClauses.clauseTermination || false}
              onToggle={() => toggleClause('clauseTermination')}
              onChange={(v) => handleInputChange('clauseTermination', v)}
            />

            {/* Cláusula 15 - Comunicações Digitais */}
            <EditableClauseSection 
              title="DAS COMUNICAÇÕES DIGITAIS" 
              clauseNumber={15} 
              clauseKey="clauseDigitalComm"
              value={editedData.clauseDigitalComm || ''}
              isOpen={openClauses.clauseDigitalComm || false}
              onToggle={() => toggleClause('clauseDigitalComm')}
              onChange={(v) => handleInputChange('clauseDigitalComm', v)}
            />

            {/* Cláusula 16 - Foro */}
            <EditableClauseSection 
              title="DO FORO" 
              clauseNumber={16} 
              clauseKey="clauseForum"
              value={editedData.clauseForum || ''}
              isOpen={openClauses.clauseForum || false}
              onToggle={() => toggleClause('clauseForum')}
              onChange={(v) => handleInputChange('clauseForum', v)}
            />

            <div className="mt-6 pt-4 border-t">
              <p className="text-center text-sm text-muted-foreground">
                Canoas/RS, {currentDate}
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending || saving}>
            {viewOnly ? "Fechar" : "Cancelar"}
          </Button>
          {onSaveChanges && (
            <Button 
              variant="secondary" 
              onClick={handleSaveChanges} 
              disabled={saving || sending || !hasUnsavedChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          )}
          {!viewOnly && (
            <Button onClick={handleRequestSend} disabled={sending || loading || saving}>
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
                Você está prestes a <strong>APROVAR</strong> esta matrícula municipal e enviar o contrato para assinatura.
              </p>
              <p className="text-pimpo-blue font-medium">
                Esta é uma vaga do convênio com a Prefeitura de Canoas.
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
