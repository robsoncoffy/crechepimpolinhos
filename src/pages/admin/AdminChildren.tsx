import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Baby, Plus, Trash2, Loader2, Edit, Users, Link2 } from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";
import { classTypeLabels, shiftTypeLabels, calculateAge } from "@/lib/constants";

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
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [childrenRes, parentsRes, linksRes] = await Promise.all([
        supabase.from("children").select("*").order("full_name"),
        supabase.from("profiles").select("id, user_id, full_name").eq("status", "approved"),
        supabase.from("parent_children").select("*"),
      ]);

      if (childrenRes.data) setChildren(childrenRes.data);
      if (parentsRes.data) setParents(parentsRes.data);
      if (linksRes.data) setParentLinks(linksRes.data);
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
    setLinkDialogOpen(true);
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
    if (!selectedChild || !linkData.parent_id) return;

    setFormLoading(true);
    try {
      const { error } = await supabase.from("parent_children").insert({
        child_id: selectedChild.id,
        parent_id: linkData.parent_id,
        relationship: linkData.relationship,
      });

      if (error) throw error;

      toast.success("Responsável vinculado com sucesso!");
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

      {/* Children List */}
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
                            onClick={() => openLinkDialog(child)}
                            title="Vincular Responsável"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(child)}
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

      {/* Link Parent Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Responsável</DialogTitle>
            <DialogDescription>
              Vincule um responsável aprovado à criança {selectedChild?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={linkData.parent_id} onValueChange={(v) => setLinkData({ ...linkData, parent_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((parent) => (
                    <SelectItem key={parent.user_id} value={parent.user_id}>
                      {parent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Relacionamento</Label>
              <Select
                value={linkData.relationship}
                onValueChange={(v) => setLinkData({ ...linkData, relationship: v })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLinkParent} disabled={formLoading || !linkData.parent_id}>
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
    </div>
  );
}
