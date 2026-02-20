import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, PieChartIcon, BarChart3 } from "lucide-react";

interface AsaasPayment {
  id: string;
  value: number;
  status: string;
  due_date: string;
  payment_date: string | null;
}

interface FinancialReportsTabProps {
  asaasPayments: AsaasPayment[];
}

const COLORS: Record<string, string> = {
  paid: "#22c55e",
  RECEIVED: "#22c55e",
  CONFIRMED: "#22c55e",
  pending: "#eab308",
  PENDING: "#eab308",
  overdue: "#ef4444",
  OVERDUE: "#ef4444",
  cancelled: "#6b7280",
  CANCELLED: "#6b7280",
  refunded: "#a855f7",
  REFUNDED: "#a855f7",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  RECEIVED: "Pago",
  CONFIRMED: "Pago",
  pending: "Pendente",
  PENDING: "Pendente",
  overdue: "Vencido",
  OVERDUE: "Vencido",
  cancelled: "Cancelado",
  CANCELLED: "Cancelado",
  refunded: "Estornado",
  REFUNDED: "Estornado",
};

export default function FinancialReportsTab({ asaasPayments }: FinancialReportsTabProps) {
  // Normalize status
  const normalizeStatus = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "received" || lowerStatus === "confirmed") return "paid";
    return lowerStatus;
  };

  // Calculate monthly revenue for the last 12 months
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; receita: number; inadimplencia: number; pendente: number }> = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, "yyyy-MM");
      const label = format(date, "MMM/yy", { locale: ptBR });
      months[key] = { month: label, receita: 0, inadimplencia: 0, pendente: 0 };
    }

    asaasPayments.forEach((payment) => {
      const dueDate = parseISO(payment.due_date);
      const key = format(dueDate, "yyyy-MM");
      
      if (!months[key]) return;

      const value = Number(payment.value);
      const status = normalizeStatus(payment.status);
      
      if (status === "paid") {
        months[key].receita += value;
      } else if (status === "overdue") {
        months[key].inadimplencia += value;
      } else if (status === "pending") {
        months[key].pendente += value;
      }
    });

    return Object.values(months);
  }, [asaasPayments]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    asaasPayments.forEach((payment) => {
      const status = normalizeStatus(payment.status);
      distribution[status] = (distribution[status] || 0) + Number(payment.value);
    });

    return Object.entries(distribution).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: COLORS[status] || "#6b7280",
    }));
  }, [asaasPayments]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = asaasPayments.reduce((sum, p) => sum + Number(p.value), 0);
    const paid = asaasPayments.filter(p => normalizeStatus(p.status) === "paid").reduce((sum, p) => sum + Number(p.value), 0);
    const overdue = asaasPayments.filter(p => normalizeStatus(p.status) === "overdue").reduce((sum, p) => sum + Number(p.value), 0);
    const pending = asaasPayments.filter(p => normalizeStatus(p.status) === "pending").reduce((sum, p) => sum + Number(p.value), 0);
    
    const inadimplenciaRate = total > 0 ? (overdue / total) * 100 : 0;
    const recebimentoRate = total > 0 ? (paid / total) * 100 : 0;

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthRevenue = asaasPayments
      .filter(p => {
        if (normalizeStatus(p.status) !== "paid" || !p.payment_date) return false;
        const paymentDate = parseISO(p.payment_date);
        return paymentDate >= currentMonthStart;
      })
      .reduce((sum, p) => sum + Number(p.value), 0);

    const lastMonthRevenue = asaasPayments
      .filter(p => {
        if (normalizeStatus(p.status) !== "paid" || !p.payment_date) return false;
        const date = parseISO(p.payment_date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, p) => sum + Number(p.value), 0);

    const growthRate = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      total,
      paid,
      overdue,
      pending,
      inadimplenciaRate,
      recebimentoRate,
      currentMonthRevenue,
      lastMonthRevenue,
      growthRate,
    };
  }, [asaasPayments]);

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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Recebimento</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.recebimentoRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatCurrency(stats.paid)} de {formatCurrency(stats.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Inadimplência</p>
                <p className={`text-2xl font-bold ${stats.inadimplenciaRate > 10 ? "text-red-600" : "text-yellow-600"}`}>
                  {stats.inadimplenciaRate.toFixed(1)}%
                </p>
              </div>
              <div className={`p-2 rounded-full ${stats.inadimplenciaRate > 10 ? "bg-red-100" : "bg-yellow-100"}`}>
                <AlertTriangle className={`w-6 h-6 ${stats.inadimplenciaRate > 10 ? "text-red-600" : "text-yellow-600"}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatCurrency(stats.overdue)} em atraso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita do Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.currentMonthRevenue)}
                </p>
              </div>
              <div className={`p-2 rounded-full ${stats.growthRate >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                {stats.growthRate >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className={`text-xs mt-2 ${stats.growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stats.growthRate >= 0 ? "+" : ""}{stats.growthRate.toFixed(1)}% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente de Recebimento</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(stats.pending)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-yellow-100">
                <PieChartIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Faturas aguardando pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Receita Mensal</CardTitle>
            </div>
            <CardDescription>Evolução da receita nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="receita" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inadimplencia" name="Inadimplente" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Distribuição</CardTitle>
            </div>
            <CardDescription>Por status de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {statusDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Tendência de Receita vs Inadimplência</CardTitle>
          </div>
          <CardDescription>Comparativo mensal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="receita" 
                  name="Recebido"
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="inadimplencia" 
                  name="Inadimplente"
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
