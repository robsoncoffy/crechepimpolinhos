import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Baby, Trash2, Edit, Link2, GraduationCap, AlertTriangle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { classTypeLabels, shiftTypeLabels, calculateAge } from "@/lib/constants";
import { ChildPdfExport } from "@/components/admin/ChildPdfExport";
import { isClassMismatch, getSuggestedClassType } from "@/hooks/useChildren";

type Child = Database["public"]["Tables"]["children"]["Row"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface ParentChild {
  id: string;
  parent_id: string;
  child_id: string;
  relationship: string;
  profile?: Profile;
}

interface ChildTableProps {
  children: Child[];
  getChildParents: (childId: string) => ParentChild[];
  onEdit: (child: Child) => void;
  onLink: (child: Child) => void;
  onChangeClass: (child: Child) => void;
  onDelete: (child: Child) => void;
  onUnlinkParent: (linkId: string) => void;
}

export const ChildTable = memo(function ChildTable({
  children,
  getChildParents,
  onEdit,
  onLink,
  onChangeClass,
  onDelete,
  onUnlinkParent,
}: ChildTableProps) {
  if (children.length === 0) {
    return (
      <div className="text-center py-12">
        <Baby className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="font-semibold text-lg">Nenhuma criança encontrada</h3>
        <p className="text-muted-foreground mb-4">
          Tente ajustar os filtros de busca
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Idade</TableHead>
          <TableHead>Turma</TableHead>
          <TableHead>Turno</TableHead>
          <TableHead>Responsáveis</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {children.map((child) => {
          const childParents = getChildParents(child.id);
          return (
            <TableRow key={child.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Baby className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{child.full_name}</span>
                </div>
              </TableCell>
              <TableCell>{calculateAge(child.birth_date)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{classTypeLabels[child.class_type]}</Badge>
                  {isClassMismatch(child) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Turma sugerida: {classTypeLabels[getSuggestedClassType(child.birth_date)]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{shiftTypeLabels[child.shift_type]}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {childParents.length === 0 ? (
                    <span className="text-sm text-muted-foreground">-</span>
                  ) : (
                    childParents.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span>
                          {cp.profile?.full_name} ({cp.relationship})
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => onUnlinkParent(cp.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <ChildPdfExport child={child} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onChangeClass(child)}
                    title="Mudar Turma/Turno"
                  >
                    <GraduationCap className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLink(child)}
                    title="Vincular Responsável"
                  >
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(child)}
                    title="Editar Dados"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(child)}
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
});
