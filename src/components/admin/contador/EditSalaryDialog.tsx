import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditSalaryDialogProps {
  employee: {
    id: string;
    full_name: string;
    salary: number | null;
    net_salary: number | null;
    salary_payment_day: number | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSalaryDialog({ employee, open, onOpenChange, onSuccess }: EditSalaryDialogProps) {
  const [salary, setSalary] = useState("");
  const [netSalary, setNetSalary] = useState("");
  const [paymentDay, setPaymentDay] = useState("5");
  const [loading, setLoading] = useState(false);

  // Reset form when employee changes
  useEffect(() => {
    if (employee && open) {
      setSalary(employee.salary?.toString() || "");
      setNetSalary(employee.net_salary?.toString() || "");
      setPaymentDay(employee.salary_payment_day?.toString() || "5");
    }
  }, [employee, open]);

  const handleSave = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("employee_profiles")
        .update({
          salary: salary ? parseFloat(salary) : null,
          net_salary: netSalary ? parseFloat(netSalary) : null,
          salary_payment_day: paymentDay ? parseInt(paymentDay) : null,
        })
        .eq("id", employee.id);

      if (error) throw error;

      toast.success("Salário atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating salary:", error);
      toast.error("Erro ao atualizar salário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Salário - {employee?.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="salary">Salário Bruto (R$)</Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="netSalary">Salário Líquido (R$)</Label>
            <Input
              id="netSalary"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={netSalary}
              onChange={(e) => setNetSalary(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentDay">Dia de Pagamento</Label>
            <Input
              id="paymentDay"
              type="number"
              min="1"
              max="31"
              placeholder="5"
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
