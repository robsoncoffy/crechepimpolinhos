import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ReferenceLine,
} from "recharts";
import { format, startOfWeek, endOfWeek, addWeeks, parseISO, isWithinInterval, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

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

interface MonthlyCost {
  id: string;
  name: string;
  value: number;
  category: string;
}

interface WeeklyCashFlowTabProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
}

const WEEK_COUNT = 12; // Show 12 weeks projection

export default function WeeklyCashFlowTab({ invoices, subscriptions }: WeeklyCashFlowTabProps) {
  const { getSetting } = useSystemSettings();
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Get monthly costs and calculate weekly costs
  const monthlyCosts = useMemo(() => {
    const costsJson = getSetting("monthly_costs");
    if (costsJson) {
      try {
        return JSON.parse(costsJson) as MonthlyCost[];
      } catch {
        return [];
      }
    }
    return [];
  }, [getSetting]);

  const totalMonthlyCosts = useMemo(() => {
    return monthlyCosts.reduce((sum, cost) => sum + cost.value, 0);
  }, [monthlyCosts]);

  const weeklyFixedCost = totalMonthlyCosts / 4; // Approximate weekly cost

  // Calculate weekly data
  const weeklyData = useMemo(() => {
    const weeks: Array<{
      weekStart: Date;
      weekEnd: Date;
      label: string;
      entries: number;
      exits: number;
      balance: number;
      pending: number;
      expectedEntries: number;
      invoiceDetails: Array<{ description: string; value: number; status: string; childName: string }>;
    }> = [];

    const today = new Date();
    const baseWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

    // Generate weeks
    for (let i = 0; i < WEEK_COUNT; i++) {
      const weekStart = addWeeks(baseWeekStart, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      const label = `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM", { locale: ptBR })}`;

      // Calculate entries (paid invoices in this week)
      let entries = 0;
      let pending = 0;
      let expectedEntries = 0;
      const invoiceDetails: Array<{ description: string; value: number; status: string; childName: string }> = [];

      invoices.forEach((invoice) => {
        const dueDate = parseISO(invoice.due_date);
        
        if (isWithinInterval(dueDate, { start: weekStart, end: weekEnd })) {
          const value = Number(invoice.value);
          
          if (invoice.status === "paid") {
            entries += value;
          } else if (invoice.status === "pending") {
            pending += value;
            expectedEntries += value * 0.85; // 85% expected payment rate
          } else if (invoice.status === "overdue") {
            expectedEntries += value * 0.3; // 30% recovery rate for overdue
          }

          invoiceDetails.push({
            description: invoice.description,
            value,
            status: invoice.status,
            childName: invoice.children?.full_name || "—",
          });
        }
      });

      // Add expected from subscriptions (approximate based on billing day)
      subscriptions.filter(s => s.status === "active").forEach((sub) => {
        // Check if billing day falls within this week
        const billingDay = sub.billing_day;
        const weekStartDay = weekStart.getDate();
        const weekEndDay = weekEnd.getDate();
        
        // Simple check - if week spans month boundary or includes billing day
        const monthOfWeekStart = weekStart.getMonth();
        const monthOfWeekEnd = weekEnd.getMonth();
        
        if (monthOfWeekStart !== monthOfWeekEnd) {
          // Week spans month boundary - include if billing day is in either range
          if (billingDay >= weekStartDay || billingDay <= weekEndDay) {
            expectedEntries += Number(sub.value) * 0.85;
          }
        } else if (billingDay >= weekStartDay && billingDay <= weekEndDay) {
          expectedEntries += Number(sub.value) * 0.85;
        }
      });

      // Exits are fixed weekly costs
      const exits = weeklyFixedCost;

      weeks.push({
        weekStart,
        weekEnd,
        label,
        entries,
        exits,
        balance: entries + expectedEntries - exits,
        pending,
        expectedEntries,
        invoiceDetails,
      });
    }

    return weeks;
  }, [invoices, subscriptions, weeklyFixedCost, weekOffset]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalEntries = weeklyData.reduce((sum, w) => sum + w.entries, 0);
    const totalExpected = weeklyData.reduce((sum, w) => sum + w.expectedEntries, 0);
    const totalExits = weeklyData.reduce((sum, w) => sum + w.exits, 0);
    const totalPending = weeklyData.reduce((sum, w) => sum + w.pending, 0);
    const projectedBalance = totalEntries + totalExpected - totalExits;

    return {
      totalEntries,
      totalExpected,
      totalExits,
      totalPending,
      projectedBalance,
    };
  }, [weeklyData]);

  // Chart data
  const chartData = useMemo(() => {
    let cumulativeBalance = 0;
    
    return weeklyData.map((week) => {
      const weekBalance = week.entries + week.expectedEntries - week.exits;
      cumulativeBalance += weekBalance;
      
      return {
        name: week.label,
        entradas: week.entries + week.expectedEntries,
        saidas: week.exits,
        saldo: weekBalance,
        saldoAcumulado: cumulativeBalance,
      };
    });
  }, [weeklyData]);

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
              {entry.name === "entradas" && "Entradas: "}
              {entry.name === "saidas" && "Saídas: "}
              {entry.name === "saldo" && "Saldo: "}
              {entry.name === "saldoAcumulado" && "Acumulado: "}
              {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const exportToCSV = () => {
    const headers = ["Semana", "Entradas Realizadas", "Entradas Esperadas", "Saídas", "Saldo Projetado"];
    const rows = weeklyData.map((week) => [
      week.label,
      week.entries.toFixed(2),
      week.expectedEntries.toFixed(2),
      week.exits.toFixed(2),
      week.balance.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo-caixa-semanal-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas Realizadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalEntries)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <ArrowUpCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Próximas {WEEK_COUNT} semanas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas Esperadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.totalExpected)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Projeção baseada em taxa de pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saídas Fixas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalExits)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-100">
                <ArrowDownCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Custos mensais distribuídos
            </p>
          </CardContent>
        </Card>

        <Card className={stats.projectedBalance >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                <p className={`text-2xl font-bold ${stats.projectedBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(stats.projectedBalance)}
                </p>
              </div>
              <div className={`p-2 rounded-full ${stats.projectedBalance >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                {stats.projectedBalance >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Entradas - Saídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Fluxo de Caixa Semanal
            </CardTitle>
            <CardDescription>Projeção de entradas e saídas por semana</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 4)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 4)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="ml-2 gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                <Area 
                  type="monotone" 
                  dataKey="entradas" 
                  name="entradas"
                  stroke="#22c55e" 
                  fillOpacity={1}
                  fill="url(#colorEntradas)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="saidas" 
                  name="saidas"
                  stroke="#ef4444" 
                  fillOpacity={1}
                  fill="url(#colorSaidas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento Semanal</CardTitle>
          <CardDescription>Visão detalhada de cada semana</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyData.map((week, index) => {
                const balance = week.entries + week.expectedEntries - week.exits;
                const isPast = week.weekEnd < new Date();
                
                return (
                  <TableRow key={index} className={isPast ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {week.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(week.entries)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(week.expectedEntries)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(week.exits)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      {balance > weeklyFixedCost * 0.5 ? (
                        <Badge className="bg-green-500">Positivo</Badge>
                      ) : balance > 0 ? (
                        <Badge className="bg-yellow-500">Neutro</Badge>
                      ) : (
                        <Badge className="bg-red-500">Negativo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
