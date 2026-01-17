import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  QrCode,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaymentsTabProps {
  childId: string;
}

interface Invoice {
  id: string;
  description: string;
  value: number;
  due_date: string;
  status: string;
  payment_date: string | null;
  invoice_url: string | null;
  pix_code: string | null;
  bank_slip_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  pending: { label: "Pendente", color: "text-yellow-600", icon: Clock, bgColor: "bg-yellow-50" },
  paid: { label: "Pago", color: "text-green-600", icon: CheckCircle, bgColor: "bg-green-50" },
  overdue: { label: "Vencido", color: "text-red-600", icon: AlertCircle, bgColor: "bg-red-50" },
  cancelled: { label: "Cancelado", color: "text-gray-500", icon: XCircle, bgColor: "bg-gray-50" },
  refunded: { label: "Estornado", color: "text-purple-600", icon: RefreshCw, bgColor: "bg-purple-50" },
};

export function PaymentsTab({ childId }: PaymentsTabProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchInvoices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("child_id", childId)
      .eq("parent_id", user.id)
      .order("due_date", { ascending: false });

    if (!error && data) {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [childId, user]);

  const openPaymentDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    if (invoice.status === "pending" || invoice.status === "overdue") {
      setLoadingDetails(true);
      
      // Fetch fresh data from Asaas
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "get_payment_info", paymentId: invoice.id },
      });

      if (!error && data) {
        setSelectedInvoice(data);
        fetchInvoices(); // Refresh list in case status changed
      }
      
      setLoadingDetails(false);
    }
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código PIX copiado!");
  };

  const openUrl = (url: string) => {
    window.open(url, "_blank");
  };

  // Calculate totals
  const pendingInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue");
  const pendingTotal = pendingInvoices.reduce((sum, i) => sum + Number(i.value), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhuma fatura encontrada</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            As cobranças aparecerão aqui quando forem geradas pela escola.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Summary Card */}
        {pendingTotal > 0 && (
          <Card className="bg-gradient-to-br from-pimpo-yellow/10 to-pimpo-red/10 border-pimpo-yellow/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total em Aberto</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-pimpo-yellow/20">
                  <CreditCard className="w-6 h-6 text-pimpo-yellow" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {pendingInvoices.length} {pendingInvoices.length === 1 ? "fatura pendente" : "faturas pendentes"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invoices List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-pimpo-blue" />
              Faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.map((invoice) => {
              const status = statusConfig[invoice.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isPending = invoice.status === "pending" || invoice.status === "overdue";

              return (
                <div
                  key={invoice.id}
                  onClick={() => openPaymentDetails(invoice)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                    isPending ? status.bgColor : "bg-muted/30",
                    isPending && "hover:border-pimpo-blue"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className={cn("w-4 h-4", status.color)} />
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        R$ {Number(invoice.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {isPending && (
                        <p className="text-xs text-pimpo-blue mt-1">Clique para pagar</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Payment Details Modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Fatura</DialogTitle>
              </DialogHeader>
              
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="font-medium">{selectedInvoice.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-bold text-lg">
                          R$ {Number(selectedInvoice.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vencimento</p>
                        <p className="font-medium">
                          {format(new Date(selectedInvoice.due_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={cn(
                        "mt-1",
                        statusConfig[selectedInvoice.status]?.color
                      )}>
                        {statusConfig[selectedInvoice.status]?.label || selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>

                  {(selectedInvoice.status === "pending" || selectedInvoice.status === "overdue") && (
                    <div className="space-y-3">
                      <p className="font-medium text-center">Opções de Pagamento</p>

                      {/* PIX */}
                      {selectedInvoice.pix_code && (
                        <Card className="border-pimpo-green/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <QrCode className="w-5 h-5 text-pimpo-green" />
                              <span className="font-medium">PIX Copia e Cola</span>
                            </div>
                            <div className="bg-muted p-2 rounded text-xs break-all max-h-20 overflow-y-auto">
                              {selectedInvoice.pix_code}
                            </div>
                            <Button
                              variant="outline"
                              className="w-full mt-3 gap-2"
                              onClick={() => copyPixCode(selectedInvoice.pix_code!)}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar Código PIX
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Boleto */}
                      {selectedInvoice.bank_slip_url && (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => openUrl(selectedInvoice.bank_slip_url!)}
                        >
                          <FileText className="w-4 h-4" />
                          Ver Boleto
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}

                      {/* Invoice URL */}
                      {selectedInvoice.invoice_url && (
                        <Button
                          className="w-full gap-2"
                          onClick={() => openUrl(selectedInvoice.invoice_url!)}
                        >
                          <CreditCard className="w-4 h-4" />
                          Pagar Online
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {selectedInvoice.status === "paid" && selectedInvoice.payment_date && (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-green-600">Pagamento Confirmado</p>
                      <p className="text-sm text-muted-foreground">
                        Pago em {format(new Date(selectedInvoice.payment_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
