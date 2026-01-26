import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Loader2, User, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface GHLCalendar {
  id: string;
  name: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

export function ScheduleVisitDialog({
  open,
  onOpenChange,
  onSuccess,
}: ScheduleVisitDialogProps) {
  const { user } = useAuth();
  const [selectedCalendar, setSelectedCalendar] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch GHL calendars
  const { data: calendars = [], isLoading: loadingCalendars } = useQuery({
    queryKey: ["ghl-calendars"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ghl-calendar", {
        body: { action: "calendars" },
      });
      if (error) throw error;
      return (data?.calendars || []) as GHLCalendar[];
    },
    enabled: open,
  });

  // Fetch available slots for selected date
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["ghl-slots", selectedCalendar, selectedDate],
    queryFn: async () => {
      if (!selectedCalendar || !selectedDate) return [];
      
      const startDate = format(selectedDate, "yyyy-MM-dd");
      const endDate = format(addDays(selectedDate, 1), "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke("ghl-calendar", {
        body: {
          action: "free-slots",
          calendarId: selectedCalendar,
          startDate,
          endDate,
        },
      });

      if (error) throw error;
      
      // Parse slots from GHL response
      const slotsData = data?.slots || data || [];
      return Object.values(slotsData).flat() as TimeSlot[];
    },
    enabled: !!selectedCalendar && !!selectedDate,
  });

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !contactName) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      // First, try to create in GHL if calendar is selected
      let ghlAppointmentId = null;
      let ghlContactId = null;

      if (selectedCalendar) {
        // Create or find contact in GHL first
        // For now, we'll skip GHL contact creation and just store locally
        // TODO: Integrate with ghl-sync-contact
      }

      // Save to local database
      const { data, error } = await supabase
        .from("scheduled_visits")
        .insert({
          ghl_appointment_id: ghlAppointmentId,
          ghl_calendar_id: selectedCalendar || null,
          ghl_contact_id: ghlContactId,
          contact_name: contactName,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          scheduled_at: selectedSlot.start,
          status: "pending",
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error("Erro ao agendar: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedCalendar("");
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  // Generate time slots if GHL slots are not available
  const generateLocalSlots = (): TimeSlot[] => {
    if (!selectedDate) return [];
    
    const slots: TimeSlot[] = [];
    const hours = [8, 9, 10, 11, 14, 15, 16, 17];
    
    hours.forEach(hour => {
      const start = new Date(selectedDate);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1, 0, 0, 0);
      
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
      });
    });
    
    return slots;
  };

  const availableSlots = slots.length > 0 ? slots : (selectedDate ? generateLocalSlots() : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agendar Visita Escolar</DialogTitle>
            <DialogDescription>
              Preencha os dados do visitante e escolha a data e horário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="contactName">
                  Nome do Visitante <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactName"
                    placeholder="Nome completo"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactPhone"
                      placeholder="(00) 00000-0000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Selection (optional - if GHL has multiple) */}
            {calendars.length > 1 && (
              <div className="space-y-2">
                <Label>Calendário GHL</Label>
                <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>
                Data da Visita <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "PPP", { locale: ptBR })
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                    disabled={(date) => date < new Date()}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Slot Selection */}
            {selectedDate && (
              <div className="space-y-2">
                <Label>
                  Horário <span className="text-destructive">*</span>
                </Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhum horário disponível para esta data.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot, i) => {
                      const time = format(parseISO(slot.start), "HH:mm");
                      const isSelected = selectedSlot?.start === slot.start;

                      return (
                        <Button
                          key={i}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                          className="text-sm"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {time}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre a visita..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!contactName || !selectedDate || !selectedSlot || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Agendar Visita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
