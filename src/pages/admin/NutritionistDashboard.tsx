import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  Check,
  Baby,
  Users,
  Copy,
  Clock,
  Milk,
  Apple,
  AlertTriangle,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { MealSuggestions } from "@/components/admin/MealSuggestions";
import { MenuPdfExport } from "@/components/admin/MenuPdfExport";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
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

export default function NutritionistDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("cardapio");
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeMenuTab, setActiveMenuTab] = useState<'bercario' | 'maternal'>('bercario');
  const [bercarioItems, setBercarioItems] = useState<MenuItem[]>([]);
  const [maternalItems, setMaternalItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [stats, setStats] = useState({
    childrenWithAllergies: 0,
    menuDaysConfigured: 0,
  });

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const [allergiesRes, menuRes] = await Promise.all([
          supabase.from("children").select("id", { count: "exact", head: true }).not("allergies", "is", null),
          supabase.from("weekly_menus").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          childrenWithAllergies: allergiesRes.count || 0,
          menuDaysConfigured: menuRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  // Fetch menu
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

  const handleSave = async () => {
    setSaving(true);
    const allItems = [...bercarioItems, ...maternalItems];
    let hasErrors = false;

    try {
      for (const item of allItems) {
        const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                          item.morning_snack || item.bottle || item.pre_dinner || item.notes;
        if (!hasContent) {
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
          const { error } = await supabase
            .from('weekly_menus')
            .update(menuData)
            .eq('id', item.id);

          if (error) {
            console.error('Error updating menu item:', error);
            hasErrors = true;
          }
        } else {
          const { data, error } = await supabase
            .from('weekly_menus')
            .insert(menuData)
            .select()
            .single();

          if (error) {
            console.error('Error inserting menu item:', error);
            hasErrors = true;
          } else if (data) {
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

  const currentMenuItems = activeMenuTab === 'bercario' ? bercarioItems : maternalItems;

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
  }) => {
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
            <CardContent className="grid gap-4">
              <MealField
                icon={<Coffee className="w-4 h-4 text-amber-600" />}
                label="Café da Manhã"
                value={item.breakfast}
                timeValue={item.breakfast_time}
                field="breakfast"
                timeField="breakfast_time"
                placeholder="Descreva o café da manhã..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />
              
              <MealField
                icon={<Cookie className="w-4 h-4 text-orange-500" />}
                label="Lanche da Manhã"
                value={item.morning_snack}
                timeValue={item.morning_snack_time}
                field="morning_snack"
                timeField="morning_snack_time"
                placeholder="Descreva o lanche da manhã..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />
              
              <MealField
                icon={<Soup className="w-4 h-4 text-red-500" />}
                label="Almoço"
                value={item.lunch}
                timeValue={item.lunch_time}
                field="lunch"
                timeField="lunch_time"
                placeholder="Descreva o almoço..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />
              
              {menuType === 'bercario' && (
                <MealField
                  icon={<Milk className="w-4 h-4 text-blue-400" />}
                  label="Mamadeira"
                  value={item.bottle}
                  timeValue={item.bottle_time}
                  field="bottle"
                  timeField="bottle_time"
                  placeholder="Fórmula/Leite..."
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                />
              )}
              
              <MealField
                icon={<Apple className="w-4 h-4 text-green-500" />}
                label="Lanche da Tarde"
                value={item.snack}
                timeValue={item.snack_time}
                field="snack"
                timeField="snack_time"
                placeholder="Descreva o lanche da tarde..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />
              
              {menuType === 'bercario' && (
                <MealField
                  icon={<Cookie className="w-4 h-4 text-purple-500" />}
                  label="Pré-Janta"
                  value={item.pre_dinner}
                  timeValue={item.pre_dinner_time}
                  field="pre_dinner"
                  timeField="pre_dinner_time"
                  placeholder="Papa de frutas, vitamina..."
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                />
              )}
              
              <MealField
                icon={<Moon className="w-4 h-4 text-indigo-500" />}
                label="Jantar"
                value={item.dinner}
                timeValue={item.dinner_time}
                field="dinner"
                timeField="dinner_time"
                placeholder="Descreva o jantar..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
              />
              
              <div className="space-y-2">
                <Label className="text-sm">Observações</Label>
                <Textarea
                  value={item.notes}
                  onChange={(e) => updateMenuItem(menuType, item.day_of_week, 'notes', e.target.value)}
                  placeholder="Notas especiais, substituições, alertas de alergia..."
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
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Olá, {profile?.full_name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Painel da Nutricionista
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crianças com Alergias
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-red/10">
              <AlertTriangle className="w-4 h-4 text-pimpo-red" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {stats.childrenWithAllergies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atenção especial no cardápio
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dias de Cardápio
            </CardTitle>
            <div className="p-2 rounded-lg bg-pimpo-green/10">
              <Calendar className="w-4 h-4 text-pimpo-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-fredoka font-bold">
              {stats.menuDaysConfigured}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Refeições configuradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cardapio" className="gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            Cardápio Semanal
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat da Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px]">
                <StaffChatWindow />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cardapio" className="mt-4 space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className={`${activeMenuTab === 'bercario' ? 'bg-pimpo-blue hover:bg-pimpo-blue/90' : 'bg-pimpo-green hover:bg-pimpo-green/90'}`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Cardápio
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={copying || loading}>
                    {copying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copiar da Semana Anterior
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Copiar cardápio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá substituir o cardápio atual pelos itens da semana anterior.
                      Você ainda precisará salvar as alterações depois.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={copyFromPreviousWeek}>
                      Copiar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <MenuPdfExport 
              menuItems={activeMenuTab === 'bercario' ? bercarioItems : maternalItems} 
              weekStart={weekStart} 
              disabled={loading || currentMenuItems.every(item => !item.breakfast && !item.lunch && !item.snack && !item.dinner)}
            />
          </div>

          {/* Week Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <p className="font-semibold">
                    {format(weekStart, "d 'de' MMM", { locale: ptBR })} - {format(addDays(weekStart, 4), "d 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(weekStart, 'yyyy')}
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Menu Type Tabs */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeMenuTab} onValueChange={(v) => setActiveMenuTab(v as 'bercario' | 'maternal')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bercario" className="gap-2">
                  <Baby className="w-4 h-4" />
                  Berçário
                </TabsTrigger>
                <TabsTrigger value="maternal" className="gap-2">
                  <Users className="w-4 h-4" />
                  Maternal / Jardim
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bercario" className="mt-4">
                {renderMenuForm(bercarioItems, 'bercario')}
              </TabsContent>

              <TabsContent value="maternal" className="mt-4">
                {renderMenuForm(maternalItems, 'maternal')}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      {/* Mini Calendar + Quick Post Creator */}
      <div className="grid lg:grid-cols-2 gap-6">
        <MiniCalendar />
        <QuickPostCreator />
      </div>
    </div>
  );
}
