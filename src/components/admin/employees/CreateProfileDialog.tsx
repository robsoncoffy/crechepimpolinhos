import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { StaffMember } from "./types";

interface CreateProfileDialogProps {
    employee: StaffMember | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    formData: {
        salary: string;
        net_salary: string;
        salary_payment_day: string;
    };
    setFormData: (data: any) => void;
    onCreate: () => void;
    isPending: boolean;
}

const roleLabels: Record<string, string> = {
    admin: "Administrador",
    teacher: "Professor(a)",
    nutritionist: "Nutricionista",
    cook: "Cozinheira",
    pedagogue: "Pedagoga",
    auxiliar: "Auxiliar",
};

export function CreateProfileDialog({
    employee,
    isOpen,
    onOpenChange,
    formData,
    setFormData,
    onCreate,
    isPending,
}: CreateProfileDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vincular Perfil de Funcionário</DialogTitle>
                    <DialogDescription>
                        Crie o perfil de funcionário para {employee?.full_name} e adicione as informações salariais
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={employee?.avatar_url || undefined} />
                                <AvatarFallback>
                                    {employee?.full_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{employee?.full_name}</p>
                                <Badge variant="outline" className="text-xs">
                                    {roleLabels[employee?.role || ""] || "Funcionário"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link_salary">Salário Bruto (R$)</Label>
                        <Input
                            id="link_salary"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={formData.salary}
                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link_net_salary">Salário Líquido (R$)</Label>
                        <Input
                            id="link_net_salary"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={formData.net_salary}
                            onChange={(e) => setFormData({ ...formData, net_salary: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link_salary_payment_day">Dia do Pagamento</Label>
                        <Input
                            id="link_salary_payment_day"
                            type="number"
                            min="1"
                            max="31"
                            value={formData.salary_payment_day}
                            onChange={(e) => setFormData({ ...formData, salary_payment_day: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={onCreate} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Vincular Perfil
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
