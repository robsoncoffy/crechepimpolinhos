import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2 } from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface ChildFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
  onSuccess: () => void;
}

interface FormData {
  full_name: string;
  birth_date: string;
  class_type: ClassType;
  shift_type: ShiftType;
  allergies: string;
  medical_info: string;
  pediatrician_name: string;
  pediatrician_phone: string;
  authorized_pickups: string;
}

const defaultFormData: FormData = {
  full_name: "",
  birth_date: "",
  class_type: "bercario",
  shift_type: "integral",
  allergies: "",
  medical_info: "",
  pediatrician_name: "",
  pediatrician_phone: "",
  authorized_pickups: "",
};

export const ChildFormDialog = memo(function ChildFormDialog({
  open,
  onOpenChange,
  child,
  onSuccess,
}: ChildFormDialogProps) {
  const editMode = !!child;
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => {
    if (child) {
      return {
        full_name: child.full_name,
        birth_date: child.birth_date,
        class_type: child.class_type,
        shift_type: child.shift_type,
        allergies: child.allergies || "",
        medical_info: child.medical_info || "",
        pediatrician_name: child.pediatrician_name || "",
        pediatrician_phone: child.pediatrician_phone || "",
        authorized_pickups: child.authorized_pickups?.join(", ") || "",
      };
    }
    return defaultFormData;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const childData = {
        full_name: formData.full_name,
        birth_date: formData.birth_date,
        class_type: formData.class_type,
        shift_type: formData.shift_type,
        allergies: formData.allergies || null,
        medical_info: formData.medical_info || null,
        pediatrician_name: formData.pediatrician_name || null,
        pediatrician_phone: formData.pediatrician_phone || null,
        authorized_pickups: formData.authorized_pickups
          ? formData.authorized_pickups.split(",").map((s) => s.trim())
          : null,
      };

      if (editMode && child) {
        const { error } = await supabase
          .from("children")
          .update(childData)
          .eq("id", child.id);

        if (error) throw error;
        toast.success("Criança atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("children").insert(childData);

        if (error) throw error;
        toast.success("Criança cadastrada com sucesso!");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving child:", error);
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Editar Criança" : "Cadastrar Criança"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Atualize os dados da criança"
              : "Preencha os dados para matricular uma nova criança"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento *</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) =>
                    setFormData({ ...formData, birth_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turma *</Label>
                <Select
                  value={formData.class_type}
                  onValueChange={(value: ClassType) =>
                    setFormData({ ...formData, class_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.class_type.map((type) => (
                      <SelectItem key={type} value={type}>
                        {classTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turno *</Label>
                <Select
                  value={formData.shift_type}
                  onValueChange={(value: ShiftType) =>
                    setFormData({ ...formData, shift_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.shift_type.map((type) => (
                      <SelectItem key={type} value={type}>
                        {shiftTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) =>
                  setFormData({ ...formData, allergies: e.target.value })
                }
                placeholder="Descreva alergias alimentares, medicamentosas, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical_info">Informações Médicas</Label>
              <Textarea
                id="medical_info"
                value={formData.medical_info}
                onChange={(e) =>
                  setFormData({ ...formData, medical_info: e.target.value })
                }
                placeholder="Medicações de uso contínuo, condições especiais, etc."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pediatrician_name">Nome do Pediatra</Label>
                <Input
                  id="pediatrician_name"
                  value={formData.pediatrician_name}
                  onChange={(e) =>
                    setFormData({ ...formData, pediatrician_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pediatrician_phone">Telefone do Pediatra</Label>
                <Input
                  id="pediatrician_phone"
                  value={formData.pediatrician_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, pediatrician_phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_pickups">
                Pessoas Autorizadas a Buscar (separadas por vírgula)
              </Label>
              <Input
                id="authorized_pickups"
                value={formData.authorized_pickups}
                onChange={(e) =>
                  setFormData({ ...formData, authorized_pickups: e.target.value })
                }
                placeholder="Maria Silva, João Santos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editMode ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
