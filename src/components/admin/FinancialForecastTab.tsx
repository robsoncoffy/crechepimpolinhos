import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";
import { format, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  PiggyBank,
  Receipt,
  AlertTriangle,
  Users,
} from "lucide-react";

interface AsaasPayment {
  id: string;
  value: number;
  status: string;
  due_date: string;
  payment_date: string | null;
}

interface AsaasSubscription {
  id: string;
  value: number;
  status: string;
  next_due_date: string | null;
}

interface FinancialForecastTabProps {
  asaasPayments: AsaasPayment[];
  asaasSubscriptions: AsaasSubscription[];
}

interface FixedExpense {
  id: string;
  name: string;
  value: number;
  category: string;
  due_day: number;
}

interface EmployeeSalary {
  id: string;
  full_name: string;
  salary: number | null;
  net_salary: number | null;
}

const COST_CATEGORIES = [
  { value: "salarios", label: "Salários (Funcionários)" },
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

export default function FinancialForecastTab({ asaasPayments, asaasSubscriptions }: FinancialForecastTabProps) {
  // Fetch fixed expenses from database
  const { data: fixedExpenses = [] } = useQuery({
    queryKey: ["fixed-expenses-forecast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select("id, name, value, category, due_day")
        .eq("is_active", true);
      if (error) throw error;
      return data as FixedExpense[];
    },
  });

  // Fetch employee salaries from database
  const { data: employeeSalaries = [] } = useQuery({
    queryKey: ["employee-salaries-forecast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("id, full_name, salary, net_salary");
      if (error) throw error;
      return data as EmployeeSalary[];
    },
  });

  // Calculate totals
  const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.value, 0);
  const totalNetSalaries = employeeSalaries.reduce((sum, emp) => sum + (emp.net_salary || 0), 0);
  const totalMonthlyCosts = totalFixedExpenses + totalNetSalaries;

  // Active subscriptions revenue
  const activeSubscriptions = asaasSubscriptions.filter((s) => s.status === "active" || s.status === "ACTIVE");
  const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, s) => sum + Number(s.value), 0);

  // Pending payments (expected revenue)
  const pendingPayments = asaasPayments.filter((p) => 
    p.status === "pending" || p.status === "PENDING" || 
    p.status === "overdue" || p.status === "OVERDUE"
  );
  const pendingRevenue = pendingPayments.reduce((sum, p) => sum + Number(p.value), 0);

  // Historical payment rate
  const paidPayments = asaasPayments.filter((p) => 
    p.status === "paid" || p.status === "RECEIVED" || p.status === "CONFIRMED"
  );
  const allValidPayments = asaasPayments.filter((p) => 
    p.status !== "cancelled" && p.status !== "CANCELLED"
  );
  const paymentRate = allValidPayments.length > 0 ? (paidPayments.length / allValidPayments.length) * 100 : 85;

  // Generate 6-month forecast
  const forecastData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const month = addMonths(startOfMonth(now), i);
      const monthLabel = format(month, "MMM/yy", { locale: ptBR });

      const expectedRecurring = monthlyRecurringRevenue;
      const expectedPending = i === 0 ? pendingRevenue * (paymentRate / 100) : 0;
      const totalExpectedRevenue = expectedRecurring + expectedPending;
      const costs = totalMonthlyCosts;
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

  const costsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    // Add fixed expenses by category
    fixedExpenses.forEach((exp) => {
      grouped[exp.category] = (grouped[exp.category] || 0) + exp.value;
    });
    
    // Add salaries as a category
    if (totalNetSalaries > 0) {
      grouped["salarios"] = totalNetSalaries;
    }
    
    return Object.entries(grouped).map(([category, value]) => ({
      category,
      label: COST_CATEGORIES.find((c) => c.value === category)?.label || category,
      value,
    }));
  }, [fixedExpenses, totalNetSalaries]);

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
                  {pendingPayments.length} cobranças pendentes
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
                  {fixedExpenses.length + employeeSalaries.length} itens cadastrados
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
      {fixedExpenses.length === 0 && employeeSalaries.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Custos mensais não configurados
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Cadastre as contas fixas e salários de funcionários para ter uma previsão mais precisa.
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
        {/* Monthly Costs Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Resumo de Custos Fixos</CardTitle>
            </div>
            <CardDescription>
              Gerencie contas fixas na aba "Contas Fixas" e salários em "RH {'>'} Funcionários"
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fixedExpenses.length === 0 && employeeSalaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum custo cadastrado</p>
                <p className="text-sm">Configure contas fixas e salários</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Salaries Section */}
                {totalNetSalaries > 0 && (
                  <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          Folha de Pagamento ({employeeSalaries.length} funcionários)
                        </span>
                      </div>
                      <span className="font-bold text-red-600">{formatCurrency(totalNetSalaries)}</span>
                    </div>
                  </div>
                )}

                {/* Fixed Expenses Section */}
                {fixedExpenses.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta Fixa</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {COST_CATEGORIES.find((c) => c.value === expense.category)?.label || expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(expense.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Mensal</span>
                  <span className="font-bold text-red-600">{formatCurrency(totalMonthlyCosts)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Composição da Receita</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                    <p className="text-lg font-bold text-green-600">{activeSubscriptions.length}</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(monthlyRecurringRevenue)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Custos por Categoria</p>
                {costsByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum custo cadastrado</p>
                ) : (
                  costsByCategory.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm">{cat.label}</span>
                      <span className="text-sm font-medium text-red-600">{formatCurrency(cat.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
