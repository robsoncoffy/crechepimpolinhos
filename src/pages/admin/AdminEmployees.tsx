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
import { Users, DollarSign, Calendar, Pencil, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

interface EmployeeProfile {
  id: string;
  user_id: string;
  full_name: string;
  job_title: string | null;
  photo_url: string | null;
  salary: number | null;
  net_salary: number | null;
  salary_payment_day: number | null;
  hire_date: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function AdminEmployees() {
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
  const [formData, setFormData] = useState({
    salary: "",
    net_salary: "",
    salary_payment_day: "5",
  });

  // Fetch employee profiles
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employee-profiles-salaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, job_title, photo_url, salary, net_salary, salary_payment_day, hire_date")
        .order("full_name");

      if (error) throw error;
      return data as EmployeeProfile[];
    },
  });

  // Fetch user roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-for-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;
      return data as UserRole[];
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
      queryClient.invalidateQueries({ queryKey: ["employee-profiles-salaries"] });
      toast.success("Salário atualizado com sucesso!");
      setEditingEmployee(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar salário: " + error.message);
    },
  });

  const getRoleLabel = (userId: string) => {
    const role = userRoles.find((r) => r.user_id === userId)?.role;
    const roleLabels: Record<string, string> = {
      admin: "Administrador",
      teacher: "Professor(a)",
      nutritionist: "Nutricionista",
      cook: "Cozinheira",
      pedagogue: "Pedagoga",
      auxiliar: "Auxiliar",
    };
    return roleLabels[role || ""] || "Funcionário";
  };

  const handleEdit = (employee: EmployeeProfile) => {
    setEditingEmployee(employee);
    setFormData({
      salary: employee.salary?.toString() || "",
      net_salary: employee.net_salary?.toString() || "",
      salary_payment_day: employee.salary_payment_day?.toString() || "5",
    });
  };

  const handleSave = () => {
    if (!editingEmployee) return;

    updateSalaryMutation.mutate({
      id: editingEmployee.id,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      net_salary: formData.net_salary ? parseFloat(formData.net_salary) : null,
      salary_payment_day: parseInt(formData.salary_payment_day) || 5,
    });
  };

  // Calculate totals
  const totalGross = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const totalNet = employees.reduce((sum, emp) => sum + (emp.net_salary || 0), 0);
  const employeesWithSalary = employees.filter((emp) => emp.salary && emp.salary > 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-fredoka font-bold text-foreground">
            Gestão de Funcionários
          </h1>
          <p className="text-muted-foreground">
            Gerencie salários e informações dos funcionários
          </p>
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
                  <p className="text-2xl font-bold">{employees.length}</p>
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

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionários</CardTitle>
            <CardDescription>
              {employeesWithSalary.length} de {employees.length} funcionários com salário cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={employee.photo_url || undefined} />
                            <AvatarFallback>
                              {employee.full_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.full_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {getRoleLabel(employee.user_id)}
                            </Badge>
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
                          <Pencil className="h-4 w-4" />
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
      </div>
    </AdminLayout>
  );
}
