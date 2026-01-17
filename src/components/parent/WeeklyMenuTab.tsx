import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addWeeks, subWeeks, addDays, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  UtensilsCrossed,
  Coffee,
  Soup,
  Cookie,
  Moon,
  AlertTriangle,
  Loader2,
  CalendarDays
} from "lucide-react";

interface WeeklyMenuTabProps {
  childAllergies?: string | null;
}

interface MenuItem {
  id: string;
  week_start: string;
  day_of_week: number;
  breakfast: string | null;
  lunch: string | null;
  snack: string | null;
  dinner: string | null;
  notes: string | null;
}

const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const dayEmojis = ['🌅', '🌤️', '☀️', '🌻', '🎉'];

export function WeeklyMenuTab({ childAllergies }: WeeklyMenuTabProps) {
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const allergiesList = childAllergies 
    ? childAllergies.toLowerCase().split(',').map(a => a.trim())
    : [];

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('weekly_menus')
        .select('*')
        .eq('week_start', weekStartStr)
        .order('day_of_week');

      if (!error && data) {
        setMenuItems(data);
      }
      setLoading(false);
    };

    fetchMenu();
  }, [weekStart]);

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const checkForAllergens = (text: string | null): boolean => {
    if (!text || allergiesList.length === 0) return false;
    const lowerText = text.toLowerCase();
    return allergiesList.some(allergy => lowerText.includes(allergy));
  };

  const getMenuForDay = (dayOfWeek: number): MenuItem | undefined => {
    return menuItems.find(item => item.day_of_week === dayOfWeek);
  };

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="border-pimpo-yellow/20 bg-gradient-to-r from-pimpo-yellow/5 to-pimpo-yellow/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousWeek}
              className="text-pimpo-yellow hover:bg-pimpo-yellow/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <CalendarDays className="w-5 h-5 text-pimpo-yellow" />
                <span className="font-bold text-foreground">
                  {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 4), "d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              {!isCurrentWeek && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="text-xs text-pimpo-blue p-0 h-auto mt-1"
                >
                  Ir para semana atual
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              className="text-pimpo-yellow hover:bg-pimpo-yellow/10"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Allergen Warning */}
      {allergiesList.length > 0 && (
        <div className="bg-pimpo-red/10 border border-pimpo-red/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-pimpo-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-pimpo-red text-sm">Alergias Registradas</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {allergiesList.map((allergy, index) => (
                <Badge key={index} variant="destructive" className="bg-pimpo-red/20 text-pimpo-red text-xs">
                  {allergy}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Itens com estes ingredientes serão destacados em vermelho
            </p>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pimpo-yellow" />
        </div>
      ) : menuItems.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Cardápio não disponível para esta semana</p>
            <p className="text-xs text-muted-foreground mt-1">O cardápio será publicado em breve</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((dayOfWeek) => {
            const menu = getMenuForDay(dayOfWeek);
            const dayDate = addDays(weekStart, dayOfWeek - 1);
            const isDayToday = isToday(dayDate);

            return (
              <Card 
                key={dayOfWeek}
                className={`transition-all duration-300 ${
                  isDayToday 
                    ? 'border-2 border-pimpo-green shadow-lg bg-gradient-to-br from-pimpo-green/5 to-transparent' 
                    : 'border-muted-foreground/10 hover:border-pimpo-yellow/30'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-xl">{dayEmojis[dayOfWeek - 1]}</span>
                      {dayNames[dayOfWeek - 1]}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({format(dayDate, 'd/MM')})
                      </span>
                    </CardTitle>
                    {isDayToday && (
                      <Badge className="bg-pimpo-green text-white">Hoje</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {menu ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Café da Manhã */}
                      <MealCard
                        icon={<Coffee className="w-4 h-4" />}
                        label="Café da Manhã"
                        content={menu.breakfast}
                        hasAllergen={checkForAllergens(menu.breakfast)}
                        color="pimpo-yellow"
                      />
                      
                      {/* Almoço */}
                      <MealCard
                        icon={<Soup className="w-4 h-4" />}
                        label="Almoço"
                        content={menu.lunch}
                        hasAllergen={checkForAllergens(menu.lunch)}
                        color="pimpo-green"
                      />
                      
                      {/* Lanche */}
                      <MealCard
                        icon={<Cookie className="w-4 h-4" />}
                        label="Lanche"
                        content={menu.snack}
                        hasAllergen={checkForAllergens(menu.snack)}
                        color="pimpo-blue"
                      />
                      
                      {/* Jantar */}
                      <MealCard
                        icon={<Moon className="w-4 h-4" />}
                        label="Jantar"
                        content={menu.dinner}
                        hasAllergen={checkForAllergens(menu.dinner)}
                        color="pimpo-red"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Cardápio não disponível
                    </p>
                  )}
                  
                  {menu?.notes && (
                    <div className="mt-3 bg-muted/30 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">
                        📝 {menu.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MealCardProps {
  icon: React.ReactNode;
  label: string;
  content: string | null;
  hasAllergen: boolean;
  color: string;
}

function MealCard({ icon, label, content, hasAllergen, color }: MealCardProps) {
  return (
    <div className={`rounded-lg p-3 ${
      hasAllergen 
        ? 'bg-pimpo-red/10 border border-pimpo-red/30' 
        : `bg-${color}/5 border border-${color}/10`
    }`}>
      <div className={`flex items-center gap-1.5 mb-1 ${
        hasAllergen ? 'text-pimpo-red' : `text-${color}`
      }`}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
        {hasAllergen && <AlertTriangle className="w-3 h-3 ml-auto" />}
      </div>
      <p className={`text-xs ${content ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {content || 'Não informado'}
      </p>
    </div>
  );
}
