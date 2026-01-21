import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, DollarSign, Calendar, Pencil, Loader2, UserPlus, Link } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

interface StaffMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  employee_profile_id: string | null;
  job_title: string | null;
  photo_url: string | null;
  salary: number | null;
  net_salary: number | null;
  salary_payment_day: number | null;
  hire_date: string | null;
}

const STAFF_ROLES: ("admin" | "teacher" | "cook" | "nutritionist" | "pedagogue" | "auxiliar")[] = ['admin', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar'];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  teacher: "Professor(a)",
  nutritionist: "Nutricionista",
  cook: "Cozinheira",
  pedagogue: "Pedagoga",
  auxiliar: "Auxiliar",
};

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
      const userIds = [...new Set(roles?.map(r => r.user_id) || [])];
      
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
      roles?.forEach(r => {
        const existing = userRoleMap.get(r.user_id);
        if (!existing || (existing === 'admin' && r.role !== 'admin')) {
          userRoleMap.set(r.user_id, r.role);
        }
      });

      // Merge data
      const staffList: StaffMember[] = [];
      const processedUserIds = new Set<string>();

      userIds.forEach(userId => {
        if (processedUserIds.has(userId)) return;
        processedUserIds.add(userId);

        const profile = profiles?.find(p => p.user_id === userId);
        const empProfile = employeeProfiles?.find(ep => ep.user_id === userId);
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
      // No employee profile - need to create one first
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
            <a href="/painel/convites-funcionarios">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Funcionário
            </a>
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
                <Link className="h-5 w-5 text-warning" />
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : staffMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum funcionário cadastrado</p>
                <p className="text-sm">Use o botão "Convidar Funcionário" para adicionar membros da equipe</p>
              </div>
            ) : (
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
                          onClick={() => handleEdit(employee)}
                        >
                          {employee.employee_profile_id ? (
                            <Pencil className="h-4 w-4" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Salário</DialogTitle>
              <DialogDescription>
                Atualize as informações salariais de {editingEmployee?.full_name}
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
              <Button variant="outline" onClick={() => setEditingEmployee(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateSalaryMutation.isPending}>
                {updateSalaryMutation.isPending ? (
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

        {/* Link/Create Profile Dialog */}
        <Dialog open={!!linkingEmployee} onOpenChange={() => setLinkingEmployee(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Perfil de Funcionário</DialogTitle>
              <DialogDescription>
                Crie o perfil de funcionário para {linkingEmployee?.full_name} e adicione as informações salariais
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={linkingEmployee?.avatar_url || undefined} />
                    <AvatarFallback>
                      {linkingEmployee?.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{linkingEmployee?.full_name}</p>
                    <Badge variant="outline" className="text-xs">
                      {roleLabels[linkingEmployee?.role || ""] || "Funcionário"}
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
              <Button variant="outline" onClick={() => setLinkingEmployee(null)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProfile} disabled={createEmployeeProfileMutation.isPending}>
                {createEmployeeProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Vincular Perfil
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
