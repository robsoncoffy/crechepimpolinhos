import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  UtensilsCrossed, 
  Moon, 
  Thermometer, 
  Pill, 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sun,
  Droplets
} from "lucide-react";

interface TodayAtSchoolWidgetProps {
  childId: string;
}

interface DailyRecord {
  id: string;
  record_date: string;
  breakfast: string | null;
  lunch: string | null;
  snack: string | null;
  dinner: string | null;
  slept_morning: boolean | null;
  slept_afternoon: boolean | null;
  urinated: boolean | null;
  evacuated: string | null;
  had_fever: boolean | null;
  temperature: number | null;
  took_medicine: boolean | null;
  medicine_notes: string | null;
  school_notes: string | null;
  activities: string | null;
}

export function TodayAtSchoolWidget({ childId }: TodayAtSchoolWidgetProps) {
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayRecord = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_records')
        .select('id, record_date, breakfast, lunch, snack, dinner, slept_morning, slept_afternoon, urinated, evacuated, had_fever, temperature, took_medicine, medicine_notes, school_notes, activities')
        .eq('child_id', childId)
        .eq('record_date', today)
        .maybeSingle();

      if (!error && data) {
        setRecord(data as DailyRecord);
      }
      setLoading(false);
    };

    fetchTodayRecord();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`daily-record-${childId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_records',
          filter: `child_id=eq.${childId}`
        },
        () => {
          // Refetch on any change
          fetchTodayRecord();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId]);

  const getMealEmoji = (level: string | null) => {
    if (!level) return '⏳';
    switch (level) {
      case 'nao_aceitou': return '😔';
      case 'pouco': return '😕';
      case 'metade': return '😊';
      case 'quase_tudo': return '😃';
      case 'tudo': return '🤩';
      default: return '⏳';
    }
  };

  const getMealLabel = (level: string | null) => {
    if (!level) return 'Aguardando';
    switch (level) {
      case 'nao_aceitou': return 'Não aceitou';
      case 'pouco': return 'Comeu pouco';
      case 'metade': return 'Comeu metade';
      case 'quase_tudo': return 'Quase tudo';
      case 'tudo': return 'Comeu tudo!';
      default: return 'Aguardando';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-pimpo-blue/5 to-pimpo-green/5 border-pimpo-blue/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-pimpo-blue" />
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-muted-foreground/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="w-5 h-5 text-pimpo-yellow" />
            Hoje na Escola
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Ainda não há registros para hoje</p>
            <p className="text-xs mt-1">Os professores atualizarão em breve ✨</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasHealthAlert = record.had_fever || record.took_medicine;

  return (
    <Card className={`border-2 shadow-lg transition-all duration-300 ${
      hasHealthAlert 
        ? 'bg-gradient-to-br from-pimpo-red/5 to-pimpo-red/10 border-pimpo-red/30' 
        : 'bg-gradient-to-br from-pimpo-blue/5 to-pimpo-green/5 border-pimpo-green/20'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="w-5 h-5 text-pimpo-yellow" />
            Hoje na Escola
          </CardTitle>
          <Badge variant="outline" className="bg-pimpo-green/10 text-pimpo-green border-pimpo-green/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Presente
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* Alerta de Saúde */}
        {hasHealthAlert && (
          <div className="bg-pimpo-red/10 border border-pimpo-red/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-pimpo-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-pimpo-red text-sm">Alerta de Saúde</p>
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                {record.had_fever && (
                  <p className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    Febre detectada {record.temperature && `(${record.temperature}°C)`}
                  </p>
                )}
                {record.took_medicine && record.medicine_notes && (
                  <p className="flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    Medicamento: {record.medicine_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Refeições */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            REFEIÇÕES
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <span className="text-lg">{getMealEmoji(record.breakfast)}</span>
              <p className="text-xs text-muted-foreground">Café da manhã</p>
              <p className="text-xs font-medium">{getMealLabel(record.breakfast)}</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <span className="text-lg">{getMealEmoji(record.lunch)}</span>
              <p className="text-xs text-muted-foreground">Almoço</p>
              <p className="text-xs font-medium">{getMealLabel(record.lunch)}</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <span className="text-lg">{getMealEmoji(record.snack)}</span>
              <p className="text-xs text-muted-foreground">Lanche</p>
              <p className="text-xs font-medium">{getMealLabel(record.snack)}</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <span className="text-lg">{getMealEmoji(record.dinner)}</span>
              <p className="text-xs text-muted-foreground">Jantar</p>
              <p className="text-xs font-medium">{getMealLabel(record.dinner)}</p>
            </div>
          </div>
        </div>

        {/* Sono e Higiene */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Moon className="w-3.5 h-3.5" />
              SONO
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className={record.slept_morning ? 'text-pimpo-blue' : 'text-muted-foreground'}>
                  {record.slept_morning ? '😴' : '😊'}
                </span>
                <span className="text-xs">Manhã: {record.slept_morning ? 'Dormiu' : 'Não dormiu'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={record.slept_afternoon ? 'text-pimpo-blue' : 'text-muted-foreground'}>
                  {record.slept_afternoon ? '😴' : '😊'}
                </span>
                <span className="text-xs">Tarde: {record.slept_afternoon ? 'Dormiu' : 'Não dormiu'}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" />
              HIGIENE
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className={record.urinated ? 'text-pimpo-yellow' : 'text-muted-foreground'}>
                  💧
                </span>
                <span className="text-xs">Xixi: {record.urinated ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={record.evacuated ? 'text-pimpo-green' : 'text-muted-foreground'}>
                  💩
                </span>
                <span className="text-xs">Cocô: {record.evacuated || 'Não'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Atividades */}
        {record.activities && (
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">🎨 Atividades</p>
            <p className="text-sm text-foreground">{record.activities}</p>
          </div>
        )}

        {/* Observações */}
        {record.school_notes && (
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">📝 Observações</p>
            <p className="text-sm text-foreground">{record.school_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
