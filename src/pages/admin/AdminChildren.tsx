import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Baby, Plus, Trash2, Loader2, Edit, Users, Link2, ClipboardList, GraduationCap } from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";
import { classTypeLabels, shiftTypeLabels, calculateAge } from "@/lib/constants";
import ChildAttendanceTab from "@/components/admin/ChildAttendanceTab";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface ParentChild {
  id: string;
  parent_id: string;
  child_id: string;
  relationship: string;
  profile?: Profile;
}

export default function AdminChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [parentLinks, setParentLinks] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("lista");
  const [newClassType, setNewClassType] = useState<ClassType>("bercario");
  const [newShiftType, setNewShiftType] = useState<ShiftType>("integral");

  const [formData, setFormData] = useState({
    full_name: "",
    birth_date: "",
    class_type: "bercario" as ClassType,
    shift_type: "integral" as ShiftType,
    allergies: "",
    medical_info: "",
    pediatrician_name: "",
    pediatrician_phone: "",
    authorized_pickups: "",
  });

  const [linkData, setLinkData] = useState({
    parent_id: "",
    relationship: "responsável",
  });

  // For multiple guardian linking
  const [multiLinkData, setMultiLinkData] = useState<Array<{ parent_id: string; relationship: string }>>([
    { parent_id: "", relationship: "responsável" }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch children, profiles, parent-child links, and user roles in parallel
      const [childrenRes, parentsRes, linksRes, rolesRes] = await Promise.all([
        supabase.from("children").select("*").order("full_name"),
        supabase.from("profiles").select("id, user_id, full_name").eq("status", "approved"),
        supabase.from("parent_children").select("*"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (childrenRes.data) setChildren(childrenRes.data);
      if (linksRes.data) setParentLinks(linksRes.data);
      
      // Filter parents: only include users who have the 'parent' role and NO staff roles
      if (parentsRes.data && rolesRes.data) {
        const staffRoles = ['admin', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar'];
        
        // Create a map of user_id to their roles
        const userRolesMap = new Map<string, string[]>();
        rolesRes.data.forEach((r) => {
          const existing = userRolesMap.get(r.user_id) || [];
          existing.push(r.role);
          userRolesMap.set(r.user_id, existing);
        });
        
        // Filter to only include users who:
        // 1. Have the 'parent' role
        // 2. Do NOT have any staff roles
        const filteredParents = parentsRes.data.filter((p) => {
          const roles = userRolesMap.get(p.user_id) || [];
          const hasParentRole = roles.includes('parent');
          const hasStaffRole = roles.some((r) => staffRoles.includes(r));
          return hasParentRole && !hasStaffRole;
        });
        
        setParents(filteredParents);
      } else if (parentsRes.data) {
        setParents(parentsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      full_name: "",
      birth_date: "",
      class_type: "bercario",
      shift_type: "integral",
      allergies: "",
      medical_info: "",
      pediatrician_name: "",
      pediatrician_phone: "",
      authorized_pickups: "",
    });
    setEditMode(false);
    setSelectedChild(null);
  }

  function openEditDialog(child: Child) {
    setSelectedChild(child);
    setFormData({
      full_name: child.full_name,
      birth_date: child.birth_date,
      class_type: child.class_type,
      shift_type: child.shift_type,
      allergies: child.allergies || "",
      medical_info: child.medical_info || "",
      pediatrician_name: child.pediatrician_name || "",
      pediatrician_phone: child.pediatrician_phone || "",
      authorized_pickups: child.authorized_pickups?.join(", ") || "",
    });
    setEditMode(true);
    setDialogOpen(true);
  }

  function openLinkDialog(child: Child) {
    setSelectedChild(child);
    setLinkData({ parent_id: "", relationship: "responsável" });
    setMultiLinkData([{ parent_id: "", relationship: "responsável" }]);
    setLinkDialogOpen(true);
  }

  function getAvailableParentsForChild(childId: string) {
    // Get IDs of parents already linked to this child
    const linkedParentIds = parentLinks
      .filter((l) => l.child_id === childId)
      .map((l) => l.parent_id);
    
    // Filter out already linked parents
    return parents.filter((p) => !linkedParentIds.includes(p.user_id));
  }

  function addGuardianRow() {
    setMultiLinkData([...multiLinkData, { parent_id: "", relationship: "responsável" }]);
  }

  function removeGuardianRow(index: number) {
    if (multiLinkData.length > 1) {
      setMultiLinkData(multiLinkData.filter((_, i) => i !== index));
    }
  }

  function updateGuardianRow(index: number, field: 'parent_id' | 'relationship', value: string) {
    const updated = [...multiLinkData];
    updated[index][field] = value;
    setMultiLinkData(updated);
  }

  function openClassDialog(child: Child) {
    setSelectedChild(child);
    setNewClassType(child.class_type);
    setNewShiftType(child.shift_type);
    setClassDialogOpen(true);
  }

  async function handleChangeClass() {
    if (!selectedChild) return;

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          class_type: newClassType,
          shift_type: newShiftType,
        })
        .eq("id", selectedChild.id);

      if (error) throw error;

      toast.success("Turma atualizada com sucesso!");
      setClassDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error changing class:", error);
      toast.error(error.message || "Erro ao atualizar turma");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    try {
      const childData = {
        full_name: formData.full_name,
        birth_date: formData.birth_date,
        class_type: formData.class_type,
        shift_type: formData.shift_type,
        allergies: formData.allergies || null,
        medical_info: formData.medical_info || null,
        pediatrician_name: formData.pediatrician_name || null,
        pediatrician_phone: formData.pediatrician_phone || null,
        authorized_pickups: formData.authorized_pickups
          ? formData.authorized_pickups.split(",").map((s) => s.trim())
          : null,
      };

      if (editMode && selectedChild) {
        const { error } = await supabase
          .from("children")
          .update(childData)
          .eq("id", selectedChild.id);

        if (error) throw error;
        toast.success("Criança atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("children").insert(childData);

        if (error) throw error;
        toast.success("Criança cadastrada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving child:", error);
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleLinkParent() {
    if (!selectedChild) return;

    // Filter valid entries (those with a parent selected)
    const validLinks = multiLinkData.filter((link) => link.parent_id);
    
    if (validLinks.length === 0) {
      toast.error("Selecione ao menos um responsável");
      return;
    }

    setFormLoading(true);
    try {
      const insertData = validLinks.map((link) => ({
        child_id: selectedChild.id,
        parent_id: link.parent_id,
        relationship: link.relationship,
      }));

      const { error } = await supabase.from("parent_children").insert(insertData);

      if (error) throw error;

      toast.success(
        validLinks.length === 1
          ? "Responsável vinculado com sucesso!"
          : `${validLinks.length} responsáveis vinculados com sucesso!`
      );
      setLinkDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error linking parent:", error);
      toast.error(error.message || "Erro ao vincular responsável");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUnlinkParent(linkId: string) {
    try {
      const { error } = await supabase.from("parent_children").delete().eq("id", linkId);

      if (error) throw error;

      toast.success("Vínculo removido");
      fetchData();
    } catch (error) {
      console.error("Error unlinking parent:", error);
      toast.error("Erro ao remover vínculo");
    }
  }

  async function handleDeleteChild() {
    if (!selectedChild) return;

    try {
      const { error } = await supabase.from("children").delete().eq("id", selectedChild.id);

      if (error) throw error;

      toast.success("Criança removida com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedChild(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting child:", error);
      toast.error("Erro ao remover criança");
    }
  }

  function getChildParents(childId: string) {
    const links = parentLinks.filter((l) => l.child_id === childId);
    return links.map((link) => {
      const parent = parents.find((p) => p.user_id === link.parent_id);
      return { ...link, profile: parent };
    });
  }

  // calculateAge is now imported from @/lib/constants

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
            Crianças
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as crianças matriculadas
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Criança
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? "Editar Criança" : "Cadastrar Criança"}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Atualize os dados da criança"
                  : "Preencha os dados para matricular uma nova criança"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento *</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) =>
                        setFormData({ ...formData, birth_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Turma *</Label>
                    <Select
                      value={formData.class_type}
                      onValueChange={(value: ClassType) =>
                        setFormData({ ...formData, class_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.class_type.map((type) => (
                          <SelectItem key={type} value={type}>
                            {classTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Turno *</Label>
                    <Select
                      value={formData.shift_type}
                      onValueChange={(value: ShiftType) =>
                        setFormData({ ...formData, shift_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.shift_type.map((type) => (
                          <SelectItem key={type} value={type}>
                            {shiftTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) =>
                      setFormData({ ...formData, allergies: e.target.value })
                    }
                    placeholder="Descreva alergias alimentares, medicamentosas, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_info">Informações Médicas</Label>
                  <Textarea
                    id="medical_info"
                    value={formData.medical_info}
                    onChange={(e) =>
                      setFormData({ ...formData, medical_info: e.target.value })
                    }
                    placeholder="Medicações de uso contínuo, condições especiais, etc."
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pediatrician_name">Nome do Pediatra</Label>
                    <Input
                      id="pediatrician_name"
                      value={formData.pediatrician_name}
                      onChange={(e) =>
                        setFormData({ ...formData, pediatrician_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pediatrician_phone">Telefone do Pediatra</Label>
                    <Input
                      id="pediatrician_phone"
                      value={formData.pediatrician_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, pediatrician_phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authorized_pickups">
                    Pessoas Autorizadas a Buscar (separadas por vírgula)
                  </Label>
                  <Input
                    id="authorized_pickups"
                    value={formData.authorized_pickups}
                    onChange={(e) =>
                      setFormData({ ...formData, authorized_pickups: e.target.value })
                    }
                    placeholder="Maria Silva, João Santos"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editMode ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-primary/10">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">{children.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        {Constants.public.Enums.class_type.map((type) => (
          <Card key={type}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div
                className={`p-3 rounded-full ${
                  type === "bercario"
                    ? "bg-pimpo-yellow/10"
                    : type === "maternal"
                    ? "bg-pimpo-green/10"
                    : "bg-pimpo-red/10"
                }`}
              >
                <Baby
                  className={`w-6 h-6 ${
                    type === "bercario"
                      ? "text-pimpo-yellow"
                      : type === "maternal"
                      ? "text-pimpo-green"
                      : "text-pimpo-red"
                  }`}
                />
              </div>
              <div>
                <p className="text-2xl font-fredoka font-bold">
                  {children.filter((c) => c.class_type === type).length}
                </p>
                <p className="text-sm text-muted-foreground">{classTypeLabels[type]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for Lista and Frequência */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Lista de Crianças
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Frequência
          </TabsTrigger>
        </TabsList>

        {/* Tab: Lista de Crianças */}
        <TabsContent value="lista" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Crianças Matriculadas</CardTitle>
              <CardDescription>Lista de todas as crianças cadastradas</CardDescription>
            </CardHeader>
            <CardContent>
          {children.length === 0 ? (
            <div className="text-center py-12">
              <Baby className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma criança cadastrada</h3>
              <p className="text-muted-foreground mb-4">
                Clique no botão acima para adicionar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Responsáveis</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((child) => {
                  const childParents = getChildParents(child.id);
                  return (
                    <TableRow key={child.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Baby className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{child.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{calculateAge(child.birth_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{classTypeLabels[child.class_type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{shiftTypeLabels[child.shift_type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {childParents.length === 0 ? (
                            <span className="text-sm text-muted-foreground">-</span>
                          ) : (
                            childParents.map((cp) => (
                              <div
                                key={cp.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span>
                                  {cp.profile?.full_name} ({cp.relationship})
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleUnlinkParent(cp.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openClassDialog(child)}
                            title="Mudar Turma/Turno"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openLinkDialog(child)}
                            title="Vincular Responsável"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(child)}
                            title="Editar Dados"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedChild(child);
                              setDeleteDialogOpen(true);
                            }}
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Tab: Frequência */}
        <TabsContent value="frequencia" className="mt-6">
          <ChildAttendanceTab children={children.map(c => ({
            id: c.id,
            full_name: c.full_name,
            class_type: c.class_type,
            shift_type: c.shift_type
          }))} />
        </TabsContent>
      </Tabs>

      {/* Link Parent Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Responsáveis</DialogTitle>
            <DialogDescription>
              Vincule um ou mais responsáveis à criança {selectedChild?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {(() => {
              const availableParents = selectedChild 
                ? getAvailableParentsForChild(selectedChild.id)
                : parents;
              
              // Also filter out parents already selected in other rows
              const getFilteredParents = (currentIndex: number) => {
                const selectedInOtherRows = multiLinkData
                  .filter((_, i) => i !== currentIndex)
                  .map((link) => link.parent_id)
                  .filter(Boolean);
                return availableParents.filter((p) => !selectedInOtherRows.includes(p.user_id));
              };

              if (availableParents.length === 0) {
                return (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Todos os responsáveis disponíveis já estão vinculados a esta criança.</p>
                  </div>
                );
              }

              return (
                <>
                  {multiLinkData.map((link, index) => {
                    const filteredParents = getFilteredParents(index);
                    return (
                      <div key={index} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex-1 space-y-2">
                          <Label>Responsável</Label>
                          <Select 
                            value={link.parent_id} 
                            onValueChange={(v) => updateGuardianRow(index, 'parent_id', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredParents.map((parent) => (
                                <SelectItem key={parent.user_id} value={parent.user_id}>
                                  {parent.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-36 space-y-2">
                          <Label>Relacionamento</Label>
                          <Select
                            value={link.relationship}
                            onValueChange={(v) => updateGuardianRow(index, 'relationship', v)}
                          >
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
                        {multiLinkData.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeGuardianRow(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Add more button - only show if there are more parents available */}
                  {(() => {
                    const selectedCount = multiLinkData.filter((l) => l.parent_id).length;
                    const canAddMore = selectedCount < availableParents.length;
                    return canAddMore && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={addGuardianRow}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar outro responsável
                      </Button>
                    );
                  })()}
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleLinkParent} 
              disabled={formLoading || multiLinkData.every((l) => !l.parent_id)}
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Criança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedChild?.full_name}?
              Esta ação não pode ser desfeita e todos os registros serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChild}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Class Dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar Turma/Turno</DialogTitle>
            <DialogDescription>
              Altere a turma e o turno de {selectedChild?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={newClassType} onValueChange={(v) => setNewClassType(v as ClassType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.class_type.map((type) => (
                    <SelectItem key={type} value={type}>
                      {classTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={newShiftType} onValueChange={(v) => setNewShiftType(v as ShiftType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.shift_type.map((type) => (
                    <SelectItem key={type} value={type}>
                      {shiftTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangeClass} disabled={formLoading}>
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
