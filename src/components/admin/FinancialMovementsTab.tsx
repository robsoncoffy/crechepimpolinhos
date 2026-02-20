import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Calendar, 
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";

interface AsaasPayment {
  id: string;
  asaas_id: string;
  asaas_customer_id: string;
  value: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  description: string | null;
  linked_parent_id: string | null;
  linked_child_id: string | null;
}

interface AsaasCustomer {
  id: string;
  asaas_id: string;
  name: string;
}

interface FinancialMovementsTabProps {
  asaasPayments: AsaasPayment[];
  asaasCustomers: AsaasCustomer[];
}

interface Movement {
  id: string;
  date: string;
  type: "entrada" | "saida";
  description: string;
  value: number;
  status: string;
  customerName?: string;
}

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "quarter", label: "Últimos 3 meses" },
  { value: "year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "entrada", label: "Entradas" },
  { value: "saida", label: "Saídas" },
];

export default function FinancialMovementsTab({ asaasPayments, asaasCustomers }: FinancialMovementsTabProps) {
  const [period, setPeriod] = useState("month");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Map asaas_id to customer name
  const customerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of asaasCustomers) {
      map.set(c.asaas_id, c.name);
    }
    return map;
  }, [asaasCustomers]);

  // Convert asaas payments to movements
  const movements = useMemo((): Movement[] => {
    const result: Movement[] = [];

    asaasPayments.forEach((payment) => {
      // Payments received (entradas)
      if ((payment.status === "paid" || payment.status === "RECEIVED" || payment.status === "CONFIRMED") && payment.payment_date) {
        result.push({
          id: payment.id,
          date: payment.payment_date,
          type: "entrada",
          description: payment.description || "Pagamento recebido",
          value: Number(payment.value),
          status: "confirmed",
          customerName: customerNameMap.get(payment.asaas_customer_id),
        });
      }

      // Refunds (saídas)
      if (payment.status === "refunded" || payment.status === "REFUNDED") {
        result.push({
          id: `${payment.id}-refund`,
          date: payment.payment_date || payment.due_date,
          type: "saida",
          description: `Estorno: ${payment.description || "Pagamento"}`,
          value: Number(payment.value),
          status: "refunded",
          customerName: customerNameMap.get(payment.asaas_customer_id),
        });
      }
    });

    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [asaasPayments, customerNameMap]);

  // Apply filters
  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((m) => m.type === typeFilter);
    }

    // Period filter
    const now = new Date();
    let dateStart: Date | null = null;
    let dateEnd: Date | null = null;

    switch (period) {
      case "today":
        dateStart = startOfDay(now);
        dateEnd = endOfDay(now);
        break;
      case "week":
        dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateEnd = now;
        break;
      case "month":
        dateStart = startOfMonth(now);
        dateEnd = endOfMonth(now);
        break;
      case "last_month":
        dateStart = startOfMonth(subMonths(now, 1));
        dateEnd = endOfMonth(subMonths(now, 1));
        break;
      case "quarter":
        dateStart = startOfMonth(subMonths(now, 2));
        dateEnd = endOfMonth(now);
        break;
      case "year":
        dateStart = new Date(now.getFullYear(), 0, 1);
        dateEnd = new Date(now.getFullYear(), 11, 31);
        break;
      case "custom":
        if (startDate) dateStart = parseISO(startDate);
        if (endDate) dateEnd = parseISO(endDate);
        break;
    }

    if (dateStart && dateEnd) {
      filtered = filtered.filter((m) => {
        const movementDate = parseISO(m.date);
        return isWithinInterval(movementDate, { start: dateStart!, end: dateEnd! });
      });
    }

    return filtered;
  }, [movements, typeFilter, period, startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const entradas = filteredMovements
      .filter((m) => m.type === "entrada")
      .reduce((sum, m) => sum + m.value, 0);
    
    const saidas = filteredMovements
      .filter((m) => m.type === "saida")
      .reduce((sum, m) => sum + m.value, 0);

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [filteredMovements]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportCSV = () => {
    const headers = ["Data", "Tipo", "Descrição", "Cliente", "Valor"];
    const rows = filteredMovements.map((m) => [
      format(parseISO(m.date), "dd/MM/yyyy"),
      m.type === "entrada" ? "Entrada" : "Saída",
      m.description,
      m.customerName || "-",
      m.value.toFixed(2).replace(".", ","),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimentacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(totals.entradas)}
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
                <p className="text-sm text-muted-foreground">Total Saídas</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-500">
                  {formatCurrency(totals.saidas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo do Período</p>
                <p className={`text-xl font-bold ${totals.saldo >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                  {formatCurrency(totals.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {period === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Histórico de Movimentações
            <Badge variant="secondary" className="ml-2">
              {filteredMovements.length} registros
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhuma movimentação encontrada no período selecionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {movement.type === "entrada" ? (
                          <ArrowDownCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpCircle className="w-5 h-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(movement.date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{movement.description}</TableCell>
                      <TableCell>{movement.customerName || "—"}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        movement.type === "entrada" 
                          ? "text-green-600 dark:text-green-500" 
                          : "text-red-600 dark:text-red-500"
                      }`}>
                        {movement.type === "entrada" ? "+" : "-"} {formatCurrency(movement.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
