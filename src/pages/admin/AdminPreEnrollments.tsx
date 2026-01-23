import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, UserPlus, Mail, Phone, Calendar, GraduationCap, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, MessageSquare, AlertCircle, Building2, Landmark } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PreEnrollment = Database["public"]["Tables"]["pre_enrollments"]["Row"];

const classLabels: Record<string, string> = {
  bercario1: "Berçário 1",
  bercario2: "Berçário 2",
  maternal1: "Maternal 1",
  maternal2: "Maternal 2",
  jardim1: "Jardim 1",
  jardim2: "Jardim 2",
};

const shiftLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  contacted: { label: "Contactado", variant: "outline" },
  converted: { label: "Convertido", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

const vacancyTypeLabels: Record<string, { label: string; icon: typeof Building2 }> = {
  particular: { label: "Particular", icon: Building2 },
  municipal: { label: "Municipal", icon: Landmark },
};

export default function AdminPreEnrollments() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPreEnrollment, setSelectedPreEnrollment] = useState<PreEnrollment | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  
  // Get filter from URL params
  const vacancyFilter = searchParams.get("tipo") || "all";

  const { data: preEnrollments, isLoading } = useQuery({
    queryKey: ["pre-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_enrollments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PreEnrollment[];
    },
  });

  // Mutation to sync a single pre-enrollment to GHL
  const syncToGhlMutation = useMutation({
    mutationFn: async (preEnrollmentId: string) => {
      const { data, error } = await supabase.functions.invoke("ghl-sync-contact", {
        body: { preEnrollmentId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Falha ao sincronizar");
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pre-enrollments"] });
      toast.success("Contato sincronizado com GoHighLevel!");
    },
    onError: (error) => {
      console.error("GHL sync error:", error);
      toast.error("Erro ao sincronizar com GoHighLevel");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (preEnrollment: PreEnrollment) => {
      // Generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      // Create parent invite linked to pre-enrollment
      const { data: invite, error: inviteError } = await supabase
        .from("parent_invites")
        .insert({
          invite_code: inviteCode,
          email: preEnrollment.email,
          phone: preEnrollment.phone,
          child_name: preEnrollment.child_name,
          expires_at: expiresAt.toISOString(),
          pre_enrollment_id: preEnrollment.id,
          notes: `Convertido da pré-matrícula. Turma desejada: ${classLabels[preEnrollment.desired_class_type] || preEnrollment.desired_class_type}, Turno: ${shiftLabels[preEnrollment.desired_shift_type] || preEnrollment.desired_shift_type}`,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Update pre-enrollment status and link to invite
      const { error: updateError } = await supabase
        .from("pre_enrollments")
        .update({
          status: "converted",
          converted_to_invite_id: invite.id,
        })
        .eq("id", preEnrollment.id);

      if (updateError) throw updateError;

      // Update GHL stage if synced
      if (preEnrollment.ghl_contact_id) {
        try {
          await supabase.functions.invoke("ghl-sync-contact", {
            body: {
              ghl_contact_id: preEnrollment.ghl_contact_id,
              stage: "Proposta Enviada",
            },
          });
        } catch (e) {
          console.error("Failed to update GHL stage:", e);
        }
      }

      // Send invite email
      const { error: emailError } = await supabase.functions.invoke("send-parent-invite-email", {
        body: {
          email: preEnrollment.email,
          inviteCode: inviteCode,
          childName: preEnrollment.child_name,
          parentName: preEnrollment.parent_name,
        },
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        // Don't throw, invite was created successfully
      }

      return { invite, emailSent: !emailError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pre-enrollments"] });
      toast.success(
        result.emailSent
          ? "Convite criado e email enviado com sucesso!"
          : "Convite criado! (Falha ao enviar email, verifique a configuração)"
      );
      setIsConvertDialogOpen(false);
      setSelectedPreEnrollment(null);
    },
    onError: (error) => {
      console.error("Error converting pre-enrollment:", error);
      toast.error("Erro ao converter pré-matrícula em convite");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("pre_enrollments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-enrollments"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const filteredPreEnrollments = preEnrollments?.filter((pe) => {
    // First filter by vacancy type
    if (vacancyFilter !== "all" && pe.vacancy_type !== vacancyFilter) {
      return false;
    }
    
    // Then filter by search term
    const search = searchTerm.toLowerCase();
    return (
      pe.parent_name.toLowerCase().includes(search) ||
      pe.child_name.toLowerCase().includes(search) ||
      pe.email.toLowerCase().includes(search) ||
      pe.phone.includes(search)
    );
  });

  const handleVacancyFilterChange = (value: string) => {
    if (value === "all") {
      searchParams.delete("tipo");
    } else {
      searchParams.set("tipo", value);
    }
    setSearchParams(searchParams);
  };

  const handleConvert = (preEnrollment: PreEnrollment) => {
    setSelectedPreEnrollment(preEnrollment);
    setIsConvertDialogOpen(true);
  };

  const confirmConvert = () => {
    if (selectedPreEnrollment) {
      convertMutation.mutate(selectedPreEnrollment);
    }
  };

  // Render GHL sync status indicator
  const renderGhlStatus = (pe: PreEnrollment) => {
    if (pe.ghl_contact_id) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-primary">
              <MessageSquare className="h-4 w-4" />
              <CheckCircle2 className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sincronizado com GHL</p>
            <p className="text-xs text-muted-foreground">
              {pe.ghl_synced_at && format(new Date(pe.ghl_synced_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (pe.ghl_sync_error) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-destructive">
              <MessageSquare className="h-4 w-4" />
              <AlertCircle className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Erro ao sincronizar</p>
            <p className="text-xs text-muted-foreground max-w-[200px] truncate">
              {pe.ghl_sync_error}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => syncToGhlMutation.mutate(pe.id)}
            disabled={syncToGhlMutation.isPending}
          >
            {syncToGhlMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sincronizar com GHL</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pré-Matrículas</h1>
          <p className="text-muted-foreground">
            Gerencie as pré-matrículas recebidas pelo site e converta-as em convites
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Lista de Pré-Matrículas</CardTitle>
                <CardDescription>
                  {filteredPreEnrollments?.length || 0} de {preEnrollments?.length || 0} pré-matrículas
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Tabs value={vacancyFilter} onValueChange={handleVacancyFilterChange}>
                  <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="particular" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      Particular
                    </TabsTrigger>
                    <TabsTrigger value="municipal" className="gap-1">
                      <Landmark className="h-3 w-3" />
                      Municipal
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPreEnrollments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || vacancyFilter !== "all" ? "Nenhuma pré-matrícula encontrada com os filtros atuais" : "Nenhuma pré-matrícula registrada ainda"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Criança</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Turma/Turno</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>GHL</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreEnrollments?.map((pe) => {
                      const VacancyIcon = vacancyTypeLabels[pe.vacancy_type || "particular"]?.icon || Building2;
                      const vacancyLabel = vacancyTypeLabels[pe.vacancy_type || "particular"]?.label || "Particular";
                      
                      return (
                      <TableRow key={pe.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(pe.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={pe.vacancy_type === "municipal" ? "secondary" : "outline"}
                            className="gap-1"
                          >
                            <VacancyIcon className="h-3 w-3" />
                            {vacancyLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{pe.parent_name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pe.child_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Nasc: {format(new Date(pe.child_birth_date), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {pe.email}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {pe.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {classLabels[pe.desired_class_type] || pe.desired_class_type}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {shiftLabels[pe.desired_shift_type] || pe.desired_shift_type}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusLabels[pe.status]?.variant || "secondary"}>
                            {statusLabels[pe.status]?.label || pe.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pe.vacancy_type === "municipal" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Landmark className="h-4 w-4" />
                                  <span className="text-xs">N/A</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Vagas municipais não são sincronizadas com GHL</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            renderGhlStatus(pe)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {pe.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatusMutation.mutate({ id: pe.id, status: "rejected" })}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeitar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleConvert(pe)}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Aceitar
                                </Button>
                              </>
                            )}
                            {pe.status === "contacted" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatusMutation.mutate({ id: pe.id, status: "rejected" })}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeitar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleConvert(pe)}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Aceitar
                                </Button>
                              </>
                            )}
                            {pe.status === "converted" && (
                              <span className="flex items-center text-sm text-primary">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Aceito
                              </span>
                            )}
                            {pe.status === "rejected" && (
                              <span className="flex items-center text-sm text-destructive">
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitado
                              </span>
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
      </div>

      {/* Convert Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar Pré-Matrícula</DialogTitle>
            <DialogDescription>
              Um convite será criado e enviado por email para o responsável realizar o cadastro completo.
            </DialogDescription>
          </DialogHeader>

          {selectedPreEnrollment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Responsável:</span>
                  <p className="text-muted-foreground">{selectedPreEnrollment.parent_name}</p>
                </div>
                <div>
                  <span className="font-medium">Criança:</span>
                  <p className="text-muted-foreground">{selectedPreEnrollment.child_name}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-muted-foreground">{selectedPreEnrollment.email}</p>
                </div>
                <div>
                  <span className="font-medium">Telefone:</span>
                  <p className="text-muted-foreground">{selectedPreEnrollment.phone}</p>
                </div>
                <div>
                  <span className="font-medium">Turma Desejada:</span>
                  <p className="text-muted-foreground">{classLabels[selectedPreEnrollment.desired_class_type] || selectedPreEnrollment.desired_class_type}</p>
                </div>
                <div>
                  <span className="font-medium">Turno Desejado:</span>
                  <p className="text-muted-foreground">{shiftLabels[selectedPreEnrollment.desired_shift_type] || selectedPreEnrollment.desired_shift_type}</p>
                </div>
              </div>

              {selectedPreEnrollment.ghl_contact_id && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm text-primary">
                  <MessageSquare className="h-4 w-4" />
                  <span>Contato sincronizado com GoHighLevel</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmConvert} disabled={convertMutation.isPending}>
              {convertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aceitar e Enviar Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}