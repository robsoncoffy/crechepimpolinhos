import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Wallet,
  Trash2,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface PaymentsTabProps {
  childId: string;
}

interface AsaasPayment {
  id: string;
  asaas_id: string;
  description: string | null;
  value: number;
  due_date: string;
  status: string;
  payment_date: string | null;
  invoice_url: string | null;
  pix_code: string | null;
  bank_slip_url: string | null;
  linked_child_id: string | null;
}

interface SavedCard {
  id: string;
  card_brand: string;
  last_four_digits: string;
  holder_name: string;
  is_default: boolean;
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
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<AsaasPayment | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "saved">("pix");
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Saved cards state
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);
  
  // Card form state
  const [cardData, setCardData] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
    installments: "1",
  });

  const fetchPayments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "get_my_payments", childId },
      });

      if (!error && data?.payments) {
        // Filter by child if needed
        const filtered = childId 
          ? data.payments.filter((p: AsaasPayment) => p.linked_child_id === childId)
          : data.payments;
        setPayments(filtered);
      }
    } catch (e) {
      console.error("Error fetching payments:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    fetchSavedCards();
  }, [childId, user]);

  const fetchSavedCards = async () => {
    if (!user) return;
    
    setLoadingCards(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "get_saved_cards" },
      });
      
      if (!error && data?.cards) {
        setSavedCards(data.cards);
        // Pre-select default card
        const defaultCard = data.cards.find((c: SavedCard) => c.is_default);
        if (defaultCard) {
          setSelectedSavedCard(defaultCard.id);
        }
      }
    } catch (e) {
      console.error("Error fetching saved cards:", e);
    }
    setLoadingCards(false);
  };

  const openPaymentDetails = async (payment: AsaasPayment) => {
    setSelectedPayment(payment);
    setPaymentMethod("pix");
    
    if (payment.status === "pending" || payment.status === "overdue") {
      setLoadingDetails(true);
      
      try {
        const { data, error } = await supabase.functions.invoke("asaas-payments", {
          body: { action: "get_payment_details", paymentAsaasId: payment.asaas_id },
        });

        if (!error && data?.payment) {
          setSelectedPayment(data.payment);
          fetchPayments();
        }
      } catch (e) {
        console.error("Error fetching details:", e);
      }
      
      setLoadingDetails(false);
    }
  };

  const generatePix = async () => {
    if (!selectedPayment) return;
    
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "generate_pix", paymentAsaasId: selectedPayment.asaas_id },
      });

      if (!error && data?.pixCode) {
        setSelectedPayment(prev => prev ? { ...prev, pix_code: data.pixCode } : null);
        toast.success("Código PIX gerado!");
      } else {
        toast.error("Erro ao gerar código PIX");
      }
    } catch (e) {
      toast.error("Erro ao gerar código PIX");
    }
    setLoadingDetails(false);
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código PIX copiado!");
  };

  const openUrl = (url: string) => {
    window.open(url, "_blank");
  };

  const payWithCard = async () => {
    if (!selectedPayment) return;
    
    // Validate card data
    if (!cardData.holderName || !cardData.number || !cardData.expiryMonth || 
        !cardData.expiryYear || !cardData.ccv) {
      toast.error("Preencha todos os dados do cartão");
      return;
    }

    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: {
          action: "pay_with_card",
          paymentAsaasId: selectedPayment.asaas_id,
          cardHolderName: cardData.holderName,
          cardNumber: cardData.number,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
          installments: parseInt(cardData.installments),
          saveCard: saveCardForFuture,
        },
      });

      if (error) {
        toast.error(data?.error || "Erro ao processar pagamento");
      } else if (data?.success) {
        toast.success(data.cardSaved 
          ? "Pagamento realizado e cartão salvo!" 
          : "Pagamento realizado com sucesso!");
        setSelectedPayment(null);
        fetchPayments();
        if (data.cardSaved) {
          fetchSavedCards();
        }
        // Reset card form
        setCardData({
          holderName: "",
          number: "",
          expiryMonth: "",
          expiryYear: "",
          ccv: "",
          installments: "1",
        });
        setSaveCardForFuture(false);
      } else {
        toast.error(data?.error || "Erro ao processar pagamento");
      }
    } catch (e) {
      toast.error("Erro ao processar pagamento");
    }
    setProcessingPayment(false);
  };

  const payWithSavedCard = async () => {
    if (!selectedPayment || !selectedSavedCard) return;
    
    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: {
          action: "pay_with_saved_card",
          paymentAsaasId: selectedPayment.asaas_id,
          cardId: selectedSavedCard,
          installments: parseInt(cardData.installments),
        },
      });

      if (error) {
        toast.error(data?.error || "Erro ao processar pagamento");
      } else if (data?.success) {
        toast.success("Pagamento realizado com sucesso!");
        setSelectedPayment(null);
        fetchPayments();
      } else {
        toast.error(data?.error || "Erro ao processar pagamento");
      }
    } catch (e) {
      toast.error("Erro ao processar pagamento");
    }
    setProcessingPayment(false);
  };

  const deleteSavedCard = async (cardId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "delete_saved_card", cardId },
      });

      if (!error && data?.success) {
        toast.success("Cartão removido!");
        setSavedCards(prev => prev.filter(c => c.id !== cardId));
        if (selectedSavedCard === cardId) {
          setSelectedSavedCard(null);
        }
      } else {
        toast.error("Erro ao remover cartão");
      }
    } catch (e) {
      toast.error("Erro ao remover cartão");
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : v;
  };

  // Get card brand icon/color
  const getCardBrandColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa": return "text-blue-600";
      case "mastercard": return "text-red-500";
      case "amex": return "text-blue-700";
      default: return "text-gray-600";
    }
  };

  // Calculate totals
  const pendingPayments = payments.filter(p => p.status === "pending" || p.status === "overdue");
  const overduePayments = payments.filter(p => p.status === "overdue");
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + Number(p.value), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhuma cobrança encontrada</p>
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
          <Card className={cn(
            "border-2",
            overduePayments.length > 0 
              ? "bg-gradient-to-br from-destructive/10 to-destructive/20 border-destructive/30" 
              : "bg-gradient-to-br from-pimpo-yellow/10 to-pimpo-red/10 border-pimpo-yellow/30"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {overduePayments.length > 0 ? "Total em Atraso" : "Total em Aberto"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded-full",
                  overduePayments.length > 0 ? "bg-destructive/20" : "bg-pimpo-yellow/20"
                )}>
                  <Wallet className={cn(
                    "w-6 h-6",
                    overduePayments.length > 0 ? "text-destructive" : "text-pimpo-yellow"
                  )} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {pendingPayments.length} {pendingPayments.length === 1 ? "cobrança pendente" : "cobranças pendentes"}
                {overduePayments.length > 0 && (
                  <span className="text-destructive font-medium ml-1">
                    ({overduePayments.length} {overduePayments.length === 1 ? "vencida" : "vencidas"})
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payments List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-pimpo-blue" />
              Cobranças
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment) => {
              const status = statusConfig[payment.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isPending = payment.status === "pending" || payment.status === "overdue";

              return (
                <div
                  key={payment.id}
                  onClick={() => openPaymentDetails(payment)}
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
                      <p className="font-medium">{payment.description || "Mensalidade"}</p>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {format(new Date(payment.due_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        R$ {Number(payment.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Cobrança</DialogTitle>
              </DialogHeader>
              
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment Info */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="font-medium">{selectedPayment.description || "Mensalidade"}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-bold text-lg">
                          R$ {Number(selectedPayment.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vencimento</p>
                        <p className="font-medium">
                          {format(new Date(selectedPayment.due_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={cn(
                        "mt-1",
                        statusConfig[selectedPayment.status]?.color
                      )}>
                        {statusConfig[selectedPayment.status]?.label || selectedPayment.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Payment Options */}
                  {(selectedPayment.status === "pending" || selectedPayment.status === "overdue") && (
                    <div className="space-y-4">
                      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "pix" | "card" | "saved")}>
                        <TabsList className={cn("grid w-full", savedCards.length > 0 ? "grid-cols-3" : "grid-cols-2")}>
                          <TabsTrigger value="pix" className="gap-2">
                            <QrCode className="w-4 h-4" />
                            PIX
                          </TabsTrigger>
                          {savedCards.length > 0 && (
                            <TabsTrigger value="saved" className="gap-2">
                              <Wallet className="w-4 h-4" />
                              Salvos
                            </TabsTrigger>
                          )}
                          <TabsTrigger value="card" className="gap-2">
                            <CreditCard className="w-4 h-4" />
                            Novo
                          </TabsTrigger>
                        </TabsList>

                        {/* Saved Cards Tab */}
                        {savedCards.length > 0 && (
                          <TabsContent value="saved" className="space-y-3 mt-4">
                            <p className="text-sm text-muted-foreground mb-2">Selecione um cartão salvo:</p>
                            {savedCards.map((card) => (
                              <div
                                key={card.id}
                                onClick={() => setSelectedSavedCard(card.id)}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all",
                                  selectedSavedCard === card.id 
                                    ? "border-pimpo-blue bg-pimpo-blue/5" 
                                    : "hover:border-muted-foreground/50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <CreditCard className={cn("w-5 h-5", getCardBrandColor(card.card_brand))} />
                                  <div>
                                    <p className="font-medium">{card.card_brand} •••• {card.last_four_digits}</p>
                                    <p className="text-xs text-muted-foreground">{card.holder_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedSavedCard === card.id && (
                                    <Check className="w-4 h-4 text-pimpo-blue" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); deleteSavedCard(card.id); }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            
                            <Button
                              className="w-full gap-2 mt-4"
                              onClick={payWithSavedCard}
                              disabled={processingPayment || !selectedSavedCard}
                            >
                              {processingPayment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                              Pagar R$ {Number(selectedPayment.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Button>
                          </TabsContent>
                        )}

                        <TabsContent value="pix" className="space-y-3 mt-4">
                          {selectedPayment.pix_code ? (
                            <Card className="border-pimpo-green/30 bg-pimpo-green/5">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <QrCode className="w-5 h-5 text-pimpo-green" />
                                  <span className="font-medium text-pimpo-green">PIX Copia e Cola</span>
                                </div>
                                <div className="bg-background p-3 rounded border text-xs break-all max-h-24 overflow-y-auto font-mono">
                                  {selectedPayment.pix_code}
                                </div>
                                <Button
                                  variant="default"
                                  className="w-full mt-3 gap-2 bg-pimpo-green hover:bg-pimpo-green/90"
                                  onClick={() => copyPixCode(selectedPayment.pix_code!)}
                                >
                                  <Copy className="w-4 h-4" />
                                  Copiar Código PIX
                                </Button>
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                  Cole no app do seu banco para pagar
                                </p>
                              </CardContent>
                            </Card>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={generatePix}
                              disabled={loadingDetails}
                            >
                              {loadingDetails ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <QrCode className="w-4 h-4" />
                              )}
                              Gerar Código PIX
                            </Button>
                          )}

                          {/* Additional payment links */}
                          {selectedPayment.bank_slip_url && (
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() => openUrl(selectedPayment.bank_slip_url!)}
                            >
                              <FileText className="w-4 h-4" />
                              Ver Boleto
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}

                          {selectedPayment.invoice_url && (
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() => openUrl(selectedPayment.invoice_url!)}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Pagar no Asaas
                            </Button>
                          )}
                        </TabsContent>

                        <TabsContent value="card" className="space-y-4 mt-4">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="cardHolder">Nome no cartão</Label>
                              <Input
                                id="cardHolder"
                                placeholder="Como está no cartão"
                                value={cardData.holderName}
                                onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value.toUpperCase() }))}
                              />
                            </div>

                            <div>
                              <Label htmlFor="cardNumber">Número do cartão</Label>
                              <Input
                                id="cardNumber"
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                value={cardData.number}
                                onChange={(e) => setCardData(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label htmlFor="expiryMonth">Mês</Label>
                                <Select
                                  value={cardData.expiryMonth}
                                  onValueChange={(v) => setCardData(prev => ({ ...prev, expiryMonth: v }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="MM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => (
                                      <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                        {String(i + 1).padStart(2, "0")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="expiryYear">Ano</Label>
                                <Select
                                  value={cardData.expiryYear}
                                  onValueChange={(v) => setCardData(prev => ({ ...prev, expiryYear: v }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="AA" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 10 }, (_, i) => {
                                      const year = new Date().getFullYear() + i;
                                      return (
                                        <SelectItem key={year} value={String(year)}>
                                          {year}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="ccv">CVV</Label>
                                <Input
                                  id="ccv"
                                  placeholder="000"
                                  maxLength={4}
                                  value={cardData.ccv}
                                  onChange={(e) => setCardData(prev => ({ ...prev, ccv: e.target.value.replace(/\D/g, "") }))}
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="installments">Parcelas</Label>
                              <Select
                                value={cardData.installments}
                                onValueChange={(v) => setCardData(prev => ({ ...prev, installments: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                      {n}x de R$ {(Number(selectedPayment.value) / n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center space-x-2 py-2">
                              <Checkbox
                                id="saveCard"
                                checked={saveCardForFuture}
                                onCheckedChange={(checked) => setSaveCardForFuture(checked === true)}
                              />
                              <label
                                htmlFor="saveCard"
                                className="text-sm text-muted-foreground cursor-pointer"
                              >
                                Salvar cartão para pagamentos futuros
                              </label>
                            </div>

                            <Button
                              className="w-full gap-2"
                              onClick={payWithCard}
                              disabled={processingPayment}
                            >
                              {processingPayment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                              Pagar R$ {Number(selectedPayment.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                              🔒 Pagamento seguro processado pelo Asaas
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Paid Status */}
                  {selectedPayment.status === "paid" && (
                    <div className="text-center p-4 bg-pimpo-green/10 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-pimpo-green mx-auto mb-2" />
                      <p className="font-medium text-pimpo-green">Pagamento Confirmado</p>
                      {selectedPayment.payment_date && (
                        <p className="text-sm text-muted-foreground">
                          Pago em {format(new Date(selectedPayment.payment_date), "dd/MM/yyyy")}
                        </p>
                      )}
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
