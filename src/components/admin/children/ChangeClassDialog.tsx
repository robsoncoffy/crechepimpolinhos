import { memo, useState, useEffect } from "react";
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
import { Loader2, AlertTriangle, Wand2 } from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";
import { classTypeLabels, shiftTypeLabels, calculateAge } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isClassMismatch, getSuggestedClassType } from "@/hooks/useChildren";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface ChangeClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
  onSuccess: () => void;
}

export const ChangeClassDialog = memo(function ChangeClassDialog({
  open,
  onOpenChange,
  child,
  onSuccess,
}: ChangeClassDialogProps) {
  const [formLoading, setFormLoading] = useState(false);
  const [newClassType, setNewClassType] = useState<ClassType>("bercario");
  const [newShiftType, setNewShiftType] = useState<ShiftType>("integral");

  useEffect(() => {
    if (child) {
      setNewClassType(child.class_type);
      setNewShiftType(child.shift_type);
    }
  }, [child]);

  const handleChangeClass = async () => {
    if (!child) return;

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          class_type: newClassType,
          shift_type: newShiftType,
        })
        .eq("id", child.id);

      if (error) throw error;

      toast.success("Turma atualizada com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error changing class:", error);
      toast.error(error.message || "Erro ao atualizar turma");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mudar Turma/Turno</DialogTitle>
          <DialogDescription>
            Altere a turma e o turno de {child?.full_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {child && isClassMismatch(child) && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Baseado na idade ({calculateAge(child.birth_date)}), a turma sugerida é{" "}
                  <strong>{classTypeLabels[getSuggestedClassType(child.birth_date)]}</strong>.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                  onClick={() => setNewClassType(getSuggestedClassType(child.birth_date))}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Usar turma sugerida
                </Button>
              </div>
            </div>
          )}
          
          {child && !isClassMismatch(child) && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                A criança está na turma correta para sua idade.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={newClassType} onValueChange={(v) => setNewClassType(v as ClassType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.class_type.map((type) => (
                  <SelectItem key={type} value={type}>
                    {classTypeLabels[type]}
                    {child && getSuggestedClassType(child.birth_date) === type && (
                      <span className="ml-2 text-xs text-muted-foreground">(sugerida)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Turno</Label>
            <Select value={newShiftType} onValueChange={(v) => setNewShiftType(v as ShiftType)}>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleChangeClass} disabled={formLoading}>
            {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
