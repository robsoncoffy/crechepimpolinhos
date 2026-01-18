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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Car, Clock, CheckCircle2, UserCheck } from "lucide-react";

// Mock authorized people for demo
const mockAuthorizedPeople = [
  { id: "1", name: "Maria Silva (Avó)", relationship: "Avó materna" },
  { id: "2", name: "João Santos (Tio)", relationship: "Tio paterno" },
  { id: "3", name: "Ana Costa (Vizinha)", relationship: "Vizinha autorizada" },
];

interface DemoPickupNotificationProps {
  childName: string;
}

export function DemoPickupNotification({ childName }: DemoPickupNotificationProps) {
  const [open, setOpen] = useState(false);
  const [notificationType, setNotificationType] = useState<"on_way" | "delay">("on_way");
  const [delayMinutes, setDelayMinutes] = useState<string>("10");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [someoneElsePickup, setSomeoneElsePickup] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>("");

  const handleSubmit = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setShowSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setShowSuccess(false);
      setNotificationType("on_way");
      setDelayMinutes("10");
      setMessage("");
      setSomeoneElsePickup(false);
      setSelectedPerson("");
    }, 2000);

    const personName = someoneElsePickup && selectedPerson 
      ? mockAuthorizedPeople.find(p => p.id === selectedPerson)?.name 
      : "você";

    toast.success(
      notificationType === "on_way"
        ? `Escola notificada que ${personName} está a caminho!`
        : `Escola notificada sobre o atraso de ${delayMinutes} minutos`,
      { description: "(Modo Demo - nenhuma notificação real enviada)" }
    );

    // Simulate teacher notification to write the school note
    setTimeout(() => {
      toast.info(
        "📝 Lembrete enviado à professora!",
        { 
          description: `Professora foi notificada para escrever o bilhetinho de ${childName.split(" ")[0]} antes da busca.`,
          duration: 5000
        }
      );
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 w-full bg-gradient-to-r from-pimpo-green to-pimpo-green/80 hover:from-pimpo-green/90 hover:to-pimpo-green/70 text-white shadow-lg">
          <Car className="w-5 h-5" />
          Avisar que Estou Indo Buscar
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
                <Car className="w-5 h-5 text-pimpo-green" />
                Avisar sobre Busca
              </DialogTitle>
              <DialogDescription>
                Avise a escola sobre a busca de {childName.split(" ")[0]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <RadioGroup
                value={notificationType}
                onValueChange={(v) => setNotificationType(v as "on_way" | "delay")}
                className="grid gap-3"
              >
                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="on_way" id="demo_on_way" />
                  <Label htmlFor="demo_on_way" className="flex-1 cursor-pointer">
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
                  <RadioGroupItem value="delay" id="demo_delay" />
                  <Label htmlFor="demo_delay" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-pimpo-yellow" />
                      <span className="font-medium">Vou atrasar</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Avise que vai demorar um pouco mais
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {notificationType === "delay" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quanto tempo de atraso?</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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

              {/* Someone else pickup option */}
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="someone_else"
                    checked={someoneElsePickup}
                    onCheckedChange={(checked) => {
                      setSomeoneElsePickup(checked === true);
                      if (!checked) setSelectedPerson("");
                    }}
                  />
                  <Label htmlFor="someone_else" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-pimpo-blue" />
                      <span className="font-medium">Outra pessoa vai buscar</span>
                    </div>
                  </Label>
                </div>

                {someoneElsePickup && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm font-medium">Quem vai buscar?</Label>
                    <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Selecione a pessoa autorizada" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockAuthorizedPeople.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            <div className="flex flex-col">
                              <span>{person.name}</span>
                              <span className="text-xs text-muted-foreground">{person.relationship}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo_message" className="text-sm font-medium">
                  Mensagem adicional (opcional)
                </Label>
                <Textarea
                  id="demo_message"
                  placeholder="Ex: Avó vai buscar hoje..."
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
              <Button onClick={handleSubmit} className="bg-pimpo-green hover:bg-pimpo-green/90">
                <Car className="w-4 h-4 mr-2" />
                Enviar Aviso
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
