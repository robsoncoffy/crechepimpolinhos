import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ScheduledVisit } from "@/pages/admin/AdminVisits";

interface VisitDetailsSheetProps {
  visit: ScheduledVisit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }
> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmada", variant: "default", icon: CheckCircle },
  completed: { label: "Realizada", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Cancelada", variant: "destructive", icon: XCircle },
};

export function VisitDetailsSheet({
  visit,
  open,
  onOpenChange,
  onUpdate,
}: VisitDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(visit?.notes || "");

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!visit) throw new Error("No visit selected");

      const { error } = await supabase
        .from("scheduled_visits")
        .update({ status: newStatus, notes })
        .eq("id", visit.id);

      if (error) throw error;

      // If GHL appointment exists, sync status
      if (visit.ghl_appointment_id) {
        await supabase.functions.invoke("ghl-calendar", {
          body: {
            action: "update-appointment",
            appointmentId: visit.ghl_appointment_id,
            appointmentStatus: newStatus === "cancelled" ? "cancelled" : "confirmed",
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      onUpdate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!visit) throw new Error("No visit selected");

      // Cancel in GHL if exists
      if (visit.ghl_appointment_id) {
        await supabase.functions.invoke("ghl-calendar", {
          body: {
            action: "cancel-appointment",
            appointmentId: visit.ghl_appointment_id,
          },
        });
      }

      const { error } = await supabase
        .from("scheduled_visits")
        .delete()
        .eq("id", visit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visita removida!");
      onUpdate();
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!visit) throw new Error("No visit selected");

      const { error } = await supabase
        .from("scheduled_visits")
        .update({ notes })
        .eq("id", visit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observações salvas!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  if (!visit) return null;

  const date = parseISO(visit.scheduled_at);
  const status = statusConfig[visit.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {visit.contact_name}
          </SheetTitle>
          <SheetDescription>
            Detalhes da visita agendada
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {visit.ghl_appointment_id && (
              <Badge variant="outline" className="text-xs">
                Sincronizado com GHL
              </Badge>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(date, "HH:mm")}</span>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Contato</h4>
            {visit.contact_phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${visit.contact_phone}`}
                  className="text-primary hover:underline"
                >
                  {visit.contact_phone}
                </a>
              </div>
            )}
            {visit.contact_email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${visit.contact_email}`}
                  className="text-primary hover:underline truncate"
                >
                  {visit.contact_email}
                </a>
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="visit-notes" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a visita..."
              rows={4}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveNotesMutation.mutate()}
              disabled={saveNotesMutation.isPending || notes === visit.notes}
            >
              {saveNotesMutation.isPending && (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              )}
              Salvar Observações
            </Button>
          </div>

          <Separator />

          {/* Quick Actions */}
          {visit.status !== "cancelled" && visit.status !== "completed" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Ações</h4>
              <div className="flex flex-wrap gap-2">
                {visit.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate("confirmed")}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar
                  </Button>
                )}
                {(visit.status === "pending" || visit.status === "confirmed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate("completed")}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Realizada
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate("cancelled")}
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir visita?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A visita será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
