import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  UtensilsCrossed,
  Coffee,
  Soup,
  Cookie,
  Moon,
  CalendarDays,
  Baby,
  Users,
  Clock,
  Milk,
  Apple,
  Eye,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { MenuPdfExport } from "@/components/admin/MenuPdfExport";
import { Link } from "react-router-dom";

interface MenuItem {
  id?: string;
  week_start: string;
  day_of_week: number;
  breakfast: string;
  breakfast_time: string;
  breakfast_qty?: string;
  morning_snack: string;
  morning_snack_time: string;
  morning_snack_qty?: string;
  lunch: string;
  lunch_time: string;
  lunch_qty?: string;
  bottle: string;
  bottle_time: string;
  bottle_qty?: string;
  snack: string;
  snack_time: string;
  snack_qty?: string;
  pre_dinner: string;
  pre_dinner_time: string;
  pre_dinner_qty?: string;
  dinner: string;
  dinner_time: string;
  dinner_qty?: string;
  notes: string;
  menu_type: 'bercario' | 'bercario_6_24' | 'maternal';
}

type MenuType = 'bercario' | 'bercario_6_24' | 'maternal';

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const menuTypeLabels: Record<MenuType, string> = {
  'bercario': 'Berçário 0-6 meses',
  'bercario_6_24': 'Berçário 6-24 meses',
  'maternal': 'Maternal / Jardim'
};

const menuTypeColors: Record<MenuType, string> = {
  'bercario': 'pimpo-blue',
  'bercario_6_24': 'pimpo-yellow',
  'maternal': 'pimpo-green'
};

