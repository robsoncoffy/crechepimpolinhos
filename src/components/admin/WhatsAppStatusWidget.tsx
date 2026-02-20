import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface WhatsAppLog {
  id: string;
  phone: string;
  message_preview: string | null;
  template_type: string | null;
  status: string | null;
  retry_count: number | null;
  error_message: string | null;
  created_at: string;
}

export function WhatsAppStatusWidget() {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["whatsapp-logs-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_message_logs")
        .select("id, phone, message_preview, template_type, status, retry_count, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as WhatsAppLog[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: stats } = useQuery({
    queryKey: ["whatsapp-stats"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { count: totalToday } = await supabase
        .from("whatsapp_message_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today);

      const { count: pendingCount } = await supabase
        .from("whatsapp_message_logs")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "error"])
        .lt("retry_count", 3);

      const { count: failedCount } = await supabase
        .from("whatsapp_message_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed_permanent");

      return {
        totalToday: totalToday || 0,
        pending: pendingCount || 0,
        failed: failedCount || 0,
      };
    },
    refetchInterval: 60000,
  });

  const handleManualRetry = async (logId: string) => {
    setRetrying(logId);
    try {
      // Call the retry edge function for a specific message
      const { error } = await supabase.functions.invoke("retry-failed-whatsapp", {
        body: { messageId: logId },
      });

      if (error) throw error;

      toast.success("Reenvio solicitado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-logs-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-stats"] });
    } catch (err) {
      toast.error("Erro ao reenviar mensagem");
      console.error("Retry error:", err);
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string | null, retryCount: number | null) => {
    switch (status) {
      case "delivered":
      case "read":
        return <Badge className="bg-pimpo-green text-white"><CheckCircle className="w-3 h-3 mr-1" /> Entregue</Badge>;
      case "sent":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro ({retryCount}/3)</Badge>;
      case "failed_permanent":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const formatPhone = (phone: string) => {
    // Format as (XX) XXXXX-XXXX
    const clean = phone.replace(/\D/g, "").replace(/^55/, "");
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  const templateLabels: Record<string, string> = {
    pre_enrollment_received: "Pré-Matrícula",
    pre_enrollment_approved: "Aprovação Pré-Matrícula",
    parent_invite: "Convite Responsável",
    approval_parent: "Aprovação Cadastro",
    approval_child: "Aprovação Criança",
    contract_sent: "Contrato Enviado",
    contract_signed: "Contrato Assinado",
    payment_generated: "Cobrança Gerada",
    payment_confirmed: "Pagamento Confirmado",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="w-4 h-4 text-pimpo-green" />
          WhatsApp - Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">{stats?.totalToday || 0}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="p-2 bg-pimpo-yellow/10 rounded-lg">
            <p className="text-lg font-bold text-pimpo-yellow">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="p-2 bg-pimpo-red/10 rounded-lg">
            <p className="text-lg font-bold text-pimpo-red">{stats?.failed || 0}</p>
            <p className="text-xs text-muted-foreground">Falharam</p>
          </div>
        </div>

        {/* Recent messages */}
        {logs && logs.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{formatPhone(log.phone)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {templateLabels[log.template_type || ""] || log.template_type || "Mensagem"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status, log.retry_count)}
                  {(log.status === "error" || log.status === "failed_permanent") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleManualRetry(log.id)}
                      disabled={retrying === log.id}
                    >
                      <RefreshCw className={`w-3 h-3 ${retrying === log.id ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma mensagem WhatsApp recente
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => {
            setRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ["whatsapp-logs-summary"] });
            await queryClient.invalidateQueries({ queryKey: ["whatsapp-stats"] });
            setRefreshing(false);
          }}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardContent>
    </Card>
  );
}
