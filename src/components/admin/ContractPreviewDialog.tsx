import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Send } from "lucide-react";

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractData: {
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
  };
  onConfirmSend: () => Promise<void>;
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

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirmSend();
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
            Revise o contrato antes de enviar para assinatura digital via ZapSign
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

            <div className="bg-card p-4 rounded-lg border mb-4">
              <h4 className="font-semibold mb-2">CLÁUSULA 1 – DAS PARTES CONTRATANTES</h4>
              
              <p className="mb-2">
                <strong>CONTRATADA:</strong> {COMPANY_DATA.name}, pessoa jurídica de direito privado, 
                inscrita no CNPJ sob nº {COMPANY_DATA.cnpj}, com sede na {COMPANY_DATA.address}.
              </p>
              
              <p className="mb-2">
                <strong>CONTRATANTE:</strong> {contractData.parentName || '[Nome não informado]'}, 
                inscrito(a) no CPF sob nº {contractData.parentCpf || '[CPF não informado]'}
                {contractData.parentRg ? `, RG nº ${contractData.parentRg}` : ''}, 
                residente e domiciliado(a) em {contractData.address || 'Canoas/RS'}, 
                telefone: {contractData.parentPhone || '[Telefone não informado]'}, 
                e-mail: {contractData.parentEmail || '[Email não informado]'}.
              </p>
              
              <p>
                <strong>ALUNO(A):</strong> {contractData.childName}, nascido(a) em {contractData.birthDate}.
              </p>
            </div>

            <div className="bg-card p-4 rounded-lg border mb-4">
              <h4 className="font-semibold mb-2">CLÁUSULA 5 – DO HORÁRIO DE FUNCIONAMENTO</h4>
              <p className="mb-2">
                <strong>Turno:</strong> {shiftTypeLabels[contractData.shiftType] || contractData.shiftType} 
                ({shiftHours[contractData.shiftType] || 'conforme contratado'})
              </p>
              <p>
                <strong>Turma:</strong> {classTypeLabels[contractData.classType] || contractData.classType}
              </p>
            </div>

            <div className="bg-card p-4 rounded-lg border mb-4">
              <h4 className="font-semibold mb-2">CLÁUSULA 4 – DAS MENSALIDADES</h4>
              <p>
                <strong>Plano Contratado:</strong> {contractData.planType ? planTypeLabels[contractData.planType] || contractData.planType : 'Conforme acordado'}
              </p>
            </div>

            {contractData.emergencyContact && (
              <div className="bg-card p-4 rounded-lg border mb-4">
                <h4 className="font-semibold mb-2">CLÁUSULA 8 – DA SAÚDE E SEGURANÇA</h4>
                <p>
                  <strong>Contato de Emergência:</strong> {contractData.emergencyContact}
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
                Enviar para Assinatura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
