import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Check,
  Baby,
  Users,
  Copy,
  Clock,
  Milk,
  Apple
} from "lucide-react";
import { toast } from "sonner";
import { MenuPdfExport } from "@/components/admin/MenuPdfExport";
import { MealSuggestions } from "@/components/admin/MealSuggestions";
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

interface MenuItem {
  id?: string;
  week_start: string;
  day_of_week: number;
  breakfast: string;
  breakfast_time: string;
  morning_snack: string;
  morning_snack_time: string;
  lunch: string;
  lunch_time: string;
  bottle: string;
  bottle_time: string;
  snack: string;
  snack_time: string;
  pre_dinner: string;
  pre_dinner_time: string;
  dinner: string;
  dinner_time: string;
  notes: string;
  menu_type: 'bercario' | 'maternal';
}

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const emptyMenuItem = (weekStart: string, dayOfWeek: number, menuType: 'bercario' | 'maternal'): MenuItem => ({
  week_start: weekStart,
  day_of_week: dayOfWeek,
  breakfast: '',
  breakfast_time: menuType === 'bercario' ? '07:30' : '08:00',
  morning_snack: '',
  morning_snack_time: '09:30',
  lunch: '',
  lunch_time: menuType === 'bercario' ? '11:00' : '11:30',
  bottle: '',
  bottle_time: '13:00',
  snack: '',
  snack_time: menuType === 'bercario' ? '15:00' : '15:30',
  pre_dinner: '',
  pre_dinner_time: '16:30',
  dinner: '',
  dinner_time: menuType === 'bercario' ? '17:30' : '18:00',
  notes: '',
  menu_type: menuType
});

