import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { format, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Calculator,
  PiggyBank,
  Receipt,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "sonner";

interface Invoice {
  id: string;
  child_id: string;
  parent_id: string;
  description: string;
  value: number;
  due_date: string;
  status: string;
  payment_date: string | null;
  created_at: string;
  children?: { full_name: string };
}

interface Subscription {
  id: string;
  child_id: string;
  parent_id: string;
  value: number;
  billing_day: number;
  status: string;
  created_at: string;
  children?: { full_name: string };
}

interface FinancialForecastTabProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
}

interface MonthlyCost {
  id: string;
  name: string;
  value: number;
  category: string;
}

const COST_CATEGORIES = [
  { value: "salarios", label: "Salários e Encargos" },
  { value: "aluguel", label: "Aluguel e Condomínio" },
  { value: "utilidades", label: "Água, Luz, Internet" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "materiais", label: "Materiais e Suprimentos" },
  { value: "manutencao", label: "Manutenção" },
  { value: "marketing", label: "Marketing" },
  { value: "outros", label: "Outros" },
];

export default function FinancialForecastTab({ invoices, subscriptions }: FinancialForecastTabProps) {
  const { getSetting, updateSetting } = useSystemSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCost, setNewCost] = useState({ name: "", value: "", category: "outros" });

  // Load monthly costs from settings
  const monthlyCosts: MonthlyCost[] = useMemo(() => {
    const saved = getSetting("monthly_costs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }, [getSetting]);

  const saveCosts = async (costs: MonthlyCost[]) => {
    await updateSetting({ key: "monthly_costs", value: JSON.stringify(costs) });
  };

  const addCost = async () => {
    if (!newCost.name || !newCost.value) {
      toast.error("Preencha todos os campos");
      return;
    }

    const cost: MonthlyCost = {
      id: crypto.randomUUID(),
      name: newCost.name,
      value: parseFloat(newCost.value),
      category: newCost.category,
    };

    await saveCosts([...monthlyCosts, cost]);
    setNewCost({ name: "", value: "", category: "outros" });
    setDialogOpen(false);
    toast.success("Custo adicionado!");
  };

  const removeCost = async (id: string) => {
    await saveCosts(monthlyCosts.filter((c) => c.id !== id));
    toast.success("Custo removido!");
  };

  // Calculate totals
  const totalMonthlyCosts = monthlyCosts.reduce((sum, c) => sum + c.value, 0);

  // Active subscriptions revenue (monthly recurring)
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, s) => sum + Number(s.value), 0);

  // Pending invoices (expected revenue)
  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const pendingRevenue = pendingInvoices.reduce((sum, i) => sum + Number(i.value), 0);

  // Historical payment rate (for forecast accuracy)
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const allInvoices = invoices.filter((i) => i.status !== "cancelled");
  const paymentRate = allInvoices.length > 0 ? (paidInvoices.length / allInvoices.length) * 100 : 85;

  // Generate 6-month forecast
  const forecastData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const month = addMonths(startOfMonth(now), i);
      const monthLabel = format(month, "MMM/yy", { locale: ptBR });

      // Expected revenue: recurring + pending (adjusted by payment rate)
      const expectedRecurring = monthlyRecurringRevenue;
      const expectedPending = i === 0 ? pendingRevenue * (paymentRate / 100) : 0;
      const totalExpectedRevenue = expectedRecurring + expectedPending;

      // Costs remain constant
      const costs = totalMonthlyCosts;

      // Net result
      const netResult = totalExpectedRevenue - costs;

      data.push({
        month: monthLabel,
        receita: Math.round(totalExpectedRevenue),
        custos: Math.round(costs),
        resultado: Math.round(netResult),
      });
    }

    return data;
  }, [monthlyRecurringRevenue, pendingRevenue, paymentRate, totalMonthlyCosts]);

  // Monthly profit/loss
  const monthlyNetResult = monthlyRecurringRevenue - totalMonthlyCosts;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Group costs by category
  const costsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    monthlyCosts.forEach((cost) => {
      grouped[cost.category] = (grouped[cost.category] || 0) + cost.value;
    });
    return Object.entries(grouped).map(([category, value]) => ({
      category,
      label: COST_CATEGORIES.find((c) => c.value === category)?.label || category,
      value,
    }));
  }, [monthlyCosts]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Recorrente</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(monthlyRecurringRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeSubscriptions.length} assinaturas ativas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Receipt className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A Receber (Pendente)</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-500">
                  {formatCurrency(pendingRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingInvoices.length} faturas pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custos Mensais</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-500">
                  {formatCurrency(totalMonthlyCosts)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlyCosts.length} itens cadastrados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${monthlyNetResult >= 0 ? "border-green-500 bg-green-50/50 dark:bg-green-900/10" : "border-red-500 bg-red-50/50 dark:bg-red-900/10"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${monthlyNetResult >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                <PiggyBank className={`w-5 h-5 ${monthlyNetResult >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resultado Mensal</p>
                <p className={`text-xl font-bold ${monthlyNetResult >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                  {monthlyNetResult >= 0 ? "+" : ""}{formatCurrency(monthlyNetResult)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlyNetResult >= 0 ? "Lucro previsto" : "Prejuízo previsto"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning if costs not configured */}
      {monthlyCosts.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Custos mensais não configurados
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Cadastre os custos fixos mensais para ter uma previsão mais precisa do resultado financeiro.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Previsão para os Próximos 6 Meses</CardTitle>
          </div>
          <CardDescription>
            Baseado nas assinaturas ativas e custos cadastrados (taxa de adimplência: {paymentRate.toFixed(0)}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita Prevista"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                />
                <Area
                  type="monotone"
                  dataKey="custos"
                  name="Custos"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorCustos)"
                />
                <Line
                  type="monotone"
                  dataKey="resultado"
                  name="Resultado"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Costs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Custos Fixos Mensais</CardTitle>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Custo Mensal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        value={newCost.name}
                        onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                        placeholder="Ex: Aluguel do imóvel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={newCost.category}
                        onValueChange={(v) => setNewCost({ ...newCost, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COST_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newCost.value}
                        onChange={(e) => setNewCost({ ...newCost, value: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <Button onClick={addCost} className="w-full">
                      Adicionar Custo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyCosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum custo cadastrado</p>
                <p className="text-sm">Adicione os custos fixos mensais</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">{cost.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {COST_CATEGORIES.find((c) => c.value === cost.category)?.label || cost.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-500">
                          {formatCurrency(cost.value)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCost(cost.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Total Mensal</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-500">
                    {formatCurrency(totalMonthlyCosts)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Detalhamento de Receita</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Active Subscriptions */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Assinaturas Ativas ({activeSubscriptions.length})
                </h4>
                {activeSubscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {activeSubscriptions.slice(0, 10).map((sub) => (
                      <div key={sub.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                        <span>{sub.children?.full_name || "—"}</span>
                        <span className="font-medium text-green-600 dark:text-green-500">
                          {formatCurrency(Number(sub.value))}
                        </span>
                      </div>
                    ))}
                    {activeSubscriptions.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {activeSubscriptions.length - 10} outras assinaturas
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Costs by Category */}
              {costsByCategory.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    Custos por Categoria
                  </h4>
                  <div className="space-y-2">
                    {costsByCategory.map((cat) => (
                      <div key={cat.category} className="flex justify-between items-center text-sm">
                        <span>{cat.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${(cat.value / totalMonthlyCosts) * 100}%` }}
                            />
                          </div>
                          <span className="font-medium text-red-600 dark:text-red-500 w-24 text-right">
                            {formatCurrency(cat.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Receita Recorrente</span>
                  <span className="text-green-600 dark:text-green-500 font-medium">
                    +{formatCurrency(monthlyRecurringRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Custos Fixos</span>
                  <span className="text-red-600 dark:text-red-500 font-medium">
                    -{formatCurrency(totalMonthlyCosts)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Resultado Previsto</span>
                  <span className={monthlyNetResult >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                    {monthlyNetResult >= 0 ? "+" : ""}{formatCurrency(monthlyNetResult)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
