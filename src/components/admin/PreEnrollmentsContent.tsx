import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, UserPlus, Mail, Phone, Calendar, CheckCircle2, XCircle, Loader2, RefreshCw, MessageSquare, AlertCircle, Building2, Landmark } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PreEnrollment = Database["public"]["Tables"]["pre_enrollments"]["Row"];

const classLabels: Record<string, string> = {
  bercario: "Berçário",
  bercario1: "Berçário 1",
  bercario2: "Berçário 2",
  maternal: "Maternal",
  maternal1: "Maternal 1",
  maternal2: "Maternal 2",
  jardim: "Jardim",
  jardim1: "Jardim 1",
  jardim2: "Jardim 2",
};

// Helper function to calculate correct class based on birth date (5-class structure)
function calculateClassFromBirthDate(birthDate: string): { classType: string; label: string } {
  const birth = new Date(birthDate);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  
  // Berçário: 0-2 anos (0-23 meses)
  // Maternal I: 2-3 anos (24-35 meses)
  // Maternal II: 3-4 anos (36-47 meses)
  // Jardim I: 4-5 anos (48-59 meses)
  // Jardim II: 5-6 anos (60+ meses)
  if (ageInMonths < 24) {
    return { classType: "bercario", label: "Berçário" };
  } else if (ageInMonths < 36) {
    return { classType: "maternal_1", label: "Maternal I" };
  } else if (ageInMonths < 48) {
    return { classType: "maternal_2", label: "Maternal II" };
  } else if (ageInMonths < 60) {
    return { classType: "jardim_1", label: "Jardim I" };
  } else {
    return { classType: "jardim_2", label: "Jardim II" };
  }
}

const shiftLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  contacted: { label: "Contactado", variant: "outline" },
  converted: { label: "Convertido", variant: "default" },
  enrolled: { label: "Aceito", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export function PreEnrollmentsContent() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPreEnrollment, setSelectedPreEnrollment] = useState<PreEnrollment | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [vacancyFilter, setVacancyFilter] = useState("particular");

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
    onSuccess: () => {
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
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: invite, error: inviteError } = await supabase
        .from("parent_invites")
        .insert({
          invite_code: inviteCode,
          email: preEnrollment.email,
          phone: preEnrollment.phone,
          child_name: preEnrollment.child_name,
          expires_at: expiresAt.toISOString(),
          pre_enrollment_id: preEnrollment.id,
          notes: `Convertido da pré-matrícula. Tipo de vaga: ${preEnrollment.vacancy_type === "municipal" ? "Municipal" : "Particular"}`,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      const { error: updateError } = await supabase
        .from("pre_enrollments")
        .update({
          status: "enrolled",
          converted_to_invite_id: invite.id,
        })
        .eq("id", preEnrollment.id);

      if (updateError) throw updateError;

      if (preEnrollment.ghl_contact_id) {
        try {
          await supabase.functions.invoke("ghl-sync-contact/update-stage", {
            body: {
              ghl_contact_id: preEnrollment.ghl_contact_id,
              stage: "Proposta Enviada",
              tags: ["pre_matricula_aprovada"],
            },
          });
        } catch (e) {
          console.error("Failed to update GHL stage/tags:", e);
        }
      }

      const { error: emailError } = await supabase.functions.invoke("send-parent-invite-email", {
        body: {
          email: preEnrollment.email,
          phone: preEnrollment.phone,
          inviteCode: inviteCode,
          childName: preEnrollment.child_name,
          parentName: preEnrollment.parent_name,
        },
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
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

  const resendEmailMutation = useMutation({
    mutationFn: async (preEnrollment: PreEnrollment) => {
      const { data: invite, error: inviteError } = await supabase
        .from("parent_invites")
        .select("invite_code")
        .eq("pre_enrollment_id", preEnrollment.id)
        .maybeSingle();

      if (inviteError) throw inviteError;
      if (!invite) throw new Error("Convite não encontrado");

      const { error: emailError } = await supabase.functions.invoke("send-parent-invite-email", {
        body: {
          email: preEnrollment.email,
          phone: preEnrollment.phone,
          inviteCode: invite.invite_code,
          childName: preEnrollment.child_name,
          parentName: preEnrollment.parent_name,
        },
      });

      if (emailError) throw emailError;
    },
    onSuccess: () => {
      toast.success("E-mail reenviado com sucesso!");
    },
    onError: (error) => {
      console.error("Error resending email:", error);
      toast.error("Erro ao reenviar e-mail");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("pre_enrollments")
        .update({ converted_to_invite_id: null })
        .eq("id", id);

      const { error: inviteDeleteError } = await supabase
        .from("parent_invites")
        .delete()
        .eq("pre_enrollment_id", id);

      if (inviteDeleteError) {
        console.error("Error deleting linked invite:", inviteDeleteError);
      }

      const { error } = await supabase
        .from("pre_enrollments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-enrollments"] });
      toast.success("Pré-matrícula rejeitada e excluída!");
    },
    onError: (error) => {
      console.error("Error deleting pre-enrollment:", error);
      toast.error("Erro ao excluir pré-matrícula");
    },
  });

  const filteredPreEnrollments = preEnrollments?.filter((pe) => {
    if (pe.vacancy_type !== vacancyFilter) {
      return false;
    }
    
    const search = searchTerm.toLowerCase();
    return (
      pe.parent_name.toLowerCase().includes(search) ||
      pe.child_name.toLowerCase().includes(search) ||
      pe.email.toLowerCase().includes(search) ||
      pe.phone.includes(search)
    );
  });

  const particularCount = preEnrollments?.filter(pe => pe.vacancy_type === "particular" && pe.status === "pending").length || 0;
  const municipalCount = preEnrollments?.filter(pe => pe.vacancy_type === "municipal" && pe.status === "pending").length || 0;

  const handleConvert = (preEnrollment: PreEnrollment) => {
    setSelectedPreEnrollment(preEnrollment);
    setIsConvertDialogOpen(true);
  };

  const confirmConvert = () => {
    if (selectedPreEnrollment) {
      convertMutation.mutate(selectedPreEnrollment);
    }
  };

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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pré-Matrículas</CardTitle>
          <CardDescription>
            Gerencie as pré-matrículas recebidas pelo site e converta-as em convites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={vacancyFilter} onValueChange={setVacancyFilter} className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <TabsList className="grid w-full md:w-auto grid-cols-2">
                <TabsTrigger value="particular" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Particulares
                  {particularCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{particularCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="municipal" className="gap-2">
                  <Landmark className="h-4 w-4" />
                  Municipais
                  {municipalCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{municipalCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPreEnrollments?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhuma pré-matrícula encontrada" : `Nenhuma pré-matrícula ${vacancyFilter === "particular" ? "particular" : "municipal"} registrada ainda`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Criança</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    {vacancyFilter === "particular" && <TableHead>GHL</TableHead>}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPreEnrollments?.map((pe) => (
                    <TableRow key={pe.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(pe.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {(pe as any).cpf || "-"}
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
                        <Badge variant={statusLabels[pe.status]?.variant || "secondary"}>
                          {statusLabels[pe.status]?.label || pe.status}
                        </Badge>
                      </TableCell>
                      {vacancyFilter === "particular" && (
                        <TableCell>
                          {renderGhlStatus(pe)}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {pe.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(pe.id)}
                                disabled={deleteMutation.isPending}
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
                          {(pe.status === "converted" || pe.status === "enrolled") && (
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resendEmailMutation.mutate(pe)}
                                    disabled={resendEmailMutation.isPending}
                                  >
                                    {resendEmailMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar e-mail de convite</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteMutation.mutate(pe.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar pré-matrícula</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                          {pe.status === "cancelled" && (
                            <span className="flex items-center text-sm text-destructive">
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelado
                            </span>
                          )}
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

      {/* Convert Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar Pré-Matrícula</DialogTitle>
            <DialogDescription>
              Um convite será criado e enviado por email para o responsável realizar o cadastro completo.
            </DialogDescription>
          </DialogHeader>

          {selectedPreEnrollment && (() => {
            const calculatedClass = calculateClassFromBirthDate(selectedPreEnrollment.child_birth_date);
            const storedClass = selectedPreEnrollment.desired_class_type;
            const hasClassMismatch = storedClass !== calculatedClass.classType;
            
            return (
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
                    <span className="font-medium">Nascimento:</span>
                    <p className="text-muted-foreground">{format(new Date(selectedPreEnrollment.child_birth_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <span className="font-medium">Turma (por idade):</span>
                    <p className="text-primary font-semibold">{calculatedClass.label}</p>
                  </div>
                  <div>
                    <span className="font-medium">Turno Desejado:</span>
                    <p className="text-muted-foreground">{shiftLabels[selectedPreEnrollment.desired_shift_type] || selectedPreEnrollment.desired_shift_type}</p>
                  </div>
                </div>

                {hasClassMismatch && (
                  <div className="flex items-center gap-2 p-2 bg-pimpo-yellow/10 rounded-md text-sm border border-pimpo-yellow/30">
                    <AlertCircle className="h-4 w-4 text-pimpo-yellow" />
                    <span>Turma foi recalculada. Estava como "{classLabels[storedClass] || storedClass}", agora será "{calculatedClass.label}".</span>
                  </div>
                )}

                {selectedPreEnrollment.ghl_contact_id && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm text-primary">
                    <MessageSquare className="h-4 w-4" />
                    <span>Contato sincronizado com GoHighLevel</span>
                  </div>
                )}
              </div>
            );
          })()}

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
    </>
  );
}
