import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserX, Loader2, CheckCircle2, Stethoscope, Plane, Home, HelpCircle } from "lucide-react";

interface AbsenceNotificationProps {
  childId: string;
  childName: string;
}

type AbsenceReason = "sick" | "medical" | "travel" | "family" | "other";

const absenceReasons = {
  sick: { label: "Doença", icon: Stethoscope, description: "Criança está doente em casa" },
  medical: { label: "Consulta Médica", icon: Stethoscope, description: "Exame ou consulta agendada" },
  travel: { label: "Viagem", icon: Plane, description: "Viagem familiar" },
  family: { label: "Motivos Familiares", icon: Home, description: "Compromisso ou evento familiar" },
  other: { label: "Outro Motivo", icon: HelpCircle, description: "Especifique no campo abaixo" },
};

export function AbsenceNotification({ childId, childName }: AbsenceNotificationProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<AbsenceReason>("sick");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (reason === "other" && !notes.trim()) {
      toast.error("Por favor, descreva o motivo da ausência");
      return;
    }

    setIsSubmitting(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const reasonLabel = absenceReasons[reason].label;
      const fullNotes = notes.trim() 
        ? `${reasonLabel}: ${notes.trim()}`
        : reasonLabel;

      // Check if there's already an attendance record for today
      const { data: existingRecord } = await supabase
        .from("attendance")
        .select("id")
        .eq("child_id", childId)
        .eq("date", today)
        .single();

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("attendance")
          .update({
            status: "excused",
            notes: fullNotes,
          })
          .eq("id", existingRecord.id);
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from("attendance")
          .insert({
            child_id: childId,
            date: today,
            status: "excused",
            notes: fullNotes,
          });
        if (error) throw error;
      }

      setShowSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setShowSuccess(false);
        setReason("sick");
        setNotes("");
      }, 2000);

      toast.success("Escola notificada sobre a ausência!");
    } catch (error) {
      console.error("Error sending absence notification:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 flex-1 sm:flex-none bg-pimpo-red hover:bg-pimpo-red/90 text-white h-12 text-base font-semibold shadow-md">
          <UserX className="w-5 h-5" />
          Avisar Falta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {showSuccess ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-pimpo-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-pimpo-green" />
            </div>
            <h3 className="font-semibold text-lg">Falta Justificada!</h3>
            <p className="text-muted-foreground mt-1">
              A escola foi avisada que {childName.split(" ")[0]} não irá hoje
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-500" />
                Avisar Ausência
              </DialogTitle>
              <DialogDescription>
                Informe a escola que {childName.split(" ")[0]} não irá hoje
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <RadioGroup
                value={reason}
                onValueChange={(v) => setReason(v as AbsenceReason)}
                className="grid gap-3"
              >
                {(Object.keys(absenceReasons) as AbsenceReason[]).map((key) => {
                  const { label, icon: Icon, description } = absenceReasons[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem value={key} id={key} />
                      <Label htmlFor={key} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {description}
                        </p>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  {reason === "other" ? "Descreva o motivo *" : "Observações (opcional)"}
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Está com febre desde ontem..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 mr-2" />
                    Confirmar Falta
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
