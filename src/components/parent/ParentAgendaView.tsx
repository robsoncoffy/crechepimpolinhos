import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, addDays, subDays, isToday, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Moon,
  Droplets,
  Heart,
  Calendar,
  Thermometer,
  Pill,
  FileText,
  AlertCircle,
  Check,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
type MealStatus = Database["public"]["Enums"]["meal_status"];
type EvacuationStatus = Database["public"]["Enums"]["evacuation_status"];

interface ParentAgendaViewProps {
  childId: string;
  childName: string;
}

const mealLabels: Record<MealStatus, { label: string; color: string; emoji: string }> = {
  nao_aceitou: { label: "Não aceitou", color: "text-destructive", emoji: "😔" },
  pouco: { label: "Pouco", color: "text-pimpo-yellow", emoji: "😐" },
  metade: { label: "Metade", color: "text-pimpo-yellow", emoji: "🙂" },
  quase_tudo: { label: "Quase tudo", color: "text-pimpo-green", emoji: "😊" },
  tudo: { label: "Tudo", color: "text-pimpo-green", emoji: "😄" },
};

const evacuationLabels: Record<EvacuationStatus, { label: string; color: string }> = {
  nao: { label: "Não evacuou", color: "text-muted-foreground" },
  normal: { label: "Normal", color: "text-pimpo-green" },
  pastosa: { label: "Pastosa", color: "text-pimpo-yellow" },
  liquida: { label: "Líquida", color: "text-destructive" },
};

function MealDisplay({ label, value }: { label: string; value: MealStatus | null }) {
  if (!value) return null;
  const meal = mealLabels[value];
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-lg">{meal.emoji}</span>
        <Badge variant="outline" className={cn("font-medium", meal.color)}>
          {meal.label}
        </Badge>
      </div>
    </div>
  );
}

export function ParentAgendaView({ childId, childName }: ParentAgendaViewProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [parentNotes, setParentNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Fetch daily record
  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("daily_records")
        .select("*")
        .eq("child_id", childId)
        .eq("record_date", dateStr)
        .maybeSingle();

      if (error) {
        console.error("Error fetching record:", error);
      } else {
        setRecord(data);
        setParentNotes(data?.parent_notes || "");
      }
      
      setLoading(false);
    };

    fetchRecord();
  }, [childId, selectedDate]);

  const handlePreviousDay = () => {
    setSelectedDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate((prev) => addDays(prev, 1));
    }
  };

  const handleSaveNotes = async () => {
    if (!record) return;
    
    setSavingNotes(true);
    
    const { error } = await supabase
      .from("daily_records")
      .update({ parent_notes: parentNotes })
      .eq("id", record.id);

    if (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Erro ao salvar observação",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Observação salva!",
        description: "Sua mensagem foi enviada para a escola.",
      });
    }
    
    setSavingNotes(false);
  };

  const dateLabel = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const isCurrentDay = isToday(selectedDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-medium capitalize">{dateLabel}</p>
          {isCurrentDay && (
            <Badge variant="default" className="mt-1">
              Hoje
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextDay}
          disabled={isCurrentDay}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* No Record State */}
      {!record ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">
              Nenhum registro para este dia
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {isFuture(selectedDate)
                ? "A agenda será preenchida pela escola durante o dia."
                : "A escola ainda não preencheu a agenda deste dia."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Refeições */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Utensils className="w-4 h-4 text-pimpo-yellow" />
                  Refeições
                </CardTitle>
              </CardHeader>
              <CardContent>
                {record.breakfast || record.lunch || record.snack || record.dinner ? (
                  <div className="divide-y">
                    <MealDisplay label="Café da manhã" value={record.breakfast} />
                    <MealDisplay label="Almoço" value={record.lunch} />
                    <MealDisplay label="Lanche" value={record.snack} />
                    <MealDisplay label="Jantar" value={record.dinner} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem registro de refeições</p>
                )}
              </CardContent>
            </Card>

            {/* Sono */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Moon className="w-4 h-4 text-primary" />
                  Sono
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    {record.slept_morning ? (
                      <Check className="w-4 h-4 text-pimpo-green" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Dormiu de manhã</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.slept_afternoon ? (
                      <Check className="w-4 h-4 text-pimpo-green" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Dormiu à tarde</span>
                  </div>
                </div>
                {record.sleep_notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm">{record.sleep_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Higiene */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Droplets className="w-4 h-4 text-pimpo-blue" />
                  Higiene
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {record.urinated ? (
                    <Check className="w-4 h-4 text-pimpo-green" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Urinou normalmente</span>
                </div>
                {record.evacuated && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Evacuação:</span>
                    <Badge
                      variant="outline"
                      className={cn("font-medium", evacuationLabels[record.evacuated].color)}
                    >
                      {evacuationLabels[record.evacuated].label}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saúde */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="w-4 h-4 text-pimpo-red" />
                  Saúde
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {record.had_fever ? (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                    <Thermometer className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      Teve febre
                      {record.temperature && ` (${record.temperature}°C)`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pimpo-green" />
                    <span className="text-sm">Sem febre</span>
                  </div>
                )}

                {record.took_medicine ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-pimpo-blue" />
                      <span className="text-sm font-medium">Tomou medicamento</span>
                    </div>
                    {record.medicine_notes && (
                      <div className="bg-muted/50 rounded-lg p-3 ml-6">
                        <p className="text-sm">{record.medicine_notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pimpo-green" />
                    <span className="text-sm">Sem medicamentos</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Atividades e Observações da Escola */}
            {(record.activities || record.school_notes) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Atividades e Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {record.activities && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Atividades realizadas</Label>
                      <div className="bg-muted/50 rounded-lg p-3 mt-1">
                        <p className="text-sm whitespace-pre-wrap">{record.activities}</p>
                      </div>
                    </div>
                  )}
                  {record.school_notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Observações da escola</Label>
                      <div className="bg-primary/10 rounded-lg p-3 mt-1 border border-primary/20">
                        <p className="text-sm whitespace-pre-wrap">{record.school_notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parent Notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-4 h-4 text-pimpo-yellow" />
                  Recado para a Escola
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Envie um recado ou observação para a escola sobre este dia.
                </p>
                <Textarea
                  placeholder="Ex: Hoje ela dormiu mal, pode estar mais irritada..."
                  value={parentNotes}
                  onChange={(e) => setParentNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || parentNotes === (record.parent_notes || "")}
                  className="w-full"
                >
                  {savingNotes ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Recado
                </Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
