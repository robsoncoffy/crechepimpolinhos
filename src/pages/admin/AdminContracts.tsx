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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Eye,
  Send,
  AlertCircle,
  Download,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractPreviewDialog, ContractData } from "@/components/admin/ContractPreviewDialog";

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

interface ChildWithoutContract {
  id: string;
  full_name: string;
  class_type: string;
  shift_type: string;
  plan_type: string | null;
  birth_date: string;
  created_at: string;
  parent_id: string;
  parent_name: string;
  parent_email: string;
  parent_cpf: string | null;
  parent_rg: string | null;
  parent_phone: string | null;
  address: string | null;
  child_cpf: string | null;
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
  const [childrenWithoutContract, setChildrenWithoutContract] = useState<ChildWithoutContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"contracts" | "pending">("contracts");
  
  // Contract preview dialog state
  const [contractPreviewOpen, setContractPreviewOpen] = useState(false);
  const [selectedChildForContract, setSelectedChildForContract] = useState<ChildWithoutContract | null>(null);
  const [sendingContract, setSendingContract] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [deletingContract, setDeletingContract] = useState<string | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState<ChildWithoutContract | null>(null);
  const [deleteChildDialogOpen, setDeleteChildDialogOpen] = useState(false);
  const [deletingChild, setDeletingChild] = useState(false);

