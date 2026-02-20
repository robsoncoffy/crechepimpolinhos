import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, GraduationCap, Trash2, Users, Loader2 } from "lucide-react";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import { Teacher } from "./types";

interface TeacherTableProps {
    teachers: Teacher[];
    isLoading: boolean;
    onAssign: (teacher: Teacher) => void;
    onDelete: (teacher: Teacher) => void;
}

export function TeacherTable({ teachers, isLoading, onAssign, onDelete }: TeacherTableProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (teachers.length === 0) {
        return (
            <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-semibold text-lg">Nenhum professor cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                    Clique no botão "Novo Professor" para adicionar
                </p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {teachers.map((teacher) => (
                    <TableRow key={teacher.id || teacher.user_id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                        {teacher.full_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">{teacher.full_name}</span>
                                    {teacher.assignment?.is_primary && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Principal
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {teacher.phone ? (
                                <span className="flex items-center gap-1 text-sm">
                                    <Phone className="w-3 h-3" />
                                    {teacher.phone}
                                </span>
                            ) : (
                                "-"
                            )}
                        </TableCell>
                        <TableCell>
                            {teacher.assignment ? (
                                <div className="flex flex-col gap-0.5">
                                    <Badge variant="outline" className="w-fit">
                                        {classTypeLabels[teacher.assignment.class_type]}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {shiftTypeLabels[teacher.assignment.shift_type]}
                                    </span>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-primary hover:text-primary"
                                    onClick={() => onAssign(teacher)}
                                >
                                    <GraduationCap className="w-4 h-4 mr-1" />
                                    Atribuir
                                </Button>
                            )}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant={teacher.status === "approved" ? "default" : "secondary"}
                                className={
                                    teacher.status === "approved"
                                        ? "bg-pimpo-green/10 text-pimpo-green border-pimpo-green/30"
                                        : ""
                                }
                            >
                                {teacher.status === "approved" ? "Ativo" : teacher.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                                {teacher.assignment && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onAssign(teacher)}
                                        title="Editar Atribuição"
                                    >
                                        <GraduationCap className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onDelete(teacher)}
                                    title="Remover Professor"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
