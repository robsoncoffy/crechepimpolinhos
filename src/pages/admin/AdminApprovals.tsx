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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, UserX, Clock, Baby, Loader2, AlertCircle, Eye, FileText, Pencil, Heart, FileCheck, Users, MapPin, ClipboardPen } from "lucide-react";
import { PreEnrollmentsContent } from "@/components/admin/PreEnrollmentsContent";
import { Database } from "@/integrations/supabase/types";
import { ContractPreviewDialog, ContractData } from "@/components/admin/ContractPreviewDialog";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Child = Database["public"]["Tables"]["children"]["Row"];
type ChildRegistration = Database["public"]["Tables"]["child_registrations"]["Row"];

interface PendingParent extends Omit<Profile, 'email'> {
  email?: string | null;
}

interface AuthorizedPickup {
  id: string;
  full_name: string;
  relationship: string;
  document_url: string | null;
}

interface PendingChildRegistration extends ChildRegistration {
  parent_name?: string;
  parent_phone?: string;
  parent_cpf?: string;
  parent_rg?: string;
  parent_email?: string;
  authorized_pickups?: AuthorizedPickup[];
}

interface EditableRegistration {
  firstName: string;
  lastName: string;
  birthDate: string;
  cpf: string;
  rg: string;
  susCard: string;
  address: string;
  city: string;
  allergies: string;
  medications: string;
  continuousDoctors: string;
  privateDoctors: string;
  enrollmentType: string;
  planType: string | null;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<EditableRegistration | null>(null);
  const [dialogTab, setDialogTab] = useState<string>("info");

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
        setLoading(false);
        return;
      }

      // Fetch parent profiles for registrations
      const parentIds = [...new Set(regs.map((r) => r.parent_id))];
      const profilesLookupRes = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, cpf, rg")
        .in("user_id", parentIds);

      if (profilesLookupRes.error) throw profilesLookupRes.error;

      const profileMap = new Map(
        (profilesLookupRes.data || []).map((p) => [p.user_id, p])
      );

      // Fetch authorized pickups for all registrations
      const regIds = regs.map((r) => r.id);
      const pickupsRes = await supabase
        .from("authorized_pickups")
        .select("*")
        .in("registration_id", regIds);

      const pickupsMap = new Map<string, AuthorizedPickup[]>();
      if (pickupsRes.data) {
        pickupsRes.data.forEach((p) => {
          const existing = pickupsMap.get(p.registration_id) || [];
          existing.push(p);
          pickupsMap.set(p.registration_id, existing);
        });
      }

      // Fetch parent invites to get email and phone
      const invitesRes = await supabase
        .from("parent_invites")
        .select("used_by, email, phone")
        .in("used_by", parentIds);

      const invitesMap = new Map(
        (invitesRes.data || []).map((inv) => [inv.used_by, inv])
      );

      const registrationsWithParent = regs.map((reg) => {
        const parentProfile = profileMap.get(reg.parent_id);
        const parentInvite = invitesMap.get(reg.parent_id);
        return {
          ...reg,
          parent_name: parentProfile?.full_name || "Responsável",
          parent_phone: parentProfile?.phone || parentInvite?.phone || undefined,
          parent_cpf: parentProfile?.cpf || undefined,
          parent_rg: parentProfile?.rg || undefined,
          parent_email: parentInvite?.email || undefined,
          authorized_pickups: pickupsMap.get(reg.id) || [],
        };
      });

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

      // Link parent to child if selected (use upsert to avoid duplicate key error)
      if (selectedChildId) {
        // First check if link already exists
        const { data: existingLink } = await supabase
          .from("parent_children")
          .select("id")
          .eq("parent_id", selectedParent.user_id)
          .eq("child_id", selectedChildId)
          .maybeSingle();

        if (!existingLink) {
          const { error: linkError } = await supabase
            .from("parent_children")
            .insert({
              parent_id: selectedParent.user_id,
              child_id: selectedChildId,
              relationship: relationship,
            });

          if (linkError) throw linkError;
        } else {
          // Update relationship if link exists
          await supabase
            .from("parent_children")
            .update({ relationship: relationship })
            .eq("id", existingLink.id);
        }
      }

      // Send approval email to parent
      try {
        await supabase.functions.invoke("send-approval-email", {
          body: {
            parentId: selectedParent.user_id,
            parentName: selectedParent.full_name,
            approvalType: "parent",
          },
        });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        // Don't block approval if email fails
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
    setIsEditing(false);
    setDialogTab("info");
    
    // Initialize editable data
    setEditableData({
      firstName: registration.first_name,
      lastName: registration.last_name,
      birthDate: registration.birth_date,
      cpf: registration.cpf || "",
      rg: registration.rg || "",
      susCard: registration.sus_card || "",
      address: registration.address,
      city: registration.city,
      allergies: registration.allergies || "",
      medications: registration.medications || "",
      continuousDoctors: registration.continuous_doctors || "",
      privateDoctors: registration.private_doctors || "",
      enrollmentType: registration.enrollment_type,
      planType: registration.plan_type,
    });
    
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

  function handleEditableChange(field: keyof EditableRegistration, value: string | null) {
    if (!editableData) return;
    setEditableData({
      ...editableData,
      [field]: value,
    });
  }

  async function saveEditedData() {
    if (!selectedRegistration || !editableData) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("child_registrations")
        .update({
          first_name: editableData.firstName,
          last_name: editableData.lastName,
          birth_date: editableData.birthDate,
          cpf: editableData.cpf || null,
          rg: editableData.rg || null,
          sus_card: editableData.susCard || null,
          address: editableData.address,
          city: editableData.city,
          allergies: editableData.allergies || null,
          medications: editableData.medications || null,
          continuous_doctors: editableData.continuousDoctors || null,
          private_doctors: editableData.privateDoctors || null,
          enrollment_type: editableData.enrollmentType,
          plan_type: editableData.planType as any,
        })
        .eq("id", selectedRegistration.id);

      if (error) throw error;

      toast.success("Dados atualizados com sucesso!");
      setIsEditing(false);
      
      // Update local state
      setSelectedRegistration({
        ...selectedRegistration,
        first_name: editableData.firstName,
        last_name: editableData.lastName,
        birth_date: editableData.birthDate,
        cpf: editableData.cpf || null,
        rg: editableData.rg || null,
        sus_card: editableData.susCard || null,
        address: editableData.address,
        city: editableData.city,
        allergies: editableData.allergies || null,
        medications: editableData.medications || null,
        continuous_doctors: editableData.continuousDoctors || null,
        private_doctors: editableData.privateDoctors || null,
        enrollment_type: editableData.enrollmentType,
        plan_type: editableData.planType as any,
      });
      
      fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setActionLoading(false);
    }
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

      // Send approval email to parent (for child registration)
      try {
        await supabase.functions.invoke("send-approval-email", {
          body: {
            parentId: selectedRegistration.parent_id,
            parentName: selectedRegistration.parent_name || "Responsável",
            approvalType: "child",
            childName: `${selectedRegistration.first_name} ${selectedRegistration.last_name}`,
          },
        });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }

      // Fetch parent profile for contract preview (including email and relationship now)
      const { data: parentProfile } = await supabase
        .from("profiles")
        .select("full_name, cpf, rg, phone, email, relationship")
        .eq("user_id", selectedRegistration.parent_id)
        .single();

      // Get email from profile first, then fallback to parent_invites
      let parentEmail = parentProfile?.email || selectedRegistration.parent_email || '';
      
      // If email still not found, try to get it from parent_invites by used_by
      if (!parentEmail) {
        const { data: inviteData } = await supabase
          .from("parent_invites")
          .select("email")
          .eq("used_by", selectedRegistration.parent_id)
          .maybeSingle();
        parentEmail = inviteData?.email || '';
      }
      
      const parentPhone = parentProfile?.phone || selectedRegistration.parent_phone || '';
      const parentRelationship = parentProfile?.relationship || '';

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
        parentCpf: parentProfile?.cpf || selectedRegistration.parent_cpf || '',
        parentRg: parentProfile?.rg || selectedRegistration.parent_rg || '',
        parentPhone: parentPhone,
        parentEmail: parentEmail,
        parentRelationship: parentRelationship,
        address: selectedRegistration.address ? `${selectedRegistration.address}, ${selectedRegistration.city || 'Canoas/RS'}` : 'Canoas/RS',
        childName: `${selectedRegistration.first_name} ${selectedRegistration.last_name}`,
        childCpf: selectedRegistration.cpf || '',
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
      <Tabs defaultValue="pre-enrollments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pre-enrollments" className="flex items-center gap-2">
            <ClipboardPen className="w-4 h-4" />
            Pré-Matrículas
          </TabsTrigger>
          <TabsTrigger value="children" className="flex items-center gap-2">
            <Baby className="w-4 h-4" />
            Crianças ({pendingRegistrations.length})
          </TabsTrigger>
          <TabsTrigger value="parents" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Pais ({pendingParents.length})
          </TabsTrigger>
        </TabsList>

        {/* Pre-Enrollments Tab */}
        <TabsContent value="pre-enrollments">
          <PreEnrollmentsContent />
        </TabsContent>

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

      {/* Registration Approval Dialog - Enhanced */}
      <Dialog open={registrationDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
        }
        setRegistrationDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {isEditing ? "Editar Cadastro de Criança" : "Aprovar Cadastro de Criança"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Edite as informações antes de aprovar" : "Revise todas as informações e aprove o cadastro"}
                </DialogDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedRegistration && editableData && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="info" className="flex items-center gap-1 text-xs">
                    <Baby className="w-3 h-3" />
                    Criança
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="flex items-center gap-1 text-xs">
                    <FileCheck className="w-3 h-3" />
                    Documentos
                  </TabsTrigger>
                  <TabsTrigger value="health" className="flex items-center gap-1 text-xs">
                    <Heart className="w-3 h-3" />
                    Saúde
                  </TabsTrigger>
                  <TabsTrigger value="pickups" className="flex items-center gap-1 text-xs">
                    <Users className="w-3 h-3" />
                    Autorizados
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Informações Básicas */}
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input 
                            value={editableData.firstName} 
                            onChange={(e) => handleEditableChange("firstName", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Sobrenome</Label>
                          <Input 
                            value={editableData.lastName} 
                            onChange={(e) => handleEditableChange("lastName", e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  {isEditing && (
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input 
                        type="date"
                        value={editableData.birthDate} 
                        onChange={(e) => handleEditableChange("birthDate", e.target.value)}
                      />
                    </div>
                  )}

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Responsável pelo Cadastro</p>
                    <p className="font-semibold">{selectedRegistration.parent_name}</p>
                    {selectedRegistration.parent_phone && (
                      <p className="text-sm text-muted-foreground mt-1">Tel: {selectedRegistration.parent_phone}</p>
                    )}
                    {selectedRegistration.parent_cpf && (
                      <p className="text-sm text-muted-foreground">CPF: {selectedRegistration.parent_cpf}</p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Endereço</Label>
                        <Input 
                          value={editableData.address} 
                          onChange={(e) => handleEditableChange("address", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input 
                          value={editableData.city} 
                          onChange={(e) => handleEditableChange("city", e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Endereço</p>
                        <p className="font-semibold">{selectedRegistration.address}, {selectedRegistration.city}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <Label>Tipo de Vaga</Label>
                          <Select 
                            value={editableData.enrollmentType} 
                            onValueChange={(v) => handleEditableChange("enrollmentType", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="municipal">Prefeitura</SelectItem>
                              <SelectItem value="private">Particular</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {editableData.enrollmentType === "private" && (
                          <div className="space-y-2">
                            <Label>Plano</Label>
                            <Select 
                              value={editableData.planType || ""} 
                              onValueChange={(v) => handleEditableChange("planType", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar plano" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basico">Básico</SelectItem>
                                <SelectItem value="intermediario">Intermediário</SelectItem>
                                <SelectItem value="plus">Plus+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Tipo de Vaga</p>
                          <p className="font-semibold">
                            {selectedRegistration.enrollment_type === "municipal" ? "Prefeitura" : "Particular"}
                          </p>
                        </div>
                        {selectedRegistration.enrollment_type === "private" && (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Plano</p>
                            <p className="font-semibold">
                              {selectedRegistration.plan_type === "basico" ? "Básico" : 
                               selectedRegistration.plan_type === "intermediario" ? "Intermediário" : 
                               selectedRegistration.plan_type === "plus" ? "Plus+" : "-"}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Documentos */}
                <TabsContent value="docs" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <Label>CPF da Criança</Label>
                          <Input 
                            value={editableData.cpf} 
                            onChange={(e) => handleEditableChange("cpf", e.target.value)}
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>RG da Criança</Label>
                          <Input 
                            value={editableData.rg} 
                            onChange={(e) => handleEditableChange("rg", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cartão do SUS</Label>
                          <Input 
                            value={editableData.susCard} 
                            onChange={(e) => handleEditableChange("susCard", e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">CPF da Criança</p>
                          <p className="font-semibold">{selectedRegistration.cpf || "-"}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">RG da Criança</p>
                          <p className="font-semibold">{selectedRegistration.rg || "-"}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Cartão do SUS</p>
                          <p className="font-semibold">{selectedRegistration.sus_card || "-"}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {selectedRegistration.birth_certificate_url && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Certidão de Nascimento</p>
                      <a 
                        href={selectedRegistration.birth_certificate_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <FileCheck className="w-4 h-4" />
                        Ver documento
                      </a>
                    </div>
                  )}

                  {selectedRegistration.photo_url && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Foto da Criança</p>
                      <img 
                        src={selectedRegistration.photo_url} 
                        alt="Foto da criança"
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Saúde */}
                <TabsContent value="health" className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label>Alergias</Label>
                        <Textarea 
                          value={editableData.allergies} 
                          onChange={(e) => handleEditableChange("allergies", e.target.value)}
                          placeholder="Descreva as alergias, se houver"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Medicamentos de Uso Contínuo</Label>
                        <Textarea 
                          value={editableData.medications} 
                          onChange={(e) => handleEditableChange("medications", e.target.value)}
                          placeholder="Descreva os medicamentos, se houver"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Médicos de Uso Contínuo</Label>
                        <Input 
                          value={editableData.continuousDoctors} 
                          onChange={(e) => handleEditableChange("continuousDoctors", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Médicos Particulares</Label>
                        <Input 
                          value={editableData.privateDoctors} 
                          onChange={(e) => handleEditableChange("privateDoctors", e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedRegistration.allergies ? (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm font-medium text-destructive flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Alergias
                          </p>
                          <p className="mt-1">{selectedRegistration.allergies}</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Alergias</p>
                          <p className="font-semibold text-muted-foreground">Nenhuma informada</p>
                        </div>
                      )}

                      {selectedRegistration.medications ? (
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-sm font-medium text-primary">Medicamentos de Uso Contínuo</p>
                          <p className="mt-1">{selectedRegistration.medications}</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Medicamentos</p>
                          <p className="font-semibold text-muted-foreground">Nenhum informado</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Médicos de Uso Contínuo</p>
                          <p className="font-semibold">{selectedRegistration.continuous_doctors || "-"}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Médicos Particulares</p>
                          <p className="font-semibold">{selectedRegistration.private_doctors || "-"}</p>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Tab: Pessoas Autorizadas */}
                <TabsContent value="pickups" className="space-y-4">
                  {selectedRegistration.authorized_pickups && selectedRegistration.authorized_pickups.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Pessoas autorizadas a buscar a criança além do responsável principal:
                      </p>
                      {selectedRegistration.authorized_pickups.map((pickup, index) => (
                        <div key={pickup.id} className="p-4 bg-muted rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{pickup.full_name}</p>
                            <p className="text-sm text-muted-foreground">{pickup.relationship}</p>
                          </div>
                          {pickup.document_url && (
                            <a 
                              href={pickup.document_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              <FileCheck className="w-4 h-4" />
                              Documento
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhuma pessoa autorizada cadastrada além do responsável principal
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Turma e Turno - sempre visíveis */}
              <div className="mt-6 pt-6 border-t space-y-4">
                <h4 className="font-semibold">Definir Turma e Turno</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Turma *</Label>
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
                    <Label>Turno *</Label>
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
                  <Label>Relacionamento do Responsável</Label>
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

                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    <strong>Nota:</strong> Ao aprovar, a criança será automaticamente vinculada ao responsável <strong>{selectedRegistration.parent_name}</strong> com o relacionamento selecionado acima.
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar Edição
                </Button>
                <Button onClick={saveEditedData} disabled={actionLoading}>
                  {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRegistrationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleApproveRegistration} disabled={actionLoading}>
                  {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <FileText className="w-4 h-4 mr-2" />
                  Aprovar e Visualizar Contrato
                </Button>
              </>
            )}
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
