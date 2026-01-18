import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileSignature, 
  Loader2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Filter,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Contract {
  id: string;
  child_id: string;
  parent_id: string;
  registration_id: string | null;
  zapsign_doc_token: string | null;
  zapsign_signer_token: string | null;
  zapsign_doc_url: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  child_name: string;
  class_type: string | null;
  shift_type: string | null;
  plan_type: string | null;
  created_at: string;
  updated_at: string;
  parent_name?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { 
    label: "Pendente", 
    icon: Clock, 
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  },
  sent: { 
    label: "Enviado", 
    icon: Clock, 
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  signed: { 
    label: "Assinado", 
    icon: CheckCircle, 
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  refused: { 
    label: "Recusado", 
    icon: XCircle, 
    color: "text-red-600",
    bgColor: "bg-red-100"
  },
  expired: { 
    label: "Expirado", 
    icon: AlertTriangle, 
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
};

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const shiftTypeLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

export default function AdminContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    try {
      const { data, error } = await supabase
        .from("enrollment_contracts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch parent names
      const parentIds = [...new Set((data || []).map((c) => c.parent_id))];
      if (parentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", parentIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.user_id, p.full_name])
        );

        const contractsWithParent = (data || []).map((contract) => ({
          ...contract,
          parent_name: profileMap.get(contract.parent_id) || "Responsável",
        }));

        setContracts(contractsWithParent);
      } else {
        setContracts(data || []);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendContract(contract: Contract) {
    setResending(contract.id);
    try {
      const response = await supabase.functions.invoke("zapsign-send-contract", {
        body: {
          childId: contract.child_id,
          registrationId: contract.registration_id,
          parentId: contract.parent_id,
          parentName: contract.parent_name || "Responsável",
          childName: contract.child_name,
          birthDate: new Date().toISOString(), // Will be fetched from child record
          classType: contract.class_type || "bercario",
          shiftType: contract.shift_type || "integral",
          planType: contract.plan_type,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao reenviar contrato");
      }

      toast.success("Contrato reenviado com sucesso!");
      fetchContracts();
    } catch (error) {
      console.error("Error resending contract:", error);
      toast.error("Erro ao reenviar contrato");
    } finally {
      setResending(null);
    }
  }

  function openDetails(contract: Contract) {
    setSelectedContract(contract);
    setDetailsOpen(true);
  }

  const filteredContracts = contracts.filter((contract) => {
    if (statusFilter === "all") return true;
    return contract.status === statusFilter;
  });

  const stats = {
    total: contracts.length,
    sent: contracts.filter((c) => c.status === "sent").length,
    signed: contracts.filter((c) => c.status === "signed").length,
    pending: contracts.filter((c) => c.status === "pending" || c.status === "sent").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
            Contratos de Matrícula
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os contratos enviados via ZapSign
          </p>
        </div>
        <Button variant="outline" onClick={fetchContracts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-primary/10">
              <FileSignature className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de contratos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-blue-100">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Aguardando assinatura</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{stats.signed}</p>
              <p className="text-sm text-muted-foreground">Assinados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-yellow/20">
              <FileSignature className="w-6 h-6 text-pimpo-yellow" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">
                {stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Taxa de assinatura</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Lista de Contratos</CardTitle>
              <CardDescription>
                Todos os contratos de matrícula enviados para assinatura
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="signed">Assinado</SelectItem>
                  <SelectItem value="refused">Recusado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" 
                  ? "Nenhum contrato com este status"
                  : "Os contratos aparecerão aqui após aprovar matrículas"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criança</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Assinado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => {
                    const status = statusConfig[contract.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          {contract.child_name}
                        </TableCell>
                        <TableCell>{contract.parent_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{classTypeLabels[contract.class_type || ""] || "-"}</span>
                            <span className="text-xs text-muted-foreground">
                              {shiftTypeLabels[contract.shift_type || ""] || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${status.bgColor} ${status.color} border-0`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract.sent_at 
                            ? format(new Date(contract.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {contract.signed_at 
                            ? format(new Date(contract.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetails(contract)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {contract.zapsign_doc_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a 
                                  href={contract.zapsign_doc_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            {(contract.status === "sent" || contract.status === "expired" || contract.status === "refused") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendContract(contract)}
                                disabled={resending === contract.id}
                              >
                                {resending === contract.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
            <DialogDescription>
              Informações completas do contrato de matrícula
            </DialogDescription>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Criança</p>
                  <p className="font-semibold">{selectedContract.child_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                  <p className="font-semibold">{selectedContract.parent_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Turma</p>
                  <p className="font-semibold">
                    {classTypeLabels[selectedContract.class_type || ""] || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Turno</p>
                  <p className="font-semibold">
                    {shiftTypeLabels[selectedContract.shift_type || ""] || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge 
                    variant="outline" 
                    className={`${statusConfig[selectedContract.status]?.bgColor} ${statusConfig[selectedContract.status]?.color} border-0`}
                  >
                    {statusConfig[selectedContract.status]?.label || selectedContract.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plano</p>
                  <p className="font-semibold capitalize">
                    {selectedContract.plan_type || "-"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span>{format(new Date(selectedContract.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
                {selectedContract.sent_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Enviado em:</span>
                    <span>{format(new Date(selectedContract.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
                {selectedContract.signed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assinado em:</span>
                    <span>{format(new Date(selectedContract.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
              </div>

              {selectedContract.zapsign_doc_token && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Token do Documento</p>
                  <code className="text-xs bg-muted p-2 rounded block break-all">
                    {selectedContract.zapsign_doc_token}
                  </code>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedContract?.zapsign_doc_url && (
              <Button asChild>
                <a 
                  href={selectedContract.zapsign_doc_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir no ZapSign
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}