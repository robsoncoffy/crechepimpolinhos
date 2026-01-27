import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

interface Opportunity {
  id: string;
  name: string;
  status: string;
  monetaryValue: number;
  pipelineStageId: string;
  assignedTo?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OpportunityDetailsDrawerProps {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  pipelineId: string;
  onUpdated: () => void;
}

export function OpportunityDetailsDrawer({
  opportunity,
  open,
  onOpenChange,
  stages,
  pipelineId,
  onUpdated,
}: OpportunityDetailsDrawerProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedValue, setEditedValue] = useState("");
  const [editedStageId, setEditedStageId] = useState("");

  // Initialize form when opportunity changes
  useState(() => {
    if (opportunity) {
      setEditedName(opportunity.name || "");
      setEditedValue(opportunity.monetaryValue?.toString() || "0");
      setEditedStageId(opportunity.pipelineStageId || "");
    }
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && opportunity) {
      setEditedName(opportunity.name || "");
      setEditedValue(opportunity.monetaryValue?.toString() || "0");
      setEditedStageId(opportunity.pipelineStageId || "");
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!opportunity) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke("ghl-conversations", {
        body: {
          action: "updateOpportunity",
          opportunityId: opportunity.id,
          pipelineId,
          name: editedName,
          monetaryValue: parseFloat(editedValue) || 0,
          stageId: editedStageId,
        },
      });

      if (error) throw error;

      toast({
        title: "Oportunidade atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      onUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: "won" | "lost" | "abandoned") => {
    if (!opportunity) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke("ghl-conversations", {
        body: {
          action: "updateOpportunityStatus",
          opportunityId: opportunity.id,
          status: newStatus,
        },
      });

      if (error) throw error;

      const statusLabels = {
        won: "Ganho",
        lost: "Perdido",
        abandoned: "Abandonado",
      };

      toast({
        title: `Oportunidade marcada como ${statusLabels[newStatus]}`,
      });

      onUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openWhatsApp = () => {
    if (!opportunity?.contact?.phone) return;
    
    // Format phone number for WhatsApp
    const phone = opportunity.contact.phone.replace(/\D/g, "");
    const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      abandoned: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    
    const labels: Record<string, string> = {
      open: "Em aberto",
      won: "Ganho",
      lost: "Perdido",
      abandoned: "Abandonado",
    };

    return (
      <Badge className={styles[status] || styles.open}>
        {labels[status] || status}
      </Badge>
    );
  };

  const currentStageName = stages.find(s => s.id === opportunity?.pipelineStageId)?.name || "Desconhecido";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes da Oportunidade
          </SheetTitle>
          <SheetDescription>
            Visualize e edite as informações da oportunidade
          </SheetDescription>
        </SheetHeader>

        {opportunity && (
          <div className="mt-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(opportunity.status)}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("won")}
                disabled={isUpdating || opportunity.status === "won"}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Marcar Ganho
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("lost")}
                disabled={isUpdating || opportunity.status === "lost"}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Marcar Perdido
              </Button>
              {opportunity.contact?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openWhatsApp}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              )}
            </div>

            <Separator />

            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="opp-name">Nome da Oportunidade</Label>
                <Input
                  id="opp-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Nome da oportunidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opp-value">Valor (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="opp-value"
                    type="number"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opp-stage">Etapa do Pipeline</Label>
                <Select value={editedStageId} onValueChange={setEditedStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages
                      .sort((a, b) => a.position - b.position)
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Contact Info (Read-only) */}
            {opportunity.contact && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Informações do Contato</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{opportunity.contact.name}</span>
                  </div>
                  
                  {opportunity.contact.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a 
                        href={`mailto:${opportunity.contact.email}`}
                        className="hover:underline text-primary"
                      >
                        {opportunity.contact.email}
                      </a>
                    </div>
                  )}
                  
                  {opportunity.contact.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{opportunity.contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Criado em: {formatDate(opportunity.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Atualizado em: {formatDate(opportunity.updatedAt)}</span>
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