export default function AdminMenu() {
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeTab, setActiveTab] = useState<'bercario' | 'maternal'>('bercario');
  const [bercarioItems, setBercarioItems] = useState<MenuItem[]>([]);
  const [maternalItems, setMaternalItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const copyFromPreviousWeek = async () => {
    setCopying(true);
    const previousWeekStart = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
    
    try {
      const { data, error } = await supabase
        .from('weekly_menus')
        .select('*')
        .eq('week_start', previousWeekStart)
        .order('day_of_week');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Não há cardápio na semana anterior para copiar');
        setCopying(false);
        return;
      }

      // Copy data to current week, preserving menu types
      const bercarioData = data.filter(item => item.menu_type === 'bercario');
      const maternalData = data.filter(item => item.menu_type === 'maternal');

      const newBercario: MenuItem[] = [1, 2, 3, 4, 5].map(dayOfWeek => {
        const existing = bercarioData.find(item => item.day_of_week === dayOfWeek);
        if (existing) {
          return {
            id: bercarioItems.find(b => b.day_of_week === dayOfWeek)?.id,
            week_start: weekStartStr,
            day_of_week: dayOfWeek,
            breakfast: existing.breakfast || '',
            breakfast_time: existing.breakfast_time || '07:30',
            morning_snack: existing.morning_snack || '',
            morning_snack_time: existing.morning_snack_time || '09:30',
            lunch: existing.lunch || '',
            lunch_time: existing.lunch_time || '11:00',
            bottle: existing.bottle || '',
            bottle_time: existing.bottle_time || '13:00',
            snack: existing.snack || '',
            snack_time: existing.snack_time || '15:00',
            pre_dinner: existing.pre_dinner || '',
            pre_dinner_time: existing.pre_dinner_time || '16:30',
            dinner: existing.dinner || '',
            dinner_time: existing.dinner_time || '17:30',
            notes: existing.notes || '',
            menu_type: 'bercario' as const
          };
        }
        return bercarioItems.find(b => b.day_of_week === dayOfWeek) || emptyMenuItem(weekStartStr, dayOfWeek, 'bercario');
      });

      const newMaternal: MenuItem[] = [1, 2, 3, 4, 5].map(dayOfWeek => {
        const existing = maternalData.find(item => item.day_of_week === dayOfWeek);
        if (existing) {
          return {
            id: maternalItems.find(m => m.day_of_week === dayOfWeek)?.id,
            week_start: weekStartStr,
            day_of_week: dayOfWeek,
            breakfast: existing.breakfast || '',
            breakfast_time: existing.breakfast_time || '08:00',
            morning_snack: existing.morning_snack || '',
            morning_snack_time: existing.morning_snack_time || '09:30',
            lunch: existing.lunch || '',
            lunch_time: existing.lunch_time || '11:30',
            bottle: existing.bottle || '',
            bottle_time: existing.bottle_time || '13:00',
            snack: existing.snack || '',
            snack_time: existing.snack_time || '15:30',
            pre_dinner: existing.pre_dinner || '',
            pre_dinner_time: existing.pre_dinner_time || '16:30',
            dinner: existing.dinner || '',
            dinner_time: existing.dinner_time || '18:00',
            notes: existing.notes || '',
            menu_type: 'maternal' as const
          };
        }
        return maternalItems.find(m => m.day_of_week === dayOfWeek) || emptyMenuItem(weekStartStr, dayOfWeek, 'maternal');
      });

      setBercarioItems(newBercario);
      setMaternalItems(newMaternal);
      toast.success('Cardápio da semana anterior copiado! Não esqueça de salvar.');
    } catch (error) {
      console.error('Error copying menu:', error);
      toast.error('Erro ao copiar cardápio');
    } finally {
      setCopying(false);
    }
  };

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('weekly_menus')
          .select('*')
          .eq('week_start', weekStartStr)
          .order('day_of_week');

        if (error) {
          console.error('Error fetching menu:', error);
          toast.error('Erro ao carregar cardápio');
          setLoading(false);
          return;
        }

        // Create menu items for all 5 days for each type
        const bercario: MenuItem[] = [1, 2, 3, 4, 5].map(dayOfWeek => {
          const existing = data?.find(item => item.day_of_week === dayOfWeek && item.menu_type === 'bercario');
          if (existing) {
            return {
              id: existing.id,
              week_start: existing.week_start,
              day_of_week: existing.day_of_week,
              breakfast: existing.breakfast || '',
              breakfast_time: existing.breakfast_time || '07:30',
              morning_snack: existing.morning_snack || '',
              morning_snack_time: existing.morning_snack_time || '09:30',
              lunch: existing.lunch || '',
              lunch_time: existing.lunch_time || '11:00',
              bottle: existing.bottle || '',
              bottle_time: existing.bottle_time || '13:00',
              snack: existing.snack || '',
              snack_time: existing.snack_time || '15:00',
              pre_dinner: existing.pre_dinner || '',
              pre_dinner_time: existing.pre_dinner_time || '16:30',
              dinner: existing.dinner || '',
              dinner_time: existing.dinner_time || '17:30',
              notes: existing.notes || '',
              menu_type: 'bercario' as const
            };
          }
          return emptyMenuItem(weekStartStr, dayOfWeek, 'bercario');
        });

        const maternal: MenuItem[] = [1, 2, 3, 4, 5].map(dayOfWeek => {
          const existing = data?.find(item => item.day_of_week === dayOfWeek && item.menu_type === 'maternal');
          if (existing) {
            return {
              id: existing.id,
              week_start: existing.week_start,
              day_of_week: existing.day_of_week,
              breakfast: existing.breakfast || '',
              breakfast_time: existing.breakfast_time || '08:00',
              morning_snack: existing.morning_snack || '',
              morning_snack_time: existing.morning_snack_time || '09:30',
              lunch: existing.lunch || '',
              lunch_time: existing.lunch_time || '11:30',
              bottle: existing.bottle || '',
              bottle_time: existing.bottle_time || '13:00',
              snack: existing.snack || '',
              snack_time: existing.snack_time || '15:30',
              pre_dinner: existing.pre_dinner || '',
              pre_dinner_time: existing.pre_dinner_time || '16:30',
              dinner: existing.dinner || '',
              dinner_time: existing.dinner_time || '18:00',
              notes: existing.notes || '',
              menu_type: 'maternal' as const
            };
          }
          return emptyMenuItem(weekStartStr, dayOfWeek, 'maternal');
        });

        setBercarioItems(bercario);
        setMaternalItems(maternal);
      } catch (err) {
        console.error('Unexpected error fetching menu:', err);
        toast.error('Erro inesperado ao carregar cardápio');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [weekStartStr]);

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));

  const updateMenuItem = (menuType: 'bercario' | 'maternal', dayOfWeek: number, field: keyof MenuItem, value: string) => {
    const setItems = menuType === 'bercario' ? setBercarioItems : setMaternalItems;
    setItems(prev => 
      prev.map(item => 
        item.day_of_week === dayOfWeek 
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const allItems = [...bercarioItems, ...maternalItems];
    let hasErrors = false;

    try {
      for (const item of allItems) {
        // Skip empty items (check all meal fields)
        const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                          item.morning_snack || item.bottle || item.pre_dinner || item.notes;
        if (!hasContent) {
          // If it existed before, delete it
          if (item.id) {
            const { error } = await supabase
              .from('weekly_menus')
              .delete()
              .eq('id', item.id);
            
            if (error) {
              console.error('Error deleting menu item:', error);
              hasErrors = true;
            }
          }
          continue;
        }

        const menuData = {
          week_start: weekStartStr,
          day_of_week: item.day_of_week,
          breakfast: item.breakfast || null,
          breakfast_time: item.breakfast_time || null,
          morning_snack: item.morning_snack || null,
          morning_snack_time: item.morning_snack_time || null,
          lunch: item.lunch || null,
          lunch_time: item.lunch_time || null,
          bottle: item.bottle || null,
          bottle_time: item.bottle_time || null,
          snack: item.snack || null,
          snack_time: item.snack_time || null,
          pre_dinner: item.pre_dinner || null,
          pre_dinner_time: item.pre_dinner_time || null,
          dinner: item.dinner || null,
          dinner_time: item.dinner_time || null,
          notes: item.notes || null,
          menu_type: item.menu_type
        };

        if (item.id) {
          // Update existing
          const { error } = await supabase
            .from('weekly_menus')
            .update(menuData)
            .eq('id', item.id);

          if (error) {
            console.error('Error updating menu item:', error);
            hasErrors = true;
          }
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('weekly_menus')
            .insert(menuData)
            .select()
            .single();

          if (error) {
            console.error('Error inserting menu item:', error);
            hasErrors = true;
          } else if (data) {
            // Update the item's id in state so subsequent saves work correctly
            const updateFn = item.menu_type === 'bercario' ? setBercarioItems : setMaternalItems;
            updateFn(prev => prev.map(prevItem => 
              prevItem.day_of_week === item.day_of_week && prevItem.menu_type === item.menu_type
                ? { ...prevItem, id: data.id }
                : prevItem
            ));
          }
        }
      }

      if (hasErrors) {
        toast.error('Alguns itens não foram salvos. Verifique suas permissões.');
      } else {
        toast.success('Cardápio salvo com sucesso!');
      }
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error('Erro ao salvar cardápio');
    } finally {
      setSaving(false);
    }
  };

  const currentMenuItems = activeTab === 'bercario' ? bercarioItems : maternalItems;
  const tabColor = activeTab === 'bercario' ? 'pimpo-blue' : 'pimpo-green';

  const MealField = ({ 
    icon, 
    label, 
    value, 
    timeValue, 
    field, 
    timeField, 
    placeholder,
    menuType,
    dayOfWeek,
    iconColor = "text-muted-foreground"
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    timeValue: string;
    field: keyof MenuItem;
    timeField: keyof MenuItem;
    placeholder: string;
    menuType: 'bercario' | 'maternal';
    dayOfWeek: number;
    iconColor?: string;
  }) => {
    // Map field names to mealType for suggestions
    const mealTypeMap: Record<string, "breakfast" | "morning_snack" | "lunch" | "bottle" | "snack" | "pre_dinner" | "dinner"> = {
      breakfast: "breakfast",
      morning_snack: "morning_snack",
      lunch: "lunch",
      bottle: "bottle",
      snack: "snack",
      pre_dinner: "pre_dinner",
      dinner: "dinner",
    };
    const mealType = mealTypeMap[field as string];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            {icon}
            {label}
          </Label>
          {mealType && (
            <MealSuggestions
              mealType={mealType}
              menuType={menuType}
              dayOfWeek={dayOfWeek}
              onSelect={(suggestion) => updateMenuItem(menuType, dayOfWeek, field, suggestion)}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => updateMenuItem(menuType, dayOfWeek, field, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <div className="relative">
            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => updateMenuItem(menuType, dayOfWeek, timeField, e.target.value)}
              className="w-24 pl-7 text-sm"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMenuForm = (items: MenuItem[], menuType: 'bercario' | 'maternal') => (
    <div className="grid gap-6">
      {items.map((item) => {
        const dayDate = addDays(weekStart, item.day_of_week - 1);
        const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                          item.morning_snack || item.bottle || item.pre_dinner;

        return (
          <Card 
            key={item.day_of_week}
            className={`transition-all ${
              hasContent 
                ? menuType === 'bercario' 
                  ? 'border-pimpo-blue/30 bg-pimpo-blue/5' 
                  : 'border-pimpo-green/30 bg-pimpo-green/5'
                : ''
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
                  <Check className={`w-5 h-5 ${menuType === 'bercario' ? 'text-pimpo-blue' : 'text-pimpo-green'}`} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Café da Manhã */}
              <MealField
                icon={<Coffee className="w-4 h-4 text-pimpo-yellow" />}
                label="Café da Manhã"
                value={item.breakfast}
                timeValue={item.breakfast_time}
                field="breakfast"
                timeField="breakfast_time"
                placeholder="Ex: Pão com manteiga, leite com achocolatado, fruta"
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />

              {/* Lanche da Manhã - Apenas Berçário */}
              {menuType === 'bercario' && (
                <MealField
                  icon={<Apple className="w-4 h-4 text-pimpo-green" />}
                  label="Lanche da Manhã"
                  value={item.morning_snack}
                  timeValue={item.morning_snack_time}
                  field="morning_snack"
                  timeField="morning_snack_time"
                  placeholder="Ex: Fruta amassada, biscoito"
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                />
              )}

              {/* Almoço */}
              <MealField
                icon={<Soup className={`w-4 h-4 ${menuType === 'bercario' ? 'text-pimpo-blue' : 'text-pimpo-green'}`} />}
                label="Almoço"
                value={item.lunch}
                timeValue={item.lunch_time}
                field="lunch"
                timeField="lunch_time"
                placeholder="Ex: Arroz, feijão, frango grelhado, salada"
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />

              {/* Mamadeira - Apenas Berçário */}
              {menuType === 'bercario' && (
                <MealField
                  icon={<Milk className="w-4 h-4 text-pimpo-blue" />}
                  label="Mamadeira"
                  value={item.bottle}
                  timeValue={item.bottle_time}
                  field="bottle"
                  timeField="bottle_time"
                  placeholder="Ex: Leite com Mucilon, fórmula"
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                />
              )}

              {/* Lanche da Tarde */}
              <MealField
                icon={<Cookie className="w-4 h-4 text-pimpo-yellow" />}
                label="Lanche da Tarde"
                value={item.snack}
                timeValue={item.snack_time}
                field="snack"
                timeField="snack_time"
                placeholder="Ex: Biscoito integral, suco natural"
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />

              {/* Pré-Janta - Apenas Berçário */}
              {menuType === 'bercario' && (
                <MealField
                  icon={<UtensilsCrossed className="w-4 h-4 text-pimpo-red" />}
                  label="Pré-Janta"
                  value={item.pre_dinner}
                  timeValue={item.pre_dinner_time}
                  field="pre_dinner"
                  timeField="pre_dinner_time"
                  placeholder="Ex: Papinha de frutas, mingau"
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                />
              )}

              {/* Jantar */}
              <MealField
                icon={<Moon className="w-4 h-4 text-pimpo-red" />}
                label={menuType === 'bercario' ? "Janta/Mamadeira" : "Jantar"}
                value={item.dinner}
                timeValue={item.dinner_time}
                field="dinner"
                timeField="dinner_time"
                placeholder={menuType === 'bercario' ? "Ex: Sopa de legumes ou mamadeira" : "Ex: Sopa de legumes, pão"}
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />

              {/* Observações */}
              <div>
                <Label className="flex items-center gap-2 text-sm mb-2">
                  📝 Observações
                </Label>
                <Textarea
                  value={item.notes}
                  onChange={(e) => updateMenuItem(menuType, item.day_of_week, 'notes', e.target.value)}
                  placeholder="Observações adicionais (opcional)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

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
              Gerencie os cardápios que serão exibidos para os pais
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
                Salvar Cardápios
              </>
            )}
          </Button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={loading || copying}
                className="border-pimpo-yellow text-pimpo-yellow hover:bg-pimpo-yellow/10"
              >
                {copying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Copiando...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Semana Anterior
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Copiar cardápio da semana anterior?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá substituir o cardápio atual pelos dados da semana anterior ({format(subWeeks(weekStart, 1), "d 'de' MMMM", { locale: ptBR })} - {format(addDays(subWeeks(weekStart, 1), 4), "d 'de' MMMM", { locale: ptBR })}).
                  <br /><br />
                  <strong>Atenção:</strong> As alterações só serão salvas quando você clicar em "Salvar Cardápios".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={copyFromPreviousWeek} className="bg-pimpo-yellow hover:bg-pimpo-yellow/90 text-white">
                  Copiar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <MenuPdfExport 
            menuItems={activeTab === 'bercario' ? bercarioItems : maternalItems} 
            weekStart={weekStart} 
            disabled={loading || currentMenuItems.every(item => !item.breakfast && !item.lunch && !item.snack && !item.dinner)}
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

      {/* Tabs for Menu Types */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'bercario' | 'maternal')}>
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger 
            value="bercario" 
            className="flex items-center gap-2 data-[state=active]:bg-pimpo-blue data-[state=active]:text-white text-base"
          >
            <Baby className="w-5 h-5" />
            Berçário
          </TabsTrigger>
          <TabsTrigger 
            value="maternal" 
            className="flex items-center gap-2 data-[state=active]:bg-pimpo-green data-[state=active]:text-white text-base"
          >
            <Users className="w-5 h-5" />
            Maternal / Jardim
          </TabsTrigger>
        </TabsList>

        {/* Menu Form */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pimpo-yellow" />
          </div>
        ) : (
          <>
            <TabsContent value="bercario" className="mt-6">
              {renderMenuForm(bercarioItems, 'bercario')}
            </TabsContent>
            <TabsContent value="maternal" className="mt-6">
              {renderMenuForm(maternalItems, 'maternal')}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