  useEffect(() => {
    fetchContracts();
    fetchChildrenWithoutContract();
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

  async function fetchChildrenWithoutContract() {
    try {
      // First get all child_ids that already have contracts
      const { data: existingContracts } = await supabase
        .from("enrollment_contracts")
        .select("child_id");

      const contractedChildIds = new Set((existingContracts || []).map(c => c.child_id));

      // Get all children
      const { data: allChildren, error: childrenError } = await supabase
        .from("children")
        .select("id, full_name, class_type, shift_type, plan_type, birth_date, created_at")
        .order("created_at", { ascending: false });

      if (childrenError) throw childrenError;

      // Filter children without contracts
      const childrenMissingContracts = (allChildren || []).filter(
        child => !contractedChildIds.has(child.id)
      );

      if (childrenMissingContracts.length === 0) {
        setChildrenWithoutContract([]);
        return;
      }

      // Get parent information for each child
      const childIds = childrenMissingContracts.map(c => c.id);
      const { data: parentLinks } = await supabase
        .from("parent_children")
        .select("child_id, parent_id")
        .in("child_id", childIds);

      const parentIds = [...new Set((parentLinks || []).map(p => p.parent_id))];

      // Get parent profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, cpf, rg, phone, email")
        .in("user_id", parentIds);

      // Get child registrations for CPF and address data
      const { data: registrations } = await supabase
        .from("child_registrations")
        .select("first_name, last_name, cpf, parent_id, address, city")
        .in("parent_id", parentIds);

      // Build profile map
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Build parent link map
      const parentLinkMap = new Map(
        (parentLinks || []).map(p => [p.child_id, p.parent_id])
      );

      // Build child CPF and address map by matching child name OR parent_id
      const childCpfMap = new Map<string, string>();
      const childAddressMap = new Map<string, string>();
      if (registrations) {
        for (const child of childrenMissingContracts) {
          const parentId = parentLinkMap.get(child.id);
          // Try to match by name first, then by parent_id
          let reg = registrations.find(r => 
            `${r.first_name} ${r.last_name}`.toLowerCase() === child.full_name.toLowerCase()
          );
          // If no match by name, try to find by parent_id
          if (!reg && parentId) {
            reg = registrations.find(r => r.parent_id === parentId);
          }
          if (reg?.cpf) {
            childCpfMap.set(child.id, reg.cpf);
          }
          if (reg?.address) {
            // Address already includes city in most cases
            childAddressMap.set(child.id, reg.address);
          }
        }
      }

      // Combine data
      const result: ChildWithoutContract[] = childrenMissingContracts.map(child => {
        const parentId = parentLinkMap.get(child.id) || "";
        const profile = profileMap.get(parentId);
        
        return {
          id: child.id,
          full_name: child.full_name,
          class_type: child.class_type,
          shift_type: child.shift_type,
          plan_type: child.plan_type,
          birth_date: child.birth_date,
          created_at: child.created_at,
          parent_id: parentId,
          parent_name: profile?.full_name || "Responsável não vinculado",
          // Prefer email saved in profiles; fallback will be resolved on preview open if missing
          parent_email: profile?.email || "",
          parent_cpf: profile?.cpf || null,
          parent_rg: profile?.rg || null,
          parent_phone: profile?.phone || null,
          address: childAddressMap.get(child.id) || null,
          child_cpf: childCpfMap.get(child.id) || null,
        };
      });

      setChildrenWithoutContract(result);
    } catch (error) {
      console.error("Error fetching children without contract:", error);
    }
  }

  async function openContractPreview(child: ChildWithoutContract) {
    let parentEmail = child.parent_email;

    // If email is missing in the profile, resolve from the auth user record (admin-only)
    if (!parentEmail && child.parent_id) {
      try {
        const { data, error } = await supabase.functions.invoke("get-user-email", {
          body: { userId: child.parent_id },
        });

        if (!error && data?.email) {
          parentEmail = data.email;
        }
      } catch (e) {
        console.error("Error resolving parent email:", e);
      }
    }

    setSelectedChildForContract({ ...child, parent_email: parentEmail || "" });
    setContractPreviewOpen(true);
  }

  async function sendContractForChild(editedData: ContractData) {
    if (!selectedChildForContract) return;
    
    setSendingContract(true);
    try {
      const response = await supabase.functions.invoke("zapsign-send-contract", {
        body: {
          childId: selectedChildForContract.id,
          registrationId: null,
          parentId: selectedChildForContract.parent_id,
          childName: editedData.childName,
          birthDate: selectedChildForContract.birth_date,
          classType: editedData.classType,
          shiftType: editedData.shiftType,
          planType: editedData.planType,
          overrideData: {
            parentName: editedData.parentName,
            parentCpf: editedData.parentCpf,
            parentRg: editedData.parentRg,
            parentPhone: editedData.parentPhone,
            parentEmail: editedData.parentEmail,
            address: editedData.address,
            emergencyContact: editedData.emergencyContact,
            childCpf: editedData.childCpf,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao enviar contrato");
      }

      toast.success("Contrato enviado com sucesso!");
      setContractPreviewOpen(false);
      setSelectedChildForContract(null);
      fetchContracts();
      fetchChildrenWithoutContract();
    } catch (error) {
      console.error("Error sending contract:", error);
      toast.error("Erro ao enviar contrato");
    } finally {
      setSendingContract(false);
    }
  }

  function getContractDataForChild(child: ChildWithoutContract): ContractData {
    return {
      parentName: child.parent_name,
      parentCpf: child.parent_cpf || "",
      parentRg: child.parent_rg || "",
      parentPhone: child.parent_phone || "",
      parentEmail: child.parent_email,
      address: child.address || "",
      childName: child.full_name,
      childCpf: child.child_cpf || "",
      birthDate: format(new Date(child.birth_date), "dd/MM/yyyy"),
      classType: child.class_type,
      shiftType: child.shift_type,
      planType: child.plan_type || undefined,
    };
  }

  async function handleResendContract(contract: Contract) {
    setResending(contract.id);
    try {
      const response = await supabase.functions.invoke("zapsign-send-contract", {
        body: {
          childId: contract.child_id,
          registrationId: contract.registration_id,
          parentId: contract.parent_id,
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

  async function handleDownloadPdf(contract: Contract) {
    if (!contract.zapsign_doc_token) {
      toast.error("Token do documento não disponível");
      return;
    }

    setDownloadingPdf(contract.id);
    try {
      const response = await supabase.functions.invoke("zapsign-download-pdf", {
        body: {
          contractId: contract.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao obter PDF");
      }

      const { pdfUrl, status } = response.data;

      if (!pdfUrl) {
        toast.error("PDF ainda não disponível. Status: " + status);
        return;
      }

      // Open PDF in new tab for download
      window.open(pdfUrl, "_blank");
      toast.success("PDF aberto em nova aba");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erro ao baixar PDF do contrato");
    } finally {
      setDownloadingPdf(null);
    }
  }

  function confirmDeleteContract(contract: Contract) {
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteContract() {
    if (!contractToDelete) return;
    
    setDeletingContract(contractToDelete.id);
    try {
      const { error } = await supabase
        .from("enrollment_contracts")
        .delete()
        .eq("id", contractToDelete.id);

      if (error) throw error;

      toast.success("Contrato excluído com sucesso!");
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      fetchContracts();
      fetchChildrenWithoutContract();
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Erro ao excluir contrato");
    } finally {
      setDeletingContract(null);
    }
  }

  function confirmDeleteChild(child: ChildWithoutContract) {
    setChildToDelete(child);
    setDeleteChildDialogOpen(true);
  }

  async function handleDeleteChild() {
    if (!childToDelete) return;
    
    setDeletingChild(true);
    try {
      // First remove parent-child links
      await supabase
        .from("parent_children")
        .delete()
        .eq("child_id", childToDelete.id);

      // Then delete the child
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", childToDelete.id);

      if (error) throw error;

      toast.success("Criança removida com sucesso!");
      setDeleteChildDialogOpen(false);
      setChildToDelete(null);
      fetchChildrenWithoutContract();
    } catch (error) {
      console.error("Error deleting child:", error);
      toast.error("Erro ao remover criança");
    } finally {
      setDeletingChild(false);
    }
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
        <Button variant="outline" onClick={() => { fetchContracts(); fetchChildrenWithoutContract(); }}>
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
            <div className="p-3 rounded-full bg-pimpo-blue/10">
              <Clock className="w-6 h-6 text-pimpo-blue" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Aguardando assinatura</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-green/10">
              <CheckCircle className="w-6 h-6 text-pimpo-green" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{stats.signed}</p>
              <p className="text-sm text-muted-foreground">Assinados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{childrenWithoutContract.length}</p>
              <p className="text-sm text-muted-foreground">Sem contrato</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Contracts and Pending */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "contracts" | "pending")}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            Contratos Enviados
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Sem Contrato
            {childrenWithoutContract.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-destructive/20 text-destructive">
                {childrenWithoutContract.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-6">
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
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {contract.status === "signed" && contract.zapsign_doc_token && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadPdf(contract)}
                                    disabled={downloadingPdf === contract.id}
                                    title="Baixar PDF assinado"
                                  >
                                    {downloadingPdf === contract.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                {contract.zapsign_doc_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    title="Abrir no ZapSign"
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
                                    title="Reenviar contrato"
                                  >
                                    {resending === contract.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => confirmDeleteContract(contract)}
                                  disabled={deletingContract === contract.id}
                                  title="Excluir contrato"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  {deletingContract === contract.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
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
        </TabsContent>

        {/* Pending Contracts Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Crianças Sem Contrato
              </CardTitle>
              <CardDescription>
                Crianças cadastradas que ainda não possuem contrato enviado. Clique para gerar e enviar o contrato.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {childrenWithoutContract.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-pimpo-green/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Tudo em ordem!</h3>
                  <p className="text-muted-foreground">
                    Todas as crianças cadastradas possuem contrato enviado
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
                        <TableHead>Turno</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childrenWithoutContract.map((child) => (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">
                            {child.full_name}
                          </TableCell>
                          <TableCell>
                            {child.parent_name}
                          </TableCell>
                          <TableCell>
                            {classTypeLabels[child.class_type] || child.class_type}
                          </TableCell>
                          <TableCell>
                            {shiftTypeLabels[child.shift_type] || child.shift_type}
                          </TableCell>
                          <TableCell>
                            {format(new Date(child.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => openContractPreview(child)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Gerar Contrato
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => confirmDeleteChild(child)}
                                title="Remover criança"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Contract Preview Dialog for generating new contracts */}
      {selectedChildForContract && (
        <ContractPreviewDialog
          open={contractPreviewOpen}
          onOpenChange={setContractPreviewOpen}
          contractData={getContractDataForChild(selectedChildForContract)}
          onConfirmSend={sendContractForChild}
          loading={sendingContract}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Contrato
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o contrato de matrícula de{" "}
              <strong>{contractToDelete?.child_name}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. O documento no ZapSign não será afetado, 
              apenas o registro será removido do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={!!deletingContract}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContract}
              disabled={!!deletingContract}
            >
              {deletingContract ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Child Confirmation Dialog */}
      <Dialog open={deleteChildDialogOpen} onOpenChange={setDeleteChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Remover Criança
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{childToDelete?.full_name}</strong> do sistema?
              <br /><br />
              Esta ação irá remover o cadastro da criança e suas vinculações. 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteChildDialogOpen(false)}
              disabled={deletingChild}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChild}
              disabled={deletingChild}
            >
              {deletingChild ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}