import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Baby, Plus, Loader2, Users, ClipboardList, Search, X } from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";
import { classTypeLabels } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Extracted components
import {
  ChildStatsCards,
  ChildTable,
  ChildFormDialog,
  LinkParentDialog,
  ChangeClassDialog,
} from "@/components/admin/children";
import ChildAttendanceTab from "@/components/admin/ChildAttendanceTab";
import { useChildren } from "@/hooks/useChildren";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];

export default function AdminChildren() {
  const {
    children,
    loading,
    refetch,
    getChildParents,
    getAvailableParentsForChild,
  } = useChildren();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  
  // Tab and filter states
  const [activeTab, setActiveTab] = useState("lista");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<ClassType | "all">("all");

  // Handlers
  const openEditDialog = (child: Child) => {
    setSelectedChild(child);
    setDialogOpen(true);
  };

  const openLinkDialog = (child: Child) => {
    setSelectedChild(child);
    setLinkDialogOpen(true);
  };

  const openClassDialog = (child: Child) => {
    setSelectedChild(child);
    setClassDialogOpen(true);
  };

  const openDeleteDialog = (child: Child) => {
    setSelectedChild(child);
    setDeleteDialogOpen(true);
  };

  const handleUnlinkParent = async (linkId: string) => {
    try {
      const { error } = await supabase.from("parent_children").delete().eq("id", linkId);
      if (error) throw error;
      toast.success("Vínculo removido");
      refetch();
    } catch (error) {
      console.error("Error unlinking parent:", error);
      toast.error("Erro ao remover vínculo");
    }
  };

  const handleDeleteChild = async () => {
    if (!selectedChild) return;

    try {
      // Clear linked references in billing tables first
      await supabase
        .from("asaas_payments")
        .update({ linked_child_id: null })
        .eq("linked_child_id", selectedChild.id);

      await supabase
        .from("asaas_subscriptions")
        .update({ linked_child_id: null })
        .eq("linked_child_id", selectedChild.id);

      // Remove parent-child links
      await supabase
        .from("parent_children")
        .delete()
        .eq("child_id", selectedChild.id);

      // Clear references in other related tables
      await supabase
        .from("invoices")
        .delete()
        .eq("child_id", selectedChild.id);

      await supabase
        .from("enrollment_contracts")
        .update({ child_id: null })
        .eq("child_id", selectedChild.id);

      // Then delete the child
      const { error } = await supabase.from("children").delete().eq("id", selectedChild.id);

      if (error) throw error;

      toast.success("Criança removida com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedChild(null);
      refetch();
    } catch (error) {
      console.error("Error deleting child:", error);
      toast.error("Erro ao remover criança");
    }
  };

  // Filter children based on search and class filter
  const filteredChildren = children.filter((child) => {
    const matchesSearch = searchQuery === "" || 
      child.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === "all" || child.class_type === filterClass;
    return matchesSearch && matchesClass;
  });

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
        <Button onClick={() => { setSelectedChild(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Criança
        </Button>
      </div>

      {/* Stats */}
      <ChildStatsCards children={children} />

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Crianças Matriculadas</CardTitle>
                  <CardDescription>Lista de todas as crianças cadastradas</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 w-full sm:w-64"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {/* Class Filter */}
                  <Select 
                    value={filterClass} 
                    onValueChange={(v) => setFilterClass(v as ClassType | "all")}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filtrar turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as turmas</SelectItem>
                      {Constants.public.Enums.class_type.map((type) => (
                        <SelectItem key={type} value={type}>
                          {classTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredChildren.length === 0 && children.length === 0 ? (
                <div className="text-center py-12">
                  <Baby className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Nenhuma criança cadastrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique no botão acima para adicionar
                  </p>
                </div>
              ) : filteredChildren.length === 0 ? (
                <div className="text-center py-12">
                  <Baby className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Nenhuma criança encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Tente ajustar os filtros de busca
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearchQuery(""); setFilterClass("all"); }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <ChildTable
                  children={filteredChildren}
                  getChildParents={getChildParents}
                  onEdit={openEditDialog}
                  onLink={openLinkDialog}
                  onChangeClass={openClassDialog}
                  onDelete={openDeleteDialog}
                  onUnlinkParent={handleUnlinkParent}
                />
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

      {/* Dialogs */}
      <ChildFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        child={selectedChild}
        onSuccess={refetch}
      />

      <LinkParentDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        child={selectedChild}
        availableParents={selectedChild ? getAvailableParentsForChild(selectedChild.id) : []}
        onSuccess={refetch}
      />

      <ChangeClassDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        child={selectedChild}
        onSuccess={refetch}
      />

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
