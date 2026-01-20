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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, UserX, Clock, Baby, Loader2, AlertCircle, Eye, FileText } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { ContractPreviewDialog, ContractData } from "@/components/admin/ContractPreviewDialog";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Child = Database["public"]["Tables"]["children"]["Row"];
type ChildRegistration = Database["public"]["Tables"]["child_registrations"]["Row"];

interface PendingParent extends Profile {
  email?: string;
}

interface PendingChildRegistration extends ChildRegistration {
  parent_name?: string;
}

export default function AdminApprovals() {
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingChildRegistration[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState<PendingParent | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("responsável");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingChildRegistration | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedClassType, setSelectedClassType] = useState<"bercario" | "maternal" | "jardim">("bercario");
  const [selectedShiftType, setSelectedShiftType] = useState<"manha" | "tarde" | "integral">("integral");
  const [contractPreviewOpen, setContractPreviewOpen] = useState(false);
  const [contractData, setContractData] = useState<any>(null);
  const [pendingApprovalData, setPendingApprovalData] = useState<{
    registration: PendingChildRegistration;
    newChild: Child;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [profilesRes, childrenRes, registrationsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("status", "pending"),
        supabase.from("children").select("*").order("full_name"),
        supabase
          .from("child_registrations")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (childrenRes.error) throw childrenRes.error;
      if (registrationsRes.error) throw registrationsRes.error;

      setPendingParents(profilesRes.data || []);
      setChildren(childrenRes.data || []);

      const regs = registrationsRes.data || [];
      if (regs.length === 0) {
        setPendingRegistrations([]);
        return;
      }

      // Fetch parent names for registrations
      const parentIds = [...new Set(regs.map((r) => r.parent_id))];
      const profilesLookupRes = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", parentIds);

      if (profilesLookupRes.error) throw profilesLookupRes.error;

      const profileMap = new Map(
        (profilesLookupRes.data || []).map((p) => [p.user_id, p.full_name])
      );

      const registrationsWithParent = regs.map((reg) => ({
        ...reg,
        parent_name: profileMap.get(reg.parent_id) || "Responsável",
      }));

      setPendingRegistrations(registrationsWithParent);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
      setPendingParents([]);
      setChildren([]);
      setPendingRegistrations([]);
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
    if (!confirm("Tem certeza que deseja rejeitar este cadastro? O usuário será completamente removido do sistema e poderá se cadastrar novamente.")) return;

    setActionLoading(true);
    try {
      // Call edge function to delete the user completely
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: parent.user_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Cadastro rejeitado e usuário removido do sistema");
      fetchData();
    } catch (error) {
      console.error("Error rejecting parent:", error);
      toast.error("Erro ao rejeitar cadastro: " + (error as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  function openApproveDialog(parent: PendingParent) {
    setSelectedParent(parent);
    setSelectedChildId("");
    setRelationship("responsável");
    setDialogOpen(true);
  }

  function openRegistrationDialog(registration: PendingChildRegistration) {
    setSelectedRegistration(registration);
    setRelationship("responsável");
    // Auto-suggest class based on birth date
    const birthDate = new Date(registration.birth_date);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (ageInMonths < 12) {
      setSelectedClassType("bercario");
    } else if (ageInMonths < 36) {
      setSelectedClassType("maternal");
    } else {
      setSelectedClassType("jardim");
    }
    setSelectedShiftType("integral");
    setRegistrationDialogOpen(true);
  }

  async function handleApproveRegistration() {
    if (!selectedRegistration) return;

    setActionLoading(true);
    try {
      // Create the child in the children table
      const { data: newChild, error: childError } = await supabase
        .from("children")
        .insert({
          full_name: `${selectedRegistration.first_name} ${selectedRegistration.last_name}`,
          birth_date: selectedRegistration.birth_date,
          class_type: selectedClassType,
          shift_type: selectedShiftType,
          photo_url: selectedRegistration.photo_url,
          allergies: selectedRegistration.allergies,
          medical_info: selectedRegistration.medications,
          plan_type: selectedRegistration.plan_type,
        })
        .select()
        .single();

      if (childError) throw childError;

      // Link parent to child
      const { error: linkError } = await supabase
        .from("parent_children")
        .insert({
          parent_id: selectedRegistration.parent_id,
          child_id: newChild.id,
          relationship: relationship,
        });

      if (linkError) throw linkError;

      // Update registration status to approved
      const { error: regError } = await supabase
        .from("child_registrations")
        .update({ status: "approved" })
        .eq("id", selectedRegistration.id);

      if (regError) throw regError;

      // Send welcome email to parent
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const response = await supabase.functions.invoke("send-welcome-email", {
            body: {
              parentId: selectedRegistration.parent_id,
              parentName: selectedRegistration.parent_name || "Responsável",
              childName: `${selectedRegistration.first_name} ${selectedRegistration.last_name}`,
              classType: selectedClassType,
              shiftType: selectedShiftType,
            },
          });
          
          if (response.error) {
            console.error("Error sending welcome email:", response.error);
          }
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
      }

      // Fetch parent profile for contract preview
      const { data: parentProfile } = await supabase
        .from("profiles")
        .select("full_name, cpf, rg, phone")
        .eq("user_id", selectedRegistration.parent_id)
        .single();

      // Fetch parent email
      const { data: userData } = await supabase.auth.admin.getUserById(selectedRegistration.parent_id);
      const parentEmail = userData?.user?.email || '';

      // Fetch emergency contact
      let emergencyContact = '';
      const { data: pickupData } = await supabase
        .from("authorized_pickups")
        .select("full_name, relationship")
        .eq("registration_id", selectedRegistration.id)
        .limit(1)
        .maybeSingle();
      
      if (pickupData) {
        emergencyContact = `${pickupData.full_name} (${pickupData.relationship})`;
      }

      // Prepare contract data for preview
      const contractPreviewData = {
        parentName: parentProfile?.full_name || selectedRegistration.parent_name || '',
        parentCpf: parentProfile?.cpf || '',
        parentRg: parentProfile?.rg || '',
        parentPhone: parentProfile?.phone || '',
        parentEmail: parentEmail,
        address: selectedRegistration.address ? `${selectedRegistration.address}, ${selectedRegistration.city || 'Canoas/RS'}` : 'Canoas/RS',
        childName: `${selectedRegistration.first_name} ${selectedRegistration.last_name}`,
        birthDate: new Date(selectedRegistration.birth_date).toLocaleDateString('pt-BR'),
        classType: selectedClassType,
        shiftType: selectedShiftType,
        planType: selectedRegistration.plan_type || undefined,
        emergencyContact: emergencyContact,
      };

      // Store pending data and show contract preview
      setPendingApprovalData({ registration: selectedRegistration, newChild });
      setContractData(contractPreviewData);
      setRegistrationDialogOpen(false);
      setContractPreviewOpen(true);
      
    } catch (error) {
      console.error("Error approving registration:", error);
      toast.error("Erro ao aprovar cadastro da criança");
    } finally {
      setActionLoading(false);
    }
  }

  async function sendContractAfterPreview(editedData: ContractData) {
    if (!pendingApprovalData) return;

    const { registration, newChild } = pendingApprovalData;

    try {
      const contractResponse = await supabase.functions.invoke("zapsign-send-contract", {
        body: {
          childId: newChild.id,
          registrationId: registration.id,
          parentId: registration.parent_id,
          childName: editedData.childName,
          birthDate: registration.birth_date,
          classType: selectedClassType,
          shiftType: selectedShiftType,
          planType: registration.plan_type,
          // Pass edited data to override profile data if changed
          overrideData: {
            parentName: editedData.parentName,
            parentCpf: editedData.parentCpf,
            parentRg: editedData.parentRg,
            parentPhone: editedData.parentPhone,
            parentEmail: editedData.parentEmail,
            address: editedData.address,
            emergencyContact: editedData.emergencyContact,
          },
        },
      });

      if (contractResponse.error) {
        console.error("Error sending contract:", contractResponse.error);
        toast.warning("Cadastro aprovado, mas houve erro ao enviar contrato. Verifique a configuração do ZapSign.");
      } else {
        toast.success(`Cadastro de ${editedData.childName} aprovado! E-mail de boas-vindas e contrato enviados.`);
      }
    } catch (contractError) {
      console.error("Error sending contract:", contractError);
      toast.warning("Cadastro aprovado, mas houve erro ao enviar contrato.");
    }

    setPendingApprovalData(null);
    setSelectedRegistration(null);
    setContractData(null);
    fetchData();
  }

  async function handleRejectRegistration(registration: PendingChildRegistration) {
    const deleteUser = confirm(`Tem certeza que deseja rejeitar o cadastro de ${registration.first_name}?\n\nClique OK para rejeitar apenas o cadastro da criança.\nO responsável continuará com acesso ao sistema.`);
    
    if (!deleteUser) return;

    setActionLoading(true);
    try {
      // First, delete the child registration
      const { error } = await supabase
        .from("child_registrations")
        .delete()
        .eq("id", registration.id);

      if (error) throw error;

      // Ask if they want to also delete the parent user
      const deleteParent = confirm("Deseja também remover o responsável do sistema? Isso permitirá que ele se cadastre novamente com o mesmo e-mail.");
      
      if (deleteParent) {
        const { data, error: deleteError } = await supabase.functions.invoke("delete-user", {
          body: { userId: registration.parent_id },
        });

        if (deleteError) {
          console.error("Error deleting parent:", deleteError);
          toast.warning("Cadastro da criança removido, mas houve erro ao remover o responsável");
        } else if (data?.error) {
          console.error("Error deleting parent:", data.error);
          toast.warning("Cadastro da criança removido, mas houve erro ao remover o responsável");
        } else {
          toast.success("Cadastro da criança e responsável removidos do sistema");
        }
      } else {
        toast.success("Cadastro da criança removido");
      }
      
      fetchData();
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toast.error("Erro ao rejeitar cadastro");
    } finally {
      setActionLoading(false);
    }
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
          Gerencie os cadastros pendentes de pais e crianças
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
              <p className="text-sm text-muted-foreground">Pais pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-primary/10">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{pendingRegistrations.length}</p>
              <p className="text-sm text-muted-foreground">Crianças pendentes</p>
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
              <p className="text-sm text-muted-foreground">Crianças aprovadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different approval types */}
      <Tabs defaultValue="children" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="children" className="flex items-center gap-2">
            <Baby className="w-4 h-4" />
            Crianças ({pendingRegistrations.length})
          </TabsTrigger>
          <TabsTrigger value="parents" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Pais ({pendingParents.length})
          </TabsTrigger>
        </TabsList>

        {/* Children Registrations Tab */}
        <TabsContent value="children">
          <Card>
            <CardHeader>
              <CardTitle>Cadastros de Crianças Pendentes</CardTitle>
              <CardDescription>
                Aprove os cadastros de crianças enviados pelos pais
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRegistrations.length === 0 ? (
                <div className="text-center py-12">
                  <Baby className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Nenhum cadastro de criança pendente</h3>
                  <p className="text-muted-foreground">
                    Todos os cadastros foram processados
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criança</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data de Nascimento</TableHead>
                      <TableHead>Data do Cadastro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRegistrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          {registration.first_name} {registration.last_name}
                        </TableCell>
                        <TableCell>{registration.parent_name}</TableCell>
                        <TableCell>
                          {new Date(registration.birth_date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {new Date(registration.created_at).toLocaleDateString("pt-BR")}
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
                              onClick={() => openRegistrationDialog(registration)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRejectRegistration(registration)}
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                            <Button size="sm" onClick={() => openRegistrationDialog(registration)}>
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
        </TabsContent>

        {/* Parents Tab */}
        <TabsContent value="parents">
          <Card>
            <CardHeader>
              <CardTitle>Cadastros de Pais Pendentes</CardTitle>
              <CardDescription>
                Aprove ou rejeite os cadastros de pais/responsáveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingParents.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Nenhum cadastro de pai pendente</h3>
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
        </TabsContent>
      </Tabs>

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

      {/* Registration Approval Dialog */}
      <Dialog open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aprovar Cadastro de Criança</DialogTitle>
            <DialogDescription>
              Revise as informações e aprove o cadastro
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Nome da Criança</p>
                  <p className="font-semibold">{selectedRegistration.first_name} {selectedRegistration.last_name}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                  <p className="font-semibold">
                    {new Date(selectedRegistration.birth_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Responsável</p>
                <p className="font-semibold">{selectedRegistration.parent_name}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-semibold">{selectedRegistration.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tipo de Vaga</p>
                  <p className="font-semibold">
                    {selectedRegistration.enrollment_type === "municipal" ? "Prefeitura" : "Particular"}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-semibold">{selectedRegistration.cpf || "-"}</p>
                </div>
              </div>

              {selectedRegistration.allergies && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Alergias</p>
                  <p className="text-red-800">{selectedRegistration.allergies}</p>
                </div>
              )}

              {selectedRegistration.medications && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Medicamentos</p>
                  <p className="text-blue-800">{selectedRegistration.medications}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma *</label>
                  <Select value={selectedClassType} onValueChange={(v) => setSelectedClassType(v as "bercario" | "maternal" | "jardim")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bercario">Berçário (0-1 ano)</SelectItem>
                      <SelectItem value="maternal">Maternal (1-3 anos)</SelectItem>
                      <SelectItem value="jardim">Jardim (4-6 anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turno *</label>
                  <Select value={selectedShiftType} onValueChange={(v) => setSelectedShiftType(v as "manha" | "tarde" | "integral")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã (7h - 11h)</SelectItem>
                      <SelectItem value="tarde">Tarde (15h - 19h)</SelectItem>
                      <SelectItem value="integral">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Relacionamento do Responsável</label>
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApproveRegistration} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              Aprovar e Visualizar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Preview Dialog */}
      {contractData && (
        <ContractPreviewDialog
          open={contractPreviewOpen}
          onOpenChange={setContractPreviewOpen}
          contractData={contractData}
          onConfirmSend={sendContractAfterPreview}
        />
      )}
    </div>
  );
}
