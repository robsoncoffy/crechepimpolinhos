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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { UserCheck, UserX, Clock, Baby, Loader2, AlertCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Child = Database["public"]["Tables"]["children"]["Row"];

interface PendingParent extends Profile {
  email?: string;
}

export default function AdminApprovals() {
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState<PendingParent | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("responsável");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [profilesRes, childrenRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("status", "pending"),
        supabase.from("children").select("*").order("full_name"),
      ]);

      if (profilesRes.data) {
        setPendingParents(profilesRes.data);
      }
      if (childrenRes.data) {
        setChildren(childrenRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedParent) return;

    setActionLoading(true);
    try {
      // Update profile status to approved
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", selectedParent.id);

      if (profileError) throw profileError;

      // Link parent to child if selected
      if (selectedChildId) {
        const { error: linkError } = await supabase
          .from("parent_children")
          .insert({
            parent_id: selectedParent.user_id,
            child_id: selectedChildId,
            relationship: relationship,
          });

        if (linkError) throw linkError;
      }

      toast.success("Cadastro aprovado com sucesso!");
      setDialogOpen(false);
      setSelectedParent(null);
      setSelectedChildId("");
      fetchData();
    } catch (error) {
      console.error("Error approving parent:", error);
      toast.error("Erro ao aprovar cadastro");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(parent: PendingParent) {
    if (!confirm("Tem certeza que deseja rejeitar este cadastro?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "rejected" })
        .eq("id", parent.id);

      if (error) throw error;

      toast.success("Cadastro rejeitado");
      fetchData();
    } catch (error) {
      console.error("Error rejecting parent:", error);
      toast.error("Erro ao rejeitar cadastro");
    }
  }

  function openApproveDialog(parent: PendingParent) {
    setSelectedParent(parent);
    setSelectedChildId("");
    setRelationship("responsável");
    setDialogOpen(true);
  }

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
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Aprovações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os cadastros de pais pendentes
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-yellow/10">
              <Clock className="w-6 h-6 text-pimpo-yellow" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{pendingParents.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-pimpo-green/10">
              <UserCheck className="w-6 h-6 text-pimpo-green" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{children.length}</p>
              <p className="text-sm text-muted-foreground">Crianças cadastradas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-primary/10">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">Hoje</p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending List */}
      <Card>
        <CardHeader>
          <CardTitle>Cadastros Pendentes</CardTitle>
          <CardDescription>
            Aprove ou rejeite os cadastros de pais/responsáveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingParents.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Nenhum cadastro pendente</h3>
              <p className="text-muted-foreground">
                Todos os cadastros foram processados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data do Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingParents.map((parent) => (
                  <TableRow key={parent.id}>
                    <TableCell className="font-medium">{parent.full_name}</TableCell>
                    <TableCell>{parent.phone || "-"}</TableCell>
                    <TableCell>
                      {new Date(parent.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-pimpo-yellow/10 text-pimpo-yellow border-pimpo-yellow/30">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleReject(parent)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button size="sm" onClick={() => openApproveDialog(parent)}>
                          <UserCheck className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Cadastro</DialogTitle>
            <DialogDescription>
              Vincule este responsável a uma criança cadastrada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedParent?.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedParent?.phone}</p>
            </div>

            {children.length === 0 ? (
              <div className="p-4 bg-pimpo-yellow/10 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-pimpo-yellow mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Nenhuma criança cadastrada</p>
                  <p className="text-sm text-muted-foreground">
                    Cadastre a criança antes de vincular ao responsável
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vincular à criança</label>
                  <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma criança (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.full_name} - {child.class_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedChildId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Relacionamento</label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mãe">Mãe</SelectItem>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="avô">Avô</SelectItem>
                        <SelectItem value="avó">Avó</SelectItem>
                        <SelectItem value="responsável">Responsável</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Aprovar Cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
