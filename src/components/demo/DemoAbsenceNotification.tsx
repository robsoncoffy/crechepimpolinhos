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
import { toast } from "sonner";
import { UserX, Loader2, CheckCircle2, Stethoscope, Plane, Home, HelpCircle } from "lucide-react";

interface DemoAbsenceNotificationProps {
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

export function DemoAbsenceNotification({ childName }: DemoAbsenceNotificationProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<AbsenceReason>("sick");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (reason === "other" && !notes.trim()) {
      toast.error("Por favor, descreva o motivo da ausência");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      setOpen(false);
      setShowSuccess(false);
      setReason("sick");
      setNotes("");
    }, 2000);

    toast.success("Escola notificada sobre a ausência! (Demo)");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          <UserX className="w-4 h-4" />
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
                      <RadioGroupItem value={key} id={`demo-${key}`} />
                      <Label htmlFor={`demo-${key}`} className="flex-1 cursor-pointer">
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
                <Label htmlFor="demo-notes" className="text-sm font-medium">
                  {reason === "other" ? "Descreva o motivo *" : "Observações (opcional)"}
                </Label>
                <Textarea
                  id="demo-notes"
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
