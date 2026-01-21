import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Receipt, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

interface FixedExpense {
  id: string;
  name: string;
  category: string;
  value: number;
  due_day: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Aluguel" },
  { value: "utilities", label: "Utilidades (Água, Luz, Gás)" },
  { value: "internet", label: "Internet/Telefone" },
  { value: "insurance", label: "Seguros" },
  { value: "maintenance", label: "Manutenção" },
  { value: "taxes", label: "Impostos/Taxas" },
  { value: "supplies", label: "Materiais/Suprimentos" },
  { value: "software", label: "Software/Sistemas" },
  { value: "other", label: "Outros" },
];

const getCategoryLabel = (value: string) => {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    rent: "bg-purple-100 text-purple-800",
    utilities: "bg-blue-100 text-blue-800",
    internet: "bg-cyan-100 text-cyan-800",
    insurance: "bg-green-100 text-green-800",
    maintenance: "bg-orange-100 text-orange-800",
    taxes: "bg-red-100 text-red-800",
    supplies: "bg-yellow-100 text-yellow-800",
    software: "bg-indigo-100 text-indigo-800",
    other: "bg-gray-100 text-gray-800",
  };
  return colors[category] || colors.other;
};

export default function FixedExpensesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "other",
    value: "",
    due_day: "10",
    notes: "",
  });

  // Fetch fixed expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["fixed-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select("*")
        .order("due_day");

      if (error) throw error;
      return data as FixedExpense[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<FixedExpense, "id" | "created_at" | "is_active">) => {
      const { error } = await supabase.from("fixed_expenses").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Conta fixa cadastrada com sucesso!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar: " + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FixedExpense> & { id: string }) => {
      const { error } = await supabase
        .from("fixed_expenses")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Conta atualizada com sucesso!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Conta removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", category: "other", value: "", due_day: "10", notes: "" });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (expense: FixedExpense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      category: expense.category,
      value: expense.value.toString(),
      due_day: expense.due_day.toString(),
      notes: expense.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.value) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const data = {
      name: formData.name,
      category: formData.category,
      value: parseFloat(formData.value),
      due_day: parseInt(formData.due_day),
      notes: formData.notes || null,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleActive = (expense: FixedExpense) => {
    updateMutation.mutate({ id: expense.id, is_active: !expense.is_active });
  };

  // Calculate totals
  const activeExpenses = expenses.filter((e) => e.is_active);
  const totalMonthly = activeExpenses.reduce((sum, e) => sum + e.value, 0);
  const byCategory = activeExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.value;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contas Ativas</p>
                <p className="text-2xl font-bold">{activeExpenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Mensal</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalMonthly)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
                <p className="text-2xl font-bold">
                  {activeExpenses.length > 0 ? (
                    (() => {
                      const today = new Date().getDate();
                      const upcoming = activeExpenses
                        .filter((e) => e.due_day >= today)
                        .sort((a, b) => a.due_day - b.due_day)[0];
                      return upcoming ? `Dia ${upcoming.due_day}` : "Próx. mês";
                    })()
                  ) : (
                    "-"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contas Fixas</CardTitle>
            <CardDescription>
              Gerencie as despesas fixas mensais
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? "Editar Conta Fixa" : "Nova Conta Fixa"}
                </DialogTitle>
                <DialogDescription>
                  Cadastre uma despesa fixa mensal com vencimento
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Aluguel do imóvel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Valor (R$) *</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_day">Dia Vencimento *</Label>
                    <Input
                      id="due_day"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.due_day}
                      onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    placeholder="Informações adicionais..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma conta fixa cadastrada</p>
              <p className="text-sm">Clique em "Nova Conta" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-center">Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className={!expense.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.name}</p>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground">{expense.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(expense.category)}>
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.value)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Dia {expense.due_day}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={expense.is_active}
                        onCheckedChange={() => handleToggleActive(expense)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Deseja remover esta conta fixa?")) {
                              deleteMutation.mutate(expense.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, value]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <Badge className={getCategoryColor(category)}>
                      {getCategoryLabel(category)}
                    </Badge>
                    <span className="font-semibold">{formatCurrency(value)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
