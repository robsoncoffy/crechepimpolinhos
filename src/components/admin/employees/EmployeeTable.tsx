import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Pencil, Link as LinkIcon, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";
import { StaffMember } from "./types";

interface EmployeeTableProps {
    staffMembers: StaffMember[];
    isLoading: boolean;
    onEdit: (employee: StaffMember) => void;
}

const roleLabels: Record<string, string> = {
    admin: "Administrador",
    teacher: "Professor(a)",
    nutritionist: "Nutricionista",
    cook: "Cozinheira",
    pedagogue: "Pedagoga",
    auxiliar: "Auxiliar",
};

export function EmployeeTable({ staffMembers, isLoading, onEdit }: EmployeeTableProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (staffMembers.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum funcionário cadastrado</p>
                <p className="text-sm">Use o botão "Convidar Funcionário" para adicionar membros da equipe</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Salário Bruto</TableHead>
                    <TableHead className="text-right">Salário Líquido</TableHead>
                    <TableHead className="text-center">Dia Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staffMembers.map((employee) => (
                    <TableRow key={employee.user_id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={employee.photo_url || employee.avatar_url || undefined} />
                                    <AvatarFallback>
                                        {employee.full_name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{employee.full_name}</p>
                                    <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs">
                                            {roleLabels[employee.role] || "Funcionário"}
                                        </Badge>
                                        {!employee.employee_profile_id && (
                                            <Badge variant="secondary" className="text-xs">
                                                Sem perfil
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{employee.job_title || "-"}</TableCell>
                        <TableCell className="text-right">
                            {employee.salary ? formatCurrency(employee.salary) : (
                                <span className="text-muted-foreground">Não informado</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            {employee.net_salary ? formatCurrency(employee.net_salary) : (
                                <span className="text-muted-foreground">Não informado</span>
                            )}
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Dia {employee.salary_payment_day || 5}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(employee)}
                            >
                                {employee.employee_profile_id ? (
                                    <Pencil className="h-4 w-4" />
                                ) : (
                                    <LinkIcon className="h-4 w-4" />
                                )}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
