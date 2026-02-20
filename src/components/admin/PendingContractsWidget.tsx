import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingContract {
  id: string;
  child_name: string;
  class_type: string | null;
  created_at: string | null;
  sent_at: string | null;
  status: string | null;
}

export function PendingContractsWidget() {
  const [contracts, setContracts] = useState<PendingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    async function fetchPendingContracts() {
      try {
        // Get count of all pending/sent contracts
        const { count } = await supabase
          .from("enrollment_contracts")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "sent"]);

        setTotalPending(count || 0);

        // Get latest 5 pending/sent contracts
        const { data, error } = await supabase
          .from("enrollment_contracts")
          .select("id, child_name, class_type, created_at, sent_at, status")
          .in("status", ["pending", "sent"])
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        setContracts(data || []);
      } catch (error) {
        console.error("Error fetching pending contracts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingContracts();
  }, []);

  const getClassLabel = (classType: string | null) => {
    switch (classType) {
      case "bercario": return "Berçário";
      case "maternal": return "Maternal";
      case "jardim": return "Jardim";
      default: return "—";
    }
  };

  const getTimeAgo = (date: string | null) => {
    if (!date) return "—";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="w-5 h-5 text-pimpo-blue" />
          Contratos Pendentes
        </CardTitle>
        {totalPending > 0 && (
          <Badge variant="secondary" className="bg-pimpo-yellow/20 text-pimpo-yellow-dark">
            {totalPending} aguardando
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileSignature className="w-10 h-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum contrato pendente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-pimpo-blue/10">
                    {contract.status === "sent" ? (
                      <Clock className="w-4 h-4 text-pimpo-blue" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-pimpo-yellow" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{contract.child_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getClassLabel(contract.class_type)}</span>
                      <span>•</span>
                      <span>
                        {contract.status === "sent" ? "Enviado" : "Pendente"} {getTimeAgo(contract.sent_at || contract.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant={contract.status === "sent" ? "outline" : "secondary"}
                  className={
                    contract.status === "sent"
                      ? "border-pimpo-blue text-pimpo-blue"
                      : "bg-pimpo-yellow/20 text-pimpo-yellow-dark"
                  }
                >
                  {contract.status === "sent" ? "Enviado" : "Pendente"}
                </Badge>
              </div>
            ))}

            <Link to="/painel/contratos">
              <Button variant="outline" className="w-full mt-2">
                Ver todos os contratos
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
