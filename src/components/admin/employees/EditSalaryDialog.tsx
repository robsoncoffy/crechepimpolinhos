import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { StaffMember } from "./types";

interface EditSalaryDialogProps {
    employee: StaffMember | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    formData: {
        salary: string;
        net_salary: string;
        salary_payment_day: string;
    };
    setFormData: (data: any) => void;
    onSave: () => void;
    isPending: boolean;
}

export function EditSalaryDialog({
    employee,
    isOpen,
    onOpenChange,
    formData,
    setFormData,
    onSave,
    isPending,
}: EditSalaryDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Salário</DialogTitle>
                    <DialogDescription>
                        Atualize as informações salariais de {employee?.full_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="salary">Salário Bruto (R$)</Label>
                        <Input
                            id="salary"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={formData.salary}
                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="net_salary">Salário Líquido (R$)</Label>
                        <Input
                            id="net_salary"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={formData.net_salary}
                            onChange={(e) => setFormData({ ...formData, net_salary: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="salary_payment_day">Dia do Pagamento</Label>
                        <Input
                            id="salary_payment_day"
                            type="number"
                            min="1"
                            max="31"
                            value={formData.salary_payment_day}
                            onChange={(e) => setFormData({ ...formData, salary_payment_day: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Dia do mês em que o salário é pago (1-31)
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={onSave} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
