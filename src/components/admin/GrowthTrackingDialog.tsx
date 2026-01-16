import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Loader2, Scale, Ruler } from "lucide-react";

interface GrowthTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  onSuccess?: () => void;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function GrowthTrackingDialog({
  open,
  onOpenChange,
  childId,
  childName,
  onSuccess,
}: GrowthTrackingDialogProps) {
  const currentDate = new Date();
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    weight: "",
    height: "",
    observations: "",
  });

  // Check if there's an existing record for this month/year
  useEffect(() => {
    if (!open || !childId) return;

    const checkExisting = async () => {
      const { data } = await supabase
        .from("monthly_tracking")
        .select("*")
        .eq("child_id", childId)
        .eq("month", formData.month)
        .eq("year", formData.year)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setFormData({
          month: data.month,
          year: data.year,
          weight: data.weight?.toString() || "",
          height: data.height?.toString() || "",
          observations: data.observations || "",
        });
      } else {
        setExistingId(null);
        setFormData((prev) => ({
          ...prev,
          weight: "",
          height: "",
          observations: "",
        }));
      }
    };

    checkExisting();
  }, [open, childId, formData.month, formData.year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trackingData = {
        child_id: childId,
        month: formData.month,
        year: formData.year,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        observations: formData.observations || null,
      };

      if (existingId) {
        const { error } = await supabase
          .from("monthly_tracking")
          .update(trackingData)
          .eq("id", existingId);

        if (error) throw error;
        toast.success("Medições atualizadas com sucesso!");
      } else {
        const { error } = await supabase
          .from("monthly_tracking")
          .insert(trackingData);

        if (error) throw error;
        toast.success("Medições registradas com sucesso!");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving growth tracking:", error);
      toast.error(error.message || "Erro ao salvar medições");
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Registrar Medições
          </DialogTitle>
          <DialogDescription>
            Registre as medições mensais de {childName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Month/Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, month: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, year: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {existingId && (
              <div className="p-3 bg-pimpo-yellow/10 rounded-lg text-sm text-pimpo-yellow">
                Já existe um registro para este mês. Os dados serão atualizados.
              </div>
            )}

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-pimpo-blue" />
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                max="50"
                placeholder="Ex: 12.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height" className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-pimpo-green" />
                Altura (cm)
              </Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                min="0"
                max="200"
                placeholder="Ex: 85.0"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              />
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações sobre o desenvolvimento..."
                value={formData.observations}
                onChange={(e) =>
                  setFormData({ ...formData, observations: e.target.value })
                }
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existingId ? "Atualizar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
