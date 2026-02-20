import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Teacher, ClassType, ShiftType } from "./types";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";

interface AssignClassDialogProps {
    teacher: Teacher | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    assignmentData: {
        class_type: ClassType | "";
        shift_type: ShiftType | "";
        is_primary: boolean;
    };
    setAssignmentData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
}

export function AssignClassDialog({
    teacher,
    isOpen,
    onOpenChange,
    assignmentData,
    setAssignmentData,
    onSubmit,
    isPending,
}: AssignClassDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Atribuir Turma</DialogTitle>
                    <DialogDescription>
                        Vincule {teacher?.full_name} a uma turma específica
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Turma</Label>
                            <Select
                                value={assignmentData.class_type}
                                onValueChange={(v) =>
                                    setAssignmentData({ ...assignmentData, class_type: v as ClassType })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a turma" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(classTypeLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Turno</Label>
                            <Select
                                value={assignmentData.shift_type}
                                onValueChange={(v) =>
                                    setAssignmentData({ ...assignmentData, shift_type: v as ShiftType })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o turno" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(shiftTypeLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_primary"
                                checked={assignmentData.is_primary}
                                onCheckedChange={(checked) =>
                                    setAssignmentData({ ...assignmentData, is_primary: checked === true })
                                }
                            />
                            <Label htmlFor="is_primary" className="font-normal">
                                Professor(a) Principal da Turma
                            </Label>
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
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
