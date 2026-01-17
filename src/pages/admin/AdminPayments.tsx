import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard,
  Plus,
  Loader2,
  RefreshCw,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Repeat,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FinancialReportsTab from "@/components/admin/FinancialReportsTab";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
}

interface Parent {
  id: string;
  full_name: string;
  phone: string | null;
}

interface ParentChild {
  parent_id: string;
  child_id: string;
  profiles: Parent;
  children: Child;
}

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

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-yellow-500", icon: Clock },
  paid: { label: "Pago", color: "bg-green-500", icon: CheckCircle },
  overdue: { label: "Vencido", color: "bg-red-500", icon: AlertCircle },
  cancelled: { label: "Cancelado", color: "bg-gray-500", icon: XCircle },
  refunded: { label: "Estornado", color: "bg-purple-500", icon: RefreshCw },
};

export default function AdminPayments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [parentChildren, setParentChildren] = useState<ParentChild[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"invoice" | "subscription">("invoice");
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    parentChildId: "",
    value: "",
    dueDate: "",
    billingDay: "10",
    description: "",
    installmentCount: "1",
  });

  const fetchData = async () => {
    setLoading(true);

    // Fetch parent-children relationships with profiles
    const { data: pcData } = await supabase
      .from("parent_children")
      .select(`
        parent_id,
        child_id,
        profiles!parent_children_parent_id_fkey (id, full_name, phone),
        children!parent_children_child_id_fkey (id, full_name, class_type)
      `) as any;

    if (pcData) {
      setParentChildren(pcData);
    }

    // Fetch invoices
    const { data: invData } = await supabase
      .from("invoices")
      .select("*, children(full_name)")
      .order("due_date", { ascending: false })
      .limit(100);

    if (invData) {
      setInvoices(invData as Invoice[]);
    }

    // Fetch subscriptions
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*, children(full_name)")
      .order("created_at", { ascending: false });

    if (subData) {
      setSubscriptions(subData as Subscription[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncPayments = async () => {
    setSyncing(true);
    
    const { data, error } = await supabase.functions.invoke("asaas-payments", {
      body: { action: "sync_payments" },
    });

    if (error) {
      toast.error("Erro ao sincronizar pagamentos");
    } else {
      toast.success(`${data.updated} pagamentos atualizados`);
      fetchData();
    }

    setSyncing(false);
  };

  const ensureCustomerExists = async (parentId: string, name: string, phone: string | null) => {
    const { data, error } = await supabase.functions.invoke("asaas-payments", {
      body: {
        action: "create_customer",
        parentId,
        name,
        phone,
      },
    });

    if (error) throw new Error("Erro ao criar cliente");
    return data.customerId;
  };

  const createInvoice = async () => {
    if (!formData.parentChildId || !formData.value || !formData.dueDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);

    try {
      const selected = parentChildren.find(
        pc => `${pc.parent_id}-${pc.child_id}` === formData.parentChildId
      );

      if (!selected) throw new Error("Responsável não encontrado");

      // Ensure customer exists in Asaas
      await ensureCustomerExists(
        selected.parent_id,
        selected.profiles.full_name,
        selected.profiles.phone
      );

      // Create invoice
      const installmentCount = parseInt(formData.installmentCount);
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: {
          action: "create_invoice",
          parentId: selected.parent_id,
          childId: selected.child_id,
          value: parseFloat(formData.value),
          dueDate: formData.dueDate,
          description: formData.description || `Mensalidade - ${selected.children.full_name}`,
          installmentCount: installmentCount > 1 ? installmentCount : undefined,
        },
      });

      if (error) throw error;

      toast.success(installmentCount > 1 ? `Parcelamento de ${installmentCount}x criado com sucesso!` : "Cobrança criada com sucesso!");
      setDialogOpen(false);
      setFormData({ parentChildId: "", value: "", dueDate: "", billingDay: "10", description: "", installmentCount: "1" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar cobrança");
    }

    setSaving(false);
  };

  const createSubscription = async () => {
    if (!formData.parentChildId || !formData.value) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);

    try {
      const selected = parentChildren.find(
        pc => `${pc.parent_id}-${pc.child_id}` === formData.parentChildId
      );

      if (!selected) throw new Error("Responsável não encontrado");

      // Ensure customer exists in Asaas
      await ensureCustomerExists(
        selected.parent_id,
        selected.profiles.full_name,
        selected.profiles.phone
      );

      // Create subscription
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: {
          action: "create_subscription",
          parentId: selected.parent_id,
          childId: selected.child_id,
          value: parseFloat(formData.value),
          billingDay: parseInt(formData.billingDay),
          description: formData.description || `Mensalidade - ${selected.children.full_name}`,
        },
      });

      if (error) throw error;

      toast.success("Assinatura criada com sucesso!");
      setDialogOpen(false);
      setFormData({ parentChildId: "", value: "", dueDate: "", billingDay: "10", description: "", installmentCount: "1" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar assinatura");
    }

    setSaving(false);
  };

  const openDialog = (type: "invoice" | "subscription") => {
    setDialogType(type);
    setFormData({ parentChildId: "", value: "", dueDate: "", billingDay: "10", description: "", installmentCount: "1" });
    setDialogOpen(true);
  };

  // Calculate stats
  const pendingTotal = invoices
    .filter(i => i.status === "pending")
    .reduce((sum, i) => sum + Number(i.value), 0);
  
  const overdueTotal = invoices
    .filter(i => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.value), 0);
  
  const paidThisMonth = invoices
    .filter(i => {
      if (i.status !== "paid" || !i.payment_date) return false;
      const paymentDate = new Date(i.payment_date);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, i) => sum + Number(i.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-pimpo-green" />
            Financeiro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie mensalidades e cobranças
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={syncPayments} disabled={syncing}>
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar
          </Button>
          <Button onClick={() => openDialog("invoice")} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-xl font-bold">
                  R$ {pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-xl font-bold text-red-600">
                  R$ {overdueTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido (Mês)</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {paidThisMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Repeat className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                <p className="text-xl font-bold">
                  {subscriptions.filter(s => s.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" />
            Cobranças
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Repeat className="w-4 h-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cobranças Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma cobrança encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criança</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const status = statusConfig[invoice.status] || statusConfig.pending;
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.children?.full_name || "—"}
                          </TableCell>
                          <TableCell>{invoice.description}</TableCell>
                          <TableCell>
                            R$ {Number(invoice.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} text-white gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Assinaturas Mensais</CardTitle>
                <CardDescription>Cobranças recorrentes automáticas</CardDescription>
              </div>
              <Button onClick={() => openDialog("subscription")} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Assinatura
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Repeat className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma assinatura encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criança</TableHead>
                      <TableHead>Valor Mensal</TableHead>
                      <TableHead>Dia Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.children?.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          R$ {Number(sub.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>Dia {sub.billing_day}</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                            {sub.status === "active" ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <FinancialReportsTab invoices={invoices} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "invoice" ? "Nova Cobrança Avulsa" : "Nova Assinatura Mensal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Responsável / Criança *</Label>
              <Select
                value={formData.parentChildId}
                onValueChange={(v) => setFormData({ ...formData, parentChildId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {parentChildren.map((pc) => (
                    <SelectItem key={`${pc.parent_id}-${pc.child_id}`} value={`${pc.parent_id}-${pc.child_id}`}>
                      {pc.children.full_name} ({pc.profiles.full_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
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

            {dialogType === "invoice" ? (
              <>
                <div>
                  <Label htmlFor="dueDate">Data de Vencimento *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Parcelamento</Label>
                  <Select
                    value={formData.installmentCount}
                    onValueChange={(v) => setFormData({ ...formData, installmentCount: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">À vista (1x)</SelectItem>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}x de R$ {formData.value ? (parseFloat(formData.value) / n).toFixed(2) : "0,00"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parseInt(formData.installmentCount) > 1 && formData.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: R$ {parseFloat(formData.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em {formData.installmentCount}x de R$ {(parseFloat(formData.value) / parseInt(formData.installmentCount)).toFixed(2)}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <Label>Dia do Vencimento</Label>
                <Select
                  value={formData.billingDay}
                  onValueChange={(v) => setFormData({ ...formData, billingDay: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Mensalidade Janeiro/2026"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={dialogType === "invoice" ? createInvoice : createSubscription}
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
