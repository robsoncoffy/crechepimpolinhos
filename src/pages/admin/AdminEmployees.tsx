import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, DollarSign, UserPlus, Link as LinkIcon } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

import { StaffMember } from "@/components/admin/employees/types";
import { EmployeeTable } from "@/components/admin/employees/EmployeeTable";
import { EditSalaryDialog } from "@/components/admin/employees/EditSalaryDialog";
import { CreateProfileDialog } from "@/components/admin/employees/CreateProfileDialog";
import { Link } from "react-router-dom";

const STAFF_ROLES: ("admin" | "teacher" | "cook" | "nutritionist" | "pedagogue" | "auxiliar")[] = ['admin', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar'];

export default function AdminEmployees() {
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<StaffMember | null>(null);
  const [linkingEmployee, setLinkingEmployee] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    salary: "",
    net_salary: "",
    salary_payment_day: "5",
  });

  // Fetch staff members with their employee profiles
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ["staff-members-with-salaries"],
    queryFn: async () => {
      // Get all staff roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", STAFF_ROLES);

      if (rolesError) throw rolesError;

      // Get unique user IDs
      const userIds = [...new Set(roles?.map((r) => r.user_id) || [])];

      if (userIds.length === 0) return [];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Get employee profiles for these users
      const { data: employeeProfiles, error: empError } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, job_title, photo_url, salary, net_salary, salary_payment_day, hire_date")
        .in("user_id", userIds);

      if (empError) throw empError;

      // Create a map of user_id to primary role (prioritize non-admin roles)
      const userRoleMap = new Map<string, string>();
      roles?.forEach((r) => {
        const existing = userRoleMap.get(r.user_id);
        if (!existing || (existing === 'admin' && r.role !== 'admin')) {
          userRoleMap.set(r.user_id, r.role);
        }
      });

      // Merge data
      const staffList: StaffMember[] = [];
      const processedUserIds = new Set<string>();

      userIds.forEach((userId) => {
        if (processedUserIds.has(userId)) return;
        processedUserIds.add(userId);

        const profile = profiles?.find((p) => p.user_id === userId);
        const empProfile = employeeProfiles?.find((ep) => ep.user_id === userId);
        const role = userRoleMap.get(userId) || 'admin';

        staffList.push({
          user_id: userId,
          full_name: empProfile?.full_name || profile?.full_name || "Sem nome",
          avatar_url: profile?.avatar_url || null,
          role,
          employee_profile_id: empProfile?.id || null,
          job_title: empProfile?.job_title || null,
          photo_url: empProfile?.photo_url || null,
          salary: empProfile?.salary || null,
          net_salary: empProfile?.net_salary || null,
          salary_payment_day: empProfile?.salary_payment_day || null,
          hire_date: empProfile?.hire_date || null,
        });
      });

      return staffList.sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  // Update salary mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async (data: { id: string; salary: number | null; net_salary: number | null; salary_payment_day: number }) => {
      const { error } = await supabase
        .from("employee_profiles")
        .update({
          salary: data.salary,
          net_salary: data.net_salary,
          salary_payment_day: data.salary_payment_day,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members-with-salaries"] });
      toast.success("Salário atualizado com sucesso!");
      setEditingEmployee(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar salário: " + error.message);
    },
  });

  // Create employee profile mutation
  const createEmployeeProfileMutation = useMutation({
    mutationFn: async (data: {
      user_id: string;
      full_name: string;
      salary: number | null;
      net_salary: number | null;
      salary_payment_day: number
    }) => {
      const { error } = await supabase
        .from("employee_profiles")
        .insert({
          user_id: data.user_id,
          full_name: data.full_name,
          cpf: "000.000.000-00", // Placeholder - to be filled later
          birth_date: "2000-01-01", // Placeholder - to be filled later
          salary: data.salary,
          net_salary: data.net_salary,
          salary_payment_day: data.salary_payment_day,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members-with-salaries"] });
      toast.success("Perfil de funcionário criado com sucesso!");
      setLinkingEmployee(null);
    },
    onError: (error) => {
      toast.error("Erro ao criar perfil: " + error.message);
    },
  });

  const handleEdit = (employee: StaffMember) => {
    if (!employee.employee_profile_id) {
      setLinkingEmployee(employee);
      setFormData({
        salary: "",
        net_salary: "",
        salary_payment_day: "5",
      });
    } else {
      setEditingEmployee(employee);
      setFormData({
        salary: employee.salary?.toString() || "",
        net_salary: employee.net_salary?.toString() || "",
        salary_payment_day: employee.salary_payment_day?.toString() || "5",
      });
    }
  };

  const handleSave = () => {
    if (!editingEmployee?.employee_profile_id) return;

    updateSalaryMutation.mutate({
      id: editingEmployee.employee_profile_id,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      net_salary: formData.net_salary ? parseFloat(formData.net_salary) : null,
      salary_payment_day: parseInt(formData.salary_payment_day) || 5,
    });
  };

  const handleCreateProfile = () => {
    if (!linkingEmployee) return;

    createEmployeeProfileMutation.mutate({
      user_id: linkingEmployee.user_id,
      full_name: linkingEmployee.full_name,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      net_salary: formData.net_salary ? parseFloat(formData.net_salary) : null,
      salary_payment_day: parseInt(formData.salary_payment_day) || 5,
    });
  };

  // Calculate totals
  const totalGross = staffMembers.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const totalNet = staffMembers.reduce((sum, emp) => sum + (emp.net_salary || 0), 0);
  const employeesWithSalary = staffMembers.filter((emp) => emp.salary && emp.salary > 0);
  const employeesWithoutProfile = staffMembers.filter((emp) => !emp.employee_profile_id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-fredoka font-bold text-foreground">
              Gestão de Funcionários
            </h1>
            <p className="text-muted-foreground">
              Gerencie salários e informações dos funcionários
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/painel/convites-funcionarios">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Funcionário
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Funcionários</p>
                  <p className="text-2xl font-bold">{staffMembers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Folha Bruta Mensal</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalGross)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Folha Líquida Mensal</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalNet)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for employees without profile */}
        {employeesWithoutProfile.length > 0 && (
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">
                    {employeesWithoutProfile.length} funcionário(s) sem perfil completo
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão de editar para vincular informações salariais
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionários</CardTitle>
            <CardDescription>
              {employeesWithSalary.length} de {staffMembers.length} funcionários com salário cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTable
              staffMembers={staffMembers}
              isLoading={isLoading}
              onEdit={handleEdit}
            />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <EditSalaryDialog
          employee={editingEmployee}
          isOpen={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          isPending={updateSalaryMutation.isPending}
        />

        {/* Link/Create Profile Dialog */}
        <CreateProfileDialog
          employee={linkingEmployee}
          isOpen={!!linkingEmployee}
          onOpenChange={(open) => !open && setLinkingEmployee(null)}
          formData={formData}
          setFormData={setFormData}
          onCreate={handleCreateProfile}
          isPending={createEmployeeProfileMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
