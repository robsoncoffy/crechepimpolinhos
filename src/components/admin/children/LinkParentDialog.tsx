import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Child = Database["public"]["Tables"]["children"]["Row"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
  availableParents: Profile[];
  onSuccess: () => void;
}

interface LinkData {
  parent_id: string;
  relationship: string;
}

export const LinkParentDialog = memo(function LinkParentDialog({
  open,
  onOpenChange,
  child,
  availableParents,
  onSuccess,
}: LinkParentDialogProps) {
  const [formLoading, setFormLoading] = useState(false);
  const [multiLinkData, setMultiLinkData] = useState<LinkData[]>([
    { parent_id: "", relationship: "responsável" }
  ]);

  const addGuardianRow = () => {
    setMultiLinkData([...multiLinkData, { parent_id: "", relationship: "responsável" }]);
  };

  const removeGuardianRow = (index: number) => {
    if (multiLinkData.length > 1) {
      setMultiLinkData(multiLinkData.filter((_, i) => i !== index));
    }
  };

  const updateGuardianRow = (index: number, field: 'parent_id' | 'relationship', value: string) => {
    const updated = [...multiLinkData];
    updated[index][field] = value;
    setMultiLinkData(updated);
  };

  const getFilteredParents = (currentIndex: number) => {
    const selectedInOtherRows = multiLinkData
      .filter((_, i) => i !== currentIndex)
      .map((link) => link.parent_id)
      .filter(Boolean);
    return availableParents.filter((p) => !selectedInOtherRows.includes(p.user_id));
  };

  const handleLinkParent = async () => {
    if (!child) return;

    const validLinks = multiLinkData.filter((link) => link.parent_id);
    
    if (validLinks.length === 0) {
      toast.error("Selecione ao menos um responsável");
      return;
    }

    setFormLoading(true);
    try {
      const insertData = validLinks.map((link) => ({
        child_id: child.id,
        parent_id: link.parent_id,
        relationship: link.relationship,
      }));

      const { error } = await supabase.from("parent_children").insert(insertData);

      if (error) throw error;

      toast.success(
        validLinks.length === 1
          ? "Responsável vinculado com sucesso!"
          : `${validLinks.length} responsáveis vinculados com sucesso!`
      );
      onOpenChange(false);
      setMultiLinkData([{ parent_id: "", relationship: "responsável" }]);
      onSuccess();
    } catch (error: any) {
      console.error("Error linking parent:", error);
      toast.error(error.message || "Erro ao vincular responsável");
    } finally {
      setFormLoading(false);
    }
  };

  if (availableParents.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Responsáveis</DialogTitle>
            <DialogDescription>
              Vincule um ou mais responsáveis à criança {child?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Todos os responsáveis disponíveis já estão vinculados a esta criança.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular Responsáveis</DialogTitle>
          <DialogDescription>
            Vincule um ou mais responsáveis à criança {child?.full_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {multiLinkData.map((link, index) => {
            const filteredParents = getFilteredParents(index);
            return (
              <div key={index} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Label>Responsável</Label>
                  <Select 
                    value={link.parent_id} 
                    onValueChange={(v) => updateGuardianRow(index, 'parent_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredParents.map((parent) => (
                        <SelectItem key={parent.user_id} value={parent.user_id}>
                          {parent.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36 space-y-2">
                  <Label>Relacionamento</Label>
                  <Select
                    value={link.relationship}
                    onValueChange={(v) => updateGuardianRow(index, 'relationship', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mãe">Mãe</SelectItem>
                      <SelectItem value="pai">Pai</SelectItem>
                      <SelectItem value="avô">Avô</SelectItem>
                      <SelectItem value="avó">Avó</SelectItem>
                      <SelectItem value="responsável">Responsável</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {multiLinkData.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeGuardianRow(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
          
          {(() => {
            const selectedCount = multiLinkData.filter((l) => l.parent_id).length;
            const canAddMore = selectedCount < availableParents.length;
            return canAddMore && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addGuardianRow}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar outro responsável
              </Button>
            );
          })()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLinkParent} 
            disabled={formLoading || multiLinkData.every((l) => !l.parent_id)}
          >
            {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
