import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, UserCheck, GraduationCap } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Teacher, ClassType, ShiftType } from "@/components/admin/teachers/types";
import { TeacherTable } from "@/components/admin/teachers/TeacherTable";
import { CreateTeacherDialog } from "@/components/admin/teachers/CreateTeacherDialog";
import { AssignClassDialog } from "@/components/admin/teachers/AssignClassDialog";

export default function AdminTeachers() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

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

  // Fetch teachers
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const { data: teacherRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (rolesError) throw rolesError;
      if (!teacherRoles || teacherRoles.length === 0) return [];

      const userIds = teacherRoles.map((r) => r.user_id);

      const [profilesResponse, assignmentsResponse] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", userIds),
        supabase.from("teacher_assignments").select("*").in("user_id", userIds)
      ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (assignmentsResponse.error) throw assignmentsResponse.error;

      return profilesResponse.data.map((profile) => ({
        ...profile,
        assignment: assignmentsResponse.data?.find((a) => a.user_id === profile.user_id) || null,
      })) as Teacher[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
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
        await supabase
          .from("profiles")
          .update({
            phone: formData.phone,
            status: "approved",
          })
          .eq("user_id", authData.user.id);

        await supabase
          .from("user_roles")
          .update({ role: "teacher" })
          .eq("user_id", authData.user.id);
      }
    },
    onSuccess: () => {
      toast.success("Professor cadastrado com sucesso!");
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", phone: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar professor");
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("teacher_assignments").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "teacher");
    },
    onSuccess: () => {
      toast.success("Professor removido com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedTeacher(null);
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
    },
    onError: () => {
      toast.error("Erro ao remover professor");
    }
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacher || !assignmentData.class_type || !assignmentData.shift_type) {
        throw new Error("Selecione a turma e o turno");
      }

      const { data: existing } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("user_id", selectedTeacher.user_id)
        .single();

      if (existing) {
        await supabase
          .from("teacher_assignments")
          .update({
            class_type: assignmentData.class_type as ClassType,
            shift_type: assignmentData.shift_type as ShiftType,
            is_primary: assignmentData.is_primary,
          })
          .eq("user_id", selectedTeacher.user_id);
      } else {
        await supabase.from("teacher_assignments").insert({
          user_id: selectedTeacher.user_id,
          class_type: assignmentData.class_type as ClassType,
          shift_type: assignmentData.shift_type as ShiftType,
          is_primary: assignmentData.is_primary,
        });
      }
    },
    onSuccess: () => {
      toast.success("Turma atribuída com sucesso!");
      setAssignDialogOpen(false);
      setSelectedTeacher(null);
      setAssignmentData({ class_type: "", shift_type: "", is_primary: false });
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atribuir turma");
    }
  });

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    assignMutation.mutate();
  };

  const openAssignDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setAssignmentData({
      class_type: teacher.assignment?.class_type || "",
      shift_type: teacher.assignment?.shift_type || "",
      is_primary: teacher.assignment?.is_primary || false,
    });
    setAssignDialogOpen(true);
  };

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
        <CreateTeacherDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateTeacher}
          isPending={createMutation.isPending}
        />
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
          <TeacherTable
            teachers={teachers}
            isLoading={isLoading}
            onAssign={openAssignDialog}
            onDelete={(teacher) => {
              setSelectedTeacher(teacher);
              setDeleteDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Assign Class Dialog */}
      <AssignClassDialog
        teacher={selectedTeacher}
        isOpen={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        assignmentData={assignmentData}
        setAssignmentData={setAssignmentData}
        onSubmit={handleAssignTeacher}
        isPending={assignMutation.isPending}
      />

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
              onClick={() => selectedTeacher && deleteMutation.mutate(selectedTeacher.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
