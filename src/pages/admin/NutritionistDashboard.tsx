import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Milk,
  Apple,
  AlertTriangle,
  Calendar,
  MessageSquare,
  DollarSign,
  Salad,
} from "lucide-react";
import { toast } from "sonner";
import { MenuPdfExport } from "@/components/admin/MenuPdfExport";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
import { MyReportsTab } from "@/components/employee/MyReportsTab";
import { TeacherParentChat } from "@/components/teacher/TeacherParentChat";
import { MealField, MenuItem, dayNames, emptyMenuItem } from "@/components/admin/MealField";
import { TacoFoodSearch } from "@/components/admin/TacoFoodSearch";
import { NutritionPdfExport } from "@/components/admin/NutritionPdfExport";
import { TacoFood } from "@/hooks/useTacoSearch";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type MenuType = 'bercario_0_6' | 'bercario_6_24' | 'maternal';

interface SelectedFood extends TacoFood {
  quantity: number;
}

interface MealNutritionData {
  [dayOfWeek: number]: {
    [mealField: string]: SelectedFood[];
  };
}

export default function NutritionistDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("cardapio");
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeMenuTab, setActiveMenuTab] = useState<MenuType>('bercario_0_6');
  const [bercario06Items, setBercario06Items] = useState<MenuItem[]>([]);
  const [bercario624Items, setBercario624Items] = useState<MenuItem[]>([]);
  const [maternalItems, setMaternalItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [nutritionData, setNutritionData] = useState<Record<MenuType, MealNutritionData>>({
    bercario_0_6: {},
    bercario_6_24: {},
    maternal: {},
  });
  const [expandedNutrition, setExpandedNutrition] = useState<Record<string, boolean>>({});
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

  // Fetch menu - maps old database types to new UI types
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
        const createMenuItems = (
          menuType: MenuType, 
          dbMenuType: string,
          defaultBreakfastTime: string,
          defaultLunchTime: string,
          defaultSnackTime: string,
          defaultDinnerTime: string
        ): MenuItem[] => {
          return [1, 2, 3, 4, 5].map(dayOfWeek => {
            const existing = data?.find(item => 
              item.day_of_week === dayOfWeek && item.menu_type === dbMenuType
            );
            if (existing) {
              return {
                id: existing.id,
                week_start: existing.week_start,
                day_of_week: existing.day_of_week,
                breakfast: existing.breakfast || '',
                breakfast_time: existing.breakfast_time || defaultBreakfastTime,
                morning_snack: existing.morning_snack || '',
                morning_snack_time: existing.morning_snack_time || '09:30',
                lunch: existing.lunch || '',
                lunch_time: existing.lunch_time || defaultLunchTime,
                bottle: existing.bottle || '',
                bottle_time: existing.bottle_time || '13:00',
                snack: existing.snack || '',
                snack_time: existing.snack_time || defaultSnackTime,
                pre_dinner: existing.pre_dinner || '',
                pre_dinner_time: existing.pre_dinner_time || '16:30',
                dinner: existing.dinner || '',
                dinner_time: existing.dinner_time || defaultDinnerTime,
                notes: existing.notes || '',
                menu_type: menuType
              };
            }
            return emptyMenuItem(weekStartStr, dayOfWeek, menuType);
          });
        };

        // Berçário 0-6 meses uses 'bercario' in the database
        setBercario06Items(createMenuItems('bercario_0_6', 'bercario', '07:30', '11:00', '15:00', '17:30'));
        // Berçário 6-24 meses also uses 'bercario' but we'll create separate entries
        setBercario624Items(createMenuItems('bercario_6_24', 'bercario_6_24', '07:30', '11:00', '15:00', '17:30'));
        // Maternal uses 'maternal' in the database
        setMaternalItems(createMenuItems('maternal', 'maternal', '08:00', '11:30', '15:30', '18:00'));
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

  const updateMenuItem = useCallback((menuType: MenuType, dayOfWeek: number, field: keyof MenuItem, value: string) => {
    const setItems = menuType === 'bercario_0_6' 
      ? setBercario06Items 
      : menuType === 'bercario_6_24' 
        ? setBercario624Items 
        : setMaternalItems;
    
    setItems(prev => 
      prev.map(item => 
        item.day_of_week === dayOfWeek 
          ? { ...item, [field]: value }
          : item
      )
    );
  }, []);

  const updateNutritionData = useCallback((
    menuType: MenuType, 
    dayOfWeek: number, 
    mealField: string, 
    foods: SelectedFood[]
  ) => {
    setNutritionData(prev => ({
      ...prev,
      [menuType]: {
        ...prev[menuType],
        [dayOfWeek]: {
          ...(prev[menuType][dayOfWeek] || {}),
          [mealField]: foods
        }
      }
    }));
  }, []);

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

      const copyMenuItems = (currentItems: MenuItem[], dbMenuType: string, menuType: MenuType): MenuItem[] => {
        const filteredData = data.filter(item => item.menu_type === dbMenuType);
        return [1, 2, 3, 4, 5].map(dayOfWeek => {
          const existing = filteredData.find(item => item.day_of_week === dayOfWeek);
          const currentItem = currentItems.find(b => b.day_of_week === dayOfWeek);
          if (existing) {
            return {
              id: currentItem?.id,
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
              menu_type: menuType
            };
          }
          return currentItem || emptyMenuItem(weekStartStr, dayOfWeek, menuType);
        });
      };

      setBercario06Items(copyMenuItems(bercario06Items, 'bercario', 'bercario_0_6'));
      setBercario624Items(copyMenuItems(bercario624Items, 'bercario_6_24', 'bercario_6_24'));
      setMaternalItems(copyMenuItems(maternalItems, 'maternal', 'maternal'));
      
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
    const allItems = [...bercario06Items, ...bercario624Items, ...maternalItems];
    let hasErrors = false;

    try {
      for (const item of allItems) {
        const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                          item.morning_snack || item.bottle || item.pre_dinner || item.notes;
        
        // Map UI menu type to database menu type
        const dbMenuType = item.menu_type === 'bercario_0_6' 
          ? 'bercario' 
          : item.menu_type === 'bercario_6_24' 
            ? 'bercario_6_24' 
            : 'maternal';
        
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
          menu_type: dbMenuType
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
            const updateFn = item.menu_type === 'bercario_0_6' 
              ? setBercario06Items 
              : item.menu_type === 'bercario_6_24'
                ? setBercario624Items
                : setMaternalItems;
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

  const getCurrentMenuItems = () => {
    switch (activeMenuTab) {
      case 'bercario_0_6':
        return bercario06Items;
      case 'bercario_6_24':
        return bercario624Items;
      case 'maternal':
        return maternalItems;
      default:
        return [];
    }
  };

  const currentMenuItems = getCurrentMenuItems();

  const getMenuTypeLabel = (type: MenuType) => {
    switch (type) {
      case 'bercario_0_6':
        return 'Berçário (0-6 meses)';
      case 'bercario_6_24':
        return 'Berçário (6m - 1a 11m)';
      case 'maternal':
        return 'Maternal / Jardim';
    }
  };

  const getMenuTypeColor = (type: MenuType) => {
    switch (type) {
      case 'bercario_0_6':
        return 'pimpo-blue';
      case 'bercario_6_24':
        return 'pimpo-purple';
      case 'maternal':
        return 'pimpo-green';
    }
  };

  const renderMenuForm = (items: MenuItem[], menuType: MenuType) => {
    const color = getMenuTypeColor(menuType);
    const isBercario = menuType !== 'maternal';
    
    return (
      <div className="grid gap-6">
        {items.map((item) => {
          const dayDate = addDays(weekStart, item.day_of_week - 1);
          const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                            item.morning_snack || item.bottle || item.pre_dinner;
          const nutritionKey = `${menuType}-${item.day_of_week}`;
          const isNutritionExpanded = expandedNutrition[nutritionKey];

          const handleValueChange = (field: keyof MenuItem, value: string) => {
            updateMenuItem(menuType, item.day_of_week, field, value);
          };

          const handleTimeChange = (field: keyof MenuItem, value: string) => {
            updateMenuItem(menuType, item.day_of_week, field, value);
          };

          return (
            <Card 
              key={item.day_of_week}
              className={`transition-all ${
                hasContent 
                  ? `border-${color}/30 bg-${color}/5`
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
                    <Check className={`w-5 h-5 text-${color}`} />
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
                  placeholder={menuType === 'bercario_0_6' ? "Leite materno, fórmula..." : "Descreva o café da manhã..."}
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  onValueChange={handleValueChange}
                  onTimeChange={handleTimeChange}
                />
                
                <MealField
                  icon={<Cookie className="w-4 h-4 text-orange-500" />}
                  label="Lanche da Manhã"
                  value={item.morning_snack}
                  timeValue={item.morning_snack_time}
                  field="morning_snack"
                  timeField="morning_snack_time"
                  placeholder={menuType === 'bercario_0_6' ? "Papinha, fruta amassada..." : "Descreva o lanche da manhã..."}
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  onValueChange={handleValueChange}
                  onTimeChange={handleTimeChange}
                />
                
                <MealField
                  icon={<Soup className="w-4 h-4 text-red-500" />}
                  label="Almoço"
                  value={item.lunch}
                  timeValue={item.lunch_time}
                  field="lunch"
                  timeField="lunch_time"
                  placeholder={menuType === 'bercario_0_6' ? "Papinha salgada, sopinha..." : "Descreva o almoço..."}
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  onValueChange={handleValueChange}
                  onTimeChange={handleTimeChange}
                />
                
                {isBercario && (
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
                    onValueChange={handleValueChange}
                    onTimeChange={handleTimeChange}
                  />
                )}
                
                <MealField
                  icon={<Apple className="w-4 h-4 text-green-500" />}
                  label="Lanche da Tarde"
                  value={item.snack}
                  timeValue={item.snack_time}
                  field="snack"
                  timeField="snack_time"
                  placeholder={menuType === 'bercario_0_6' ? "Fruta amassada, vitamina..." : "Descreva o lanche da tarde..."}
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  onValueChange={handleValueChange}
                  onTimeChange={handleTimeChange}
                />
                
                {isBercario && (
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
                    onValueChange={handleValueChange}
                    onTimeChange={handleTimeChange}
                  />
                )}
                
                <MealField
                  icon={<Moon className="w-4 h-4 text-indigo-500" />}
                  label="Jantar"
                  value={item.dinner}
                  timeValue={item.dinner_time}
                  field="dinner"
                  timeField="dinner_time"
                  placeholder={menuType === 'bercario_0_6' ? "Papinha, sopinha..." : "Descreva o jantar..."}
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  onValueChange={handleValueChange}
                  onTimeChange={handleTimeChange}
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

                {/* Nutritional Analysis Section */}
                <Collapsible
                  open={isNutritionExpanded}
                  onOpenChange={(open) => setExpandedNutrition(prev => ({ ...prev, [nutritionKey]: open }))}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" size="sm">
                      <span className="flex items-center gap-2">
                        <Salad className="w-4 h-4" />
                        Análise Nutricional (TACO)
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {isNutritionExpanded ? 'Recolher' : 'Expandir'}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Busque alimentos na Tabela TACO para calcular os valores nutricionais desta refeição.
                    </div>
                    <TacoFoodSearch
                      selectedFoods={nutritionData[menuType]?.[item.day_of_week]?.lunch || []}
                      onFoodsChange={(foods) => updateNutritionData(menuType, item.day_of_week, 'lunch', foods)}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Prepare nutrition data for PDF export
  const getNutritionExportData = () => {
    const currentNutrition = nutritionData[activeMenuTab] || {};
    return currentMenuItems.map(item => ({
      dayName: dayNames[item.day_of_week - 1],
      date: format(addDays(weekStart, item.day_of_week - 1), 'd/MM'),
      meals: Object.entries(currentNutrition[item.day_of_week] || {}).map(([mealName, foods]) => ({
        mealName,
        foods: foods as SelectedFood[],
      })),
    }));
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
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
      <div className="grid grid-cols-2 gap-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Alergias
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-pimpo-red/10">
              <AlertTriangle className="w-4 h-4 text-pimpo-red" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-fredoka font-bold">
              {stats.childrenWithAllergies}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Atenção especial no cardápio
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Cardápios
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-pimpo-green/10">
              <Calendar className="w-4 h-4 text-pimpo-green" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-fredoka font-bold">
              {stats.menuDaysConfigured}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Refeições configuradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="w-max min-w-full flex">
            <TabsTrigger value="cardapio" className="gap-1.5 px-3 md:px-4 whitespace-nowrap flex-shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Cardápio</span>
            </TabsTrigger>
            <TabsTrigger value="pais" className="gap-1.5 px-3 md:px-4 whitespace-nowrap flex-shrink-0">
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Pais</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 px-3 md:px-4 whitespace-nowrap flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-1.5 px-3 md:px-4 whitespace-nowrap flex-shrink-0">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Relatórios</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pais" className="mt-4">
          <TeacherParentChat />
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <StaffChatWindow />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4">
          <MyReportsTab />
        </TabsContent>

        <TabsContent value="cardapio" className="mt-4 space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-col gap-3">
            {/* Save + Copy buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                size="sm"
                className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span className="truncate">Salvar Cardápio</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={copying || loading} className="flex-1 sm:flex-none">
                    {copying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">Copiar da Semana Anterior</span>
                    <span className="sm:hidden">Copiar Semana</span>
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
            
            {/* PDF Export buttons */}
            <div className="flex flex-wrap gap-2">
              <MenuPdfExport 
                menuItems={currentMenuItems as any} 
                weekStart={weekStart} 
                disabled={loading || currentMenuItems.every(item => !item.breakfast && !item.lunch && !item.snack && !item.dinner)}
              />
              <NutritionPdfExport
                weekStart={weekStart}
                nutritionData={getNutritionExportData()}
                menuType={getMenuTypeLabel(activeMenuTab)}
                disabled={loading || Object.keys(nutritionData[activeMenuTab] || {}).length === 0}
              />
            </div>
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

          {/* Menu Type Tabs - Now with 3 tabs */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeMenuTab} onValueChange={(v) => setActiveMenuTab(v as MenuType)}>
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="w-max min-w-full grid grid-cols-3">
                  <TabsTrigger value="bercario_0_6" className="gap-1 px-2 sm:px-4 text-xs sm:text-sm">
                    <Baby className="w-4 h-4" />
                    <span className="hidden sm:inline">Berçário 0-6m</span>
                    <span className="sm:hidden">0-6m</span>
                  </TabsTrigger>
                  <TabsTrigger value="bercario_6_24" className="gap-1 px-2 sm:px-4 text-xs sm:text-sm">
                    <Baby className="w-4 h-4" />
                    <span className="hidden sm:inline">Berçário 6m-2a</span>
                    <span className="sm:hidden">6m-2a</span>
                  </TabsTrigger>
                  <TabsTrigger value="maternal" className="gap-1 px-2 sm:px-4 text-xs sm:text-sm">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Maternal/Jardim</span>
                    <span className="sm:hidden">Maternal</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  {getMenuTypeLabel(activeMenuTab)}
                </Badge>
              </div>

              <TabsContent value="bercario_0_6" className="mt-4">
                {renderMenuForm(bercario06Items, 'bercario_0_6')}
              </TabsContent>

              <TabsContent value="bercario_6_24" className="mt-4">
                {renderMenuForm(bercario624Items, 'bercario_6_24')}
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
