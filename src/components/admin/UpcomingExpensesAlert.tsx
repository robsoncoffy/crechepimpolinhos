import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, Receipt, ChevronRight, Calendar } from "lucide-react";
import { format, addDays, isBefore, isAfter, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  net_salary: number | null;
  salary_payment_day: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  salarios: "Salários",
  rent: "Aluguel",
  utilities: "Utilidades",
  internet: "Internet/Telefone",
  insurance: "Seguros",
  maintenance: "Manutenção",
  taxes: "Impostos/Taxas",
  supplies: "Materiais",
  software: "Software",
  other: "Outros",
};

export function UpcomingExpensesAlert() {
  const { data: fixedExpenses = [] } = useQuery({
    queryKey: ["fixed-expenses-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select("id, name, value, category, due_day")
        .eq("is_active", true);
      if (error) throw error;
      return data as FixedExpense[];
    },
  });

  const { data: employeeSalaries = [] } = useQuery({
    queryKey: ["employee-salaries-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("id, full_name, net_salary, salary_payment_day");
      if (error) throw error;
      return data as EmployeeSalary[];
    },
  });

  const today = new Date();
  const sevenDaysFromNow = addDays(today, 7);
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const lastDayOfMonth = endOfMonth(today).getDate();

  // Helper to get next due date for a given day
  const getNextDueDate = (dueDay: number): Date => {
    const effectiveDay = Math.min(dueDay, lastDayOfMonth);
    let dueDate = new Date(currentYear, currentMonth, effectiveDay);
    
    // If the due date has passed this month, use next month
    if (isBefore(dueDate, today)) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const lastDayOfNextMonth = endOfMonth(new Date(nextYear, nextMonth, 1)).getDate();
      dueDate = new Date(nextYear, nextMonth, Math.min(dueDay, lastDayOfNextMonth));
    }
    
    return dueDate;
  };

  // Get upcoming expenses (due in next 7 days)
  const upcomingExpenses = fixedExpenses
    .map((expense) => {
      const dueDate = getNextDueDate(expense.due_day);
      return { ...expense, dueDate, type: "expense" as const };
    })
    .filter((expense) => !isAfter(expense.dueDate, sevenDaysFromNow));

  // Get upcoming salary payments (due in next 7 days)
  const upcomingSalaries = employeeSalaries
    .filter((emp) => emp.net_salary && emp.net_salary > 0)
    .map((emp) => {
      const paymentDay = emp.salary_payment_day || 5;
      const dueDate = getNextDueDate(paymentDay);
      return {
        id: emp.id,
        name: `Salário - ${emp.full_name}`,
        value: emp.net_salary || 0,
        category: "salarios",
        due_day: paymentDay,
        dueDate,
        type: "salary" as const,
      };
    })
    .filter((salary) => !isAfter(salary.dueDate, sevenDaysFromNow));

  // Combine and sort by due date
  const allUpcoming = [...upcomingExpenses, ...upcomingSalaries].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  );

  const totalUpcoming = allUpcoming.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const getDaysUntil = (dueDate: Date): string => {
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    if (diffDays < 0) return "Vencido";
    return `Em ${diffDays} dias`;
  };

  const getBadgeVariant = (dueDate: Date): "destructive" | "secondary" | "default" => {
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return "destructive";
    if (diffDays <= 2) return "destructive";
    return "secondary";
  };

  if (allUpcoming.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <span>Vencimentos Próximos</span>
          </div>
          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300">
            {allUpcoming.length} {allUpcoming.length === 1 ? "conta" : "contas"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {allUpcoming.slice(0, 5).map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between p-2 rounded-lg bg-background border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/30">
                  {item.type === "salary" ? (
                    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[item.category] || item.category} • Dia {item.due_day}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={getBadgeVariant(item.dueDate)} className="text-xs">
                  {getDaysUntil(item.dueDate)}
                </Badge>
                <span className="text-sm font-semibold text-destructive whitespace-nowrap">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {allUpcoming.length > 5 && (
          <p className="text-xs text-center text-muted-foreground">
            +{allUpcoming.length - 5} outros vencimentos
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">Total próximos 7 dias</span>
          <span className="text-base font-bold text-destructive">
            {formatCurrency(totalUpcoming)}
          </span>
        </div>

        <Link to="/painel/financeiro">
          <Button variant="outline" size="sm" className="w-full">
            Ver Contas Fixas
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
