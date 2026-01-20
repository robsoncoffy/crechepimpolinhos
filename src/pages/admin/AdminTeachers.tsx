import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash2, Loader2, UserCheck, Phone, GraduationCap } from "lucide-react";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface TeacherAssignment {
  id: string;
  user_id: string;
  class_type: ClassType;
  shift_type: ShiftType;
  is_primary: boolean;
}

interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  email?: string;
  assignment?: TeacherAssignment | null;
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [assignmentData, setAssignmentData] = useState({
    class_type: "" as ClassType | "",
    shift_type: "" as ShiftType | "",
    is_primary: false,
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      // Get all users with teacher role
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (!teacherRoles || teacherRoles.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      const userIds = teacherRoles.map((r) => r.user_id);

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      // Get assignments for these users
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("*")
        .in("user_id", userIds);

      if (profiles) {
        const teachersWithAssignments = profiles.map((profile) => ({
          ...profile,
          assignment: assignments?.find((a) => a.user_id === profile.user_id) || null,
        }));
        setTeachers(teachersWithAssignments);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Erro ao carregar professores");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with phone
        await supabase
          .from("profiles")
          .update({
            phone: formData.phone,
            status: "approved",
          })
          .eq("user_id", authData.user.id);

        // Change role from parent to teacher
        await supabase
          .from("user_roles")
          .update({ role: "teacher" })
          .eq("user_id", authData.user.id);
      }

      toast.success("Professor cadastrado com sucesso!");
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", phone: "", password: "" });
      fetchTeachers();
    } catch (error: any) {
      console.error("Error creating teacher:", error);
      toast.error(error.message || "Erro ao cadastrar professor");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteTeacher() {
    if (!selectedTeacher) return;

    try {
      // Remove teacher assignment first
      await supabase
        .from("teacher_assignments")
        .delete()
        .eq("user_id", selectedTeacher.user_id);

      // Remove teacher role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedTeacher.user_id)
        .eq("role", "teacher");

      toast.success("Professor removido com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedTeacher(null);
      fetchTeachers();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("Erro ao remover professor");
    }
  }

  async function handleAssignTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacher || !assignmentData.class_type || !assignmentData.shift_type) {
      toast.error("Selecione a turma e o turno");
      return;
    }

    setAssignLoading(true);
    try {
      // Check if assignment exists
      const { data: existing } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("user_id", selectedTeacher.user_id)
        .single();

      if (existing) {
        // Update existing assignment
        await supabase
          .from("teacher_assignments")
          .update({
            class_type: assignmentData.class_type as ClassType,
            shift_type: assignmentData.shift_type as ShiftType,
            is_primary: assignmentData.is_primary,
          })
          .eq("user_id", selectedTeacher.user_id);
      } else {
        // Create new assignment
        await supabase.from("teacher_assignments").insert({
          user_id: selectedTeacher.user_id,
          class_type: assignmentData.class_type as ClassType,
          shift_type: assignmentData.shift_type as ShiftType,
          is_primary: assignmentData.is_primary,
        });
      }

      toast.success("Turma atribuída com sucesso!");
      setAssignDialogOpen(false);
      setSelectedTeacher(null);
      setAssignmentData({ class_type: "", shift_type: "", is_primary: false });
      fetchTeachers();
    } catch (error) {
      console.error("Error assigning teacher:", error);
      toast.error("Erro ao atribuir turma");
    } finally {
      setAssignLoading(false);
    }
  }

  function openAssignDialog(teacher: Teacher) {
    setSelectedTeacher(teacher);
    setAssignmentData({
      class_type: teacher.assignment?.class_type || "",
      shift_type: teacher.assignment?.shift_type || "",
      is_primary: teacher.assignment?.is_primary || false,
    });
    setAssignDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const assignedTeachers = teachers.filter((t) => t.assignment);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
            Professores
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a equipe de professores e atribua turmas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Professor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Professor</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma conta de professor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeacher}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(51) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{teachers.length}</p>
              <p className="text-sm text-muted-foreground">Total de Professores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-green/10">
              <UserCheck className="w-6 h-6 text-pimpo-green" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">
                {teachers.filter((t) => t.status === "approved").length}
              </p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-blue/10">
              <GraduationCap className="w-6 h-6 text-pimpo-blue" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{assignedTeachers.length}</p>
              <p className="text-sm text-muted-foreground">Com Turma Atribuída</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Lista de professores e suas turmas atribuídas</CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Nenhum professor cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Clique no botão acima para adicionar
              </p>
            </div>
          ) : (
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
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {teacher.full_name.charAt(0).toUpperCase()}
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
                          onClick={() => openAssignDialog(teacher)}
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
                      {new Date(teacher.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {teacher.assignment && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAssignDialog(teacher)}
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Class Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Turma</DialogTitle>
            <DialogDescription>
              Vincule {selectedTeacher?.full_name} a uma turma específica
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignTeacher}>
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
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={assignLoading}>
                {assignLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Professor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedTeacher?.full_name} da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeacher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
