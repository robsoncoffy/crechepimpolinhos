import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Loader2, Plus, User, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
  onCreated: () => void;
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
  pipelineId,
  stages,
  onCreated,
}: CreateOpportunityDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    monetaryValue: "",
    stageId: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      monetaryValue: "",
      stageId: stages[0]?.id || "",
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da oportunidade.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.stageId) {
      toast({
        title: "Etapa obrigatória",
        description: "Selecione uma etapa do pipeline.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.functions.invoke("ghl-conversations", {
        body: {
          action: "createOpportunity",
          pipelineId,
          stageId: formData.stageId,
          name: formData.name,
          contactName: formData.contactName || undefined,
          contactEmail: formData.contactEmail || undefined,
          contactPhone: formData.contactPhone || undefined,
          monetaryValue: parseFloat(formData.monetaryValue) || 0,
        },
      });

      if (error) throw error;

      toast({
        title: "Oportunidade criada",
        description: "A nova oportunidade foi adicionada ao pipeline.",
      });

      onCreated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      toast({
        title: "Erro ao criar",
        description: "Não foi possível criar a oportunidade.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Oportunidade
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova oportunidade manualmente ao pipeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nome da Oportunidade *</Label>
            <Input
              id="create-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Matrícula João Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-stage">Etapa do Pipeline *</Label>
            <Select
              value={formData.stageId}
              onValueChange={(value) => setFormData({ ...formData, stageId: value })}
            >
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

          <div className="space-y-2">
            <Label htmlFor="create-value">Valor (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="create-value"
                type="number"
                value={formData.monetaryValue}
                onChange={(e) => setFormData({ ...formData, monetaryValue: e.target.value })}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Dados do Contato (opcional)</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="create-contact-name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="create-contact-name"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="pl-9"
                    placeholder="Nome do contato"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-contact-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="create-contact-email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="pl-9"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-contact-phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="create-contact-phone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="pl-9"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Criar Oportunidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
