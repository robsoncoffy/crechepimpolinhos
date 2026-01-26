import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Mail, AlertTriangle, CheckCircle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface EmailMetrics {
  totalEmails: number;
  sentEmails: number;
  errorEmails: number;
  permanentFailures: number;
  errorRate: number;
}

export function EmailHealthWidget() {
  const [metrics, setMetrics] = useState<EmailMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchMetrics = async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("email_logs")
        .select("status")
        .eq("provider", "ghl")
        .eq("direction", "outbound")
        .gte("created_at", oneHourAgo);

      if (error) throw error;

      const emails = data || [];
      const totalEmails = emails.length;
      const sentEmails = emails.filter(e => e.status === "sent").length;
      const errorEmails = emails.filter(e => e.status === "error").length;
      const permanentFailures = emails.filter(e => e.status === "failed_permanent").length;
      const errorRate = totalEmails > 0 
        ? ((errorEmails + permanentFailures) / totalEmails) * 100 
        : 0;

      setMetrics({
        totalEmails,
        sentEmails,
        errorEmails,
        permanentFailures,
        errorRate: Math.round(errorRate * 10) / 10,
      });
    } catch (error) {
      console.error("Error fetching email metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-email-health", {
        body: { timeWindowMinutes: 60 },
      });

      if (error) throw error;

      if (data.alertCreated) {
        toast.warning("Alerta criado: taxa de erro alta detectada!");
      } else {
        toast.success(`Status: ${data.healthStatus === "healthy" ? "Saudável" : "Atenção"}`);
      }

      // Refresh metrics
      await fetchMetrics();
    } catch (error) {
      console.error("Error running health check:", error);
      toast.error("Erro ao verificar saúde dos e-mails");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = () => {
    if (!metrics) return { status: "unknown", color: "secondary" as const };
    if (metrics.errorRate >= 20) return { status: "Crítico", color: "destructive" as const };
    if (metrics.errorRate >= 10) return { status: "Atenção", color: "warning" as const };
    return { status: "Saudável", color: "success" as const };
  };

  const health = getHealthStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Saúde dos E-mails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Saúde dos E-mails
          </CardTitle>
          <Badge 
            variant={health.color === "success" ? "default" : health.color === "warning" ? "secondary" : "destructive"}
          >
            {health.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última hora</span>
              <span className="text-sm font-medium">{metrics.totalEmails} e-mails</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-pimpo-green" />
                <span className="text-muted-foreground">Enviados:</span>
                <span className="font-medium">{metrics.sentEmails}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-muted-foreground">Erros:</span>
                <span className="font-medium">{metrics.errorEmails + metrics.permanentFailures}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1.5">
                {metrics.errorRate < 10 ? (
                  <TrendingDown className="w-4 h-4 text-pimpo-green" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                )}
                <span className="text-sm">
                  Taxa de erro: <strong>{metrics.errorRate}%</strong>
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={runHealthCheck}
                disabled={checking}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </>
        )}

        {!metrics && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nenhum e-mail na última hora
          </p>
        )}
      </CardContent>
    </Card>
  );
}
