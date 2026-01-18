import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save,
  Loader2,
  UtensilsCrossed,
  Coffee,
  Soup,
  Cookie,
  Moon,
  CalendarDays,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { MenuPdfExport } from "@/components/admin/MenuPdfExport";

interface MenuItem {
  id?: string;
  week_start: string;
  day_of_week: number;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  notes: string;
}

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const emptyMenuItem = (weekStart: string, dayOfWeek: number): MenuItem => ({
  week_start: weekStart,
  day_of_week: dayOfWeek,
  breakfast: '',
  lunch: '',
  snack: '',
  dinner: '',
  notes: ''
});

export default function AdminMenu() {
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('weekly_menus')
        .select('*')
        .eq('week_start', weekStartStr)
        .order('day_of_week');

      if (error) {
        toast.error('Erro ao carregar cardápio');
        setLoading(false);
        return;
      }

      // Create menu items for all 5 days, filling in existing data
      const items: MenuItem[] = [1, 2, 3, 4, 5].map(dayOfWeek => {
        const existing = data?.find(item => item.day_of_week === dayOfWeek);
        if (existing) {
          return {
            id: existing.id,
            week_start: existing.week_start,
            day_of_week: existing.day_of_week,
            breakfast: existing.breakfast || '',
            lunch: existing.lunch || '',
            snack: existing.snack || '',
            dinner: existing.dinner || '',
            notes: existing.notes || ''
          };
        }
        return emptyMenuItem(weekStartStr, dayOfWeek);
      });

      setMenuItems(items);
      setLoading(false);
    };

    fetchMenu();
  }, [weekStartStr]);

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));

  const updateMenuItem = (dayOfWeek: number, field: keyof MenuItem, value: string) => {
    setMenuItems(prev => 
      prev.map(item => 
        item.day_of_week === dayOfWeek 
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      for (const item of menuItems) {
        // Skip empty items
        if (!item.breakfast && !item.lunch && !item.snack && !item.dinner && !item.notes) {
          // If it existed before, delete it
          if (item.id) {
            await supabase
              .from('weekly_menus')
              .delete()
              .eq('id', item.id);
          }
          continue;
        }

        const menuData = {
          week_start: weekStartStr,
          day_of_week: item.day_of_week,
          breakfast: item.breakfast || null,
          lunch: item.lunch || null,
          snack: item.snack || null,
          dinner: item.dinner || null,
          notes: item.notes || null
        };

        if (item.id) {
          // Update existing
          const { error } = await supabase
            .from('weekly_menus')
            .update(menuData)
            .eq('id', item.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('weekly_menus')
            .insert(menuData);

          if (error) throw error;
        }
      }

      toast.success('Cardápio salvo com sucesso!');
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error('Erro ao salvar cardápio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="w-7 h-7 text-pimpo-yellow" />
              Cardápio Semanal
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie o cardápio que será exibido para os pais
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="bg-pimpo-green hover:bg-pimpo-green/90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Cardápio
              </>
            )}
          </Button>
        </div>
        
        {/* PDF Export Buttons */}
        <div className="flex justify-end">
          <MenuPdfExport 
            menuItems={menuItems} 
            weekStart={weekStart} 
            disabled={loading || menuItems.every(item => !item.breakfast && !item.lunch && !item.snack && !item.dinner)}
          />
        </div>
      </div>

      {/* Week Navigation */}
      <Card className="border-pimpo-yellow/30 bg-gradient-to-r from-pimpo-yellow/5 to-pimpo-yellow/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousWeek}
              className="text-pimpo-yellow hover:bg-pimpo-yellow/10"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Semana Anterior
            </Button>
            
            <div className="text-center flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-pimpo-yellow" />
              <span className="font-bold text-foreground text-lg">
                {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              className="text-pimpo-yellow hover:bg-pimpo-yellow/10"
            >
              Próxima Semana
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Menu Form */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pimpo-yellow" />
        </div>
      ) : (
        <div className="grid gap-6">
          {menuItems.map((item) => {
            const dayDate = addDays(weekStart, item.day_of_week - 1);
            const hasContent = item.breakfast || item.lunch || item.snack || item.dinner;

            return (
              <Card 
                key={item.day_of_week}
                className={`transition-all ${
                  hasContent ? 'border-pimpo-green/30 bg-pimpo-green/5' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {dayNames[item.day_of_week - 1]}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({format(dayDate, 'd/MM')})
                      </span>
                    </CardTitle>
                    {hasContent && (
                      <Check className="w-5 h-5 text-pimpo-green" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Café da Manhã */}
                    <div>
                      <Label className="flex items-center gap-2 text-sm mb-2">
                        <Coffee className="w-4 h-4 text-pimpo-yellow" />
                        Café da Manhã
                      </Label>
                      <Input
                        value={item.breakfast}
                        onChange={(e) => updateMenuItem(item.day_of_week, 'breakfast', e.target.value)}
                        placeholder="Ex: Pão com manteiga, leite com achocolatado, fruta"
                      />
                    </div>

                    {/* Almoço */}
                    <div>
                      <Label className="flex items-center gap-2 text-sm mb-2">
                        <Soup className="w-4 h-4 text-pimpo-green" />
                        Almoço
                      </Label>
                      <Input
                        value={item.lunch}
                        onChange={(e) => updateMenuItem(item.day_of_week, 'lunch', e.target.value)}
                        placeholder="Ex: Arroz, feijão, frango grelhado, salada"
                      />
                    </div>

                    {/* Lanche */}
                    <div>
                      <Label className="flex items-center gap-2 text-sm mb-2">
                        <Cookie className="w-4 h-4 text-pimpo-blue" />
                        Lanche da Tarde
                      </Label>
                      <Input
                        value={item.snack}
                        onChange={(e) => updateMenuItem(item.day_of_week, 'snack', e.target.value)}
                        placeholder="Ex: Biscoito integral, suco natural"
                      />
                    </div>

                    {/* Jantar */}
                    <div>
                      <Label className="flex items-center gap-2 text-sm mb-2">
                        <Moon className="w-4 h-4 text-pimpo-red" />
                        Jantar
                      </Label>
                      <Input
                        value={item.dinner}
                        onChange={(e) => updateMenuItem(item.day_of_week, 'dinner', e.target.value)}
                        placeholder="Ex: Sopa de legumes, pão"
                      />
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <Label className="flex items-center gap-2 text-sm mb-2">
                      📝 Observações
                    </Label>
                    <Textarea
                      value={item.notes}
                      onChange={(e) => updateMenuItem(item.day_of_week, 'notes', e.target.value)}
                      placeholder="Observações adicionais (opcional)"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
