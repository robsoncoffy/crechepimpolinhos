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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Car, Clock, Loader2, CheckCircle2, UserCheck } from "lucide-react";

interface PickupNotificationProps {
  childId: string;
  childName: string;
}

type NotificationType = "on_way" | "delay" | "other_person";

export function PickupNotification({ childId, childName }: PickupNotificationProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType>("on_way");
  const [delayMinutes, setDelayMinutes] = useState<string>("10");
  const [otherPersonName, setOtherPersonName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    // Validate other person name
    if (notificationType === "other_person" && !otherPersonName.trim()) {
      toast.error("Informe o nome de quem vai buscar");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build message based on type
      let finalMessage = message;
      if (notificationType === "other_person") {
        finalMessage = `${otherPersonName.trim()} irá buscar. ${message}`.trim();
      }

      const { error } = await supabase.from("pickup_notifications").insert({
        child_id: childId,
        parent_id: user.id,
        notification_type: notificationType,
        delay_minutes: notificationType === "delay" ? parseInt(delayMinutes) : null,
        message: finalMessage || null,
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setShowSuccess(false);
        setNotificationType("on_way");
        setDelayMinutes("10");
        setOtherPersonName("");
        setMessage("");
      }, 2000);

      const successMessages: Record<NotificationType, string> = {
        on_way: "Escola notificada que você está a caminho!",
        delay: `Escola notificada sobre o atraso de ${delayMinutes} minutos`,
        other_person: `Escola notificada que ${otherPersonName.trim()} irá buscar`,
      };

      toast.success(successMessages[notificationType]);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 w-full bg-pimpo-green hover:bg-pimpo-green/90 text-white h-14 text-base font-semibold shadow-md rounded-xl">
          <Car className="w-5 h-5" />
          Avisar Busca
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {showSuccess ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-pimpo-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-pimpo-green" />
            </div>
            <h3 className="font-semibold text-lg">Notificação Enviada!</h3>
            <p className="text-muted-foreground mt-1">
              A escola foi avisada sobre a busca de {childName.split(" ")[0]}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Avisar sobre Busca
              </DialogTitle>
              <DialogDescription>
                Avise a escola sobre a busca de {childName.split(" ")[0]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <RadioGroup
                value={notificationType}
                onValueChange={(v) => setNotificationType(v as NotificationType)}
                className="grid gap-3"
              >
                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="on_way" id="on_way" />
                  <Label htmlFor="on_way" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-pimpo-green" />
                      <span className="font-medium">Estou a caminho</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Avise que você está indo buscar agora
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="delay" id="delay" />
                  <Label htmlFor="delay" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-pimpo-yellow" />
                      <span className="font-medium">Vou atrasar</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Avise que vai demorar um pouco mais
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="other_person" id="other_person" />
                  <Label htmlFor="other_person" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Outra pessoa vai buscar</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Avise que outra pessoa autorizada irá buscar
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {notificationType === "delay" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quanto tempo de atraso?</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["5", "10", "15", "20", "25", "30"].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        variant={delayMinutes === mins ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDelayMinutes(mins)}
                        className="font-medium"
                      >
                        {mins} min
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {notificationType === "other_person" && (
                <div className="space-y-2">
                  <Label htmlFor="other_person_name" className="text-sm font-medium">
                    Nome de quem vai buscar *
                  </Label>
                  <Input
                    id="other_person_name"
                    placeholder="Ex: Avó Maria, Tia Ana..."
                    value={otherPersonName}
                    onChange={(e) => setOtherPersonName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Certifique-se de que esta pessoa está na lista de autorizados
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Mensagem adicional (opcional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Ex: Hoje ele está levando mochila extra..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Car className="w-4 h-4 mr-2" />
                    Enviar Aviso
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