export default function AdminMenu() {
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeTab, setActiveTab] = useState<MenuType>('bercario');
  const [menuItems, setMenuItems] = useState<Record<MenuType, MenuItem[]>>({
    bercario: [],
    bercario_6_24: [],
    maternal: []
  });
  const [loading, setLoading] = useState(true);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

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

        // Map database menu_type to our types
        const mapDbType = (dbType: string): MenuType => {
          if (dbType === 'bercario_0_6' || dbType === 'bercario') return 'bercario';
          if (dbType === 'bercario_6_24') return 'bercario_6_24';
          return 'maternal';
        };

        const createEmptyItems = (menuType: MenuType): MenuItem[] => {
          return [1, 2, 3, 4, 5].map(day => ({
            week_start: weekStartStr,
            day_of_week: day,
            breakfast: '',
            breakfast_time: menuType === 'maternal' ? '08:00' : '07:30',
            morning_snack: '',
            morning_snack_time: '09:30',
            lunch: '',
            lunch_time: menuType === 'maternal' ? '11:30' : '11:00',
            bottle: '',
            bottle_time: '13:00',
            snack: '',
            snack_time: menuType === 'maternal' ? '15:30' : '15:00',
            pre_dinner: '',
            pre_dinner_time: '16:30',
            dinner: '',
            dinner_time: menuType === 'maternal' ? '18:00' : '17:30',
            notes: '',
            menu_type: menuType
          }));
        };

        const result: Record<MenuType, MenuItem[]> = {
          bercario: createEmptyItems('bercario'),
          bercario_6_24: createEmptyItems('bercario_6_24'),
          maternal: createEmptyItems('maternal')
        };

        // Fill in with existing data
        data?.forEach(item => {
          const mappedType = mapDbType(item.menu_type);
          const dayIndex = result[mappedType].findIndex(m => m.day_of_week === item.day_of_week);
          if (dayIndex >= 0) {
            const itemAny = item as any;
            result[mappedType][dayIndex] = {
              id: item.id,
              week_start: item.week_start,
              day_of_week: item.day_of_week,
              breakfast: item.breakfast || '',
              breakfast_time: item.breakfast_time || '07:30',
              breakfast_qty: itemAny.breakfast_qty || '',
              morning_snack: item.morning_snack || '',
              morning_snack_time: item.morning_snack_time || '09:30',
              morning_snack_qty: itemAny.morning_snack_qty || '',
              lunch: item.lunch || '',
              lunch_time: item.lunch_time || '11:00',
              lunch_qty: itemAny.lunch_qty || '',
              bottle: item.bottle || '',
              bottle_time: item.bottle_time || '13:00',
              bottle_qty: itemAny.bottle_qty || '',
              snack: item.snack || '',
              snack_time: item.snack_time || '15:00',
              snack_qty: itemAny.snack_qty || '',
              pre_dinner: item.pre_dinner || '',
              pre_dinner_time: item.pre_dinner_time || '16:30',
              pre_dinner_qty: itemAny.pre_dinner_qty || '',
              dinner: item.dinner || '',
              dinner_time: item.dinner_time || '17:30',
              dinner_qty: itemAny.dinner_qty || '',
              notes: item.notes || '',
              menu_type: mappedType
            };
          }
        });

        setMenuItems(result);
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

  const MealDisplay = ({ 
    icon, 
    label, 
    value, 
    timeValue, 
    qty,
    iconColor = "text-muted-foreground"
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    timeValue: string;
    qty?: string;
    iconColor?: string;
  }) => {
    if (!value) return null;
    
    return (
      <div className="py-2 border-b border-border/50 last:border-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={`mt-0.5 ${iconColor}`}>{icon}</div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <p className="text-sm text-foreground break-words">{value}</p>
              {qty && <span className="text-xs text-muted-foreground">Porção: {qty}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="w-3 h-3" />
            {timeValue}
          </div>
        </div>
      </div>
    );
  };

  const renderMenuView = (items: MenuItem[], menuType: MenuType) => {
    const color = menuTypeColors[menuType];
    const isBercario = menuType === 'bercario' || menuType === 'bercario_6_24';
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => {
          const dayDate = addDays(weekStart, item.day_of_week - 1);
          const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                            item.morning_snack || item.bottle || item.pre_dinner;

          return (
            <Card 
              key={item.day_of_week}
              className={`transition-all ${
                hasContent 
                  ? `border-${color}/30 bg-${color}/5` 
                  : 'border-dashed border-muted-foreground/30'
              }`}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {dayNames[item.day_of_week - 1]}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {format(dayDate, 'd/MM')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                {!hasContent ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">
                    Cardápio não definido
                  </p>
                ) : (
                  <div className="space-y-0">
                    <MealDisplay
                      icon={<Coffee className="w-3.5 h-3.5" />}
                      label="Café da Manhã"
                      value={item.breakfast}
                      timeValue={item.breakfast_time}
                      qty={item.breakfast_qty}
                      iconColor="text-pimpo-yellow"
                    />
                    
                    {isBercario && (
                      <MealDisplay
                        icon={<Apple className="w-3.5 h-3.5" />}
                        label="Lanche da Manhã"
                        value={item.morning_snack}
                        timeValue={item.morning_snack_time}
                        qty={item.morning_snack_qty}
                        iconColor="text-pimpo-green"
                      />
                    )}
                    
                    <MealDisplay
                      icon={<Soup className="w-3.5 h-3.5" />}
                      label="Almoço"
                      value={item.lunch}
                      timeValue={item.lunch_time}
                      qty={item.lunch_qty}
                      iconColor={`text-${color}`}
                    />
                    
                    {isBercario && (
                      <MealDisplay
                        icon={<Milk className="w-3.5 h-3.5" />}
                        label="Mamadeira"
                        value={item.bottle}
                        timeValue={item.bottle_time}
                        qty={item.bottle_qty}
                        iconColor="text-pimpo-blue"
                      />
                    )}
                    
                    <MealDisplay
                      icon={<Cookie className="w-3.5 h-3.5" />}
                      label="Lanche da Tarde"
                      value={item.snack}
                      timeValue={item.snack_time}
                      qty={item.snack_qty}
                      iconColor="text-pimpo-yellow"
                    />
                    
                    {isBercario && (
                      <MealDisplay
                        icon={<UtensilsCrossed className="w-3.5 h-3.5" />}
                        label="Pré-Janta"
                        value={item.pre_dinner}
                        timeValue={item.pre_dinner_time}
                        qty={item.pre_dinner_qty}
                        iconColor="text-pimpo-red"
                      />
                    )}
                    
                    <MealDisplay
                      icon={<Moon className="w-3.5 h-3.5" />}
                      label={isBercario ? "Janta/Mamadeira" : "Jantar"}
                      value={item.dinner}
                      timeValue={item.dinner_time}
                      qty={item.dinner_qty}
                      iconColor="text-pimpo-red"
                    />
                    
                    {item.notes && (
                      <div className="pt-2 mt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          📝 {item.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const currentItems = menuItems[activeTab];
  const hasAnyContent = currentItems.some(item => 
    item.breakfast || item.lunch || item.snack || item.dinner
  );

  // Convert to old format for PDF export
  const convertForPdf = (items: MenuItem[]) => items.map(item => ({
    ...item,
    menu_type: activeTab === 'maternal' ? 'maternal' as const : 'bercario' as const
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="w-7 h-7 text-pimpo-yellow" />
              Cardápio Semanal
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visualização somente leitura
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/painel" state={{ view: 'nutritionist' }}>
              <Button 
                variant="outline"
                className="border-pimpo-green text-pimpo-green hover:bg-pimpo-green/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Editar (Nutricionista)
              </Button>
            </Link>
            <MenuPdfExport 
              menuItems={convertForPdf(currentItems)} 
              weekStart={weekStart} 
              disabled={loading || !hasAnyContent}
            />
          </div>
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
              <span className="hidden sm:inline">Semana Anterior</span>
            </Button>
            
            <div className="text-center flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-pimpo-yellow" />
              <span className="font-bold text-foreground text-sm sm:text-lg">
                {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              className="text-pimpo-yellow hover:bg-pimpo-yellow/10"
            >
              <span className="hidden sm:inline">Próxima Semana</span>
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badge info */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-background">
          <Eye className="w-3 h-3 mr-1" />
          Modo visualização
        </Badge>
        <span className="text-xs text-muted-foreground">
          Para editar o cardápio, acesse a Dashboard da Nutricionista
        </span>
      </div>

      {/* Tabs for Menu Types */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MenuType)}>
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger 
            value="bercario" 
            className="flex items-center gap-1 data-[state=active]:bg-pimpo-blue data-[state=active]:text-white text-xs sm:text-sm"
          >
            <Baby className="w-4 h-4" />
            <span className="hidden sm:inline">Berçário 0-6m</span>
            <span className="sm:hidden">0-6m</span>
          </TabsTrigger>
          <TabsTrigger 
            value="bercario_6_24" 
            className="flex items-center gap-1 data-[state=active]:bg-pimpo-yellow data-[state=active]:text-white text-xs sm:text-sm"
          >
            <Baby className="w-4 h-4" />
            <span className="hidden sm:inline">Berçário 6-24m</span>
            <span className="sm:hidden">6-24m</span>
          </TabsTrigger>
          <TabsTrigger 
            value="maternal" 
            className="flex items-center gap-1 data-[state=active]:bg-pimpo-green data-[state=active]:text-white text-xs sm:text-sm"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Maternal</span>
            <span className="sm:hidden">Maternal</span>
          </TabsTrigger>
        </TabsList>

        {/* Menu View */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pimpo-yellow" />
          </div>
        ) : (
          <>
            <TabsContent value="bercario" className="mt-6">
              {renderMenuView(menuItems.bercario, 'bercario')}
            </TabsContent>
            <TabsContent value="bercario_6_24" className="mt-6">
              {renderMenuView(menuItems.bercario_6_24, 'bercario_6_24')}
            </TabsContent>
            <TabsContent value="maternal" className="mt-6">
              {renderMenuView(menuItems.maternal, 'maternal')}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
