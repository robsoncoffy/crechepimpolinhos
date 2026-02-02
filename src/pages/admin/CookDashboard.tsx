import { useEffect, useState, lazy, Suspense, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList, unitOptions } from "@/hooks/useShoppingList";
import { 
  UtensilsCrossed, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  ChefHat,
  AlertTriangle,
  Milk,
  Search,
  Coffee,
  Cookie,
  Apple,
  Moon,
  Salad,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Users,
  CheckCheck,
  Wand2,
  DollarSign,
  Baby,
  Settings,
} from "lucide-react";
import { DashboardHeader, StatCard, StatGrid } from "@/components/admin/dashboards";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

// Lazy load heavy components
const StaffChatWindow = lazy(() => import("@/components/staff/StaffChatWindow").then(m => ({ default: m.StaffChatWindow })));
const MyReportsTab = lazy(() => import("@/components/employee/MyReportsTab").then(m => ({ default: m.MyReportsTab })));
const MealIngredientsList = lazy(() => import("@/components/admin/MealIngredientsList").then(m => ({ default: m.MealIngredientsList })));
const EmployeeSettingsTab = lazy(() => import("@/components/employee/EmployeeSettingsTab").then(m => ({ default: m.EmployeeSettingsTab })));

type Child = Database["public"]["Tables"]["children"]["Row"];

interface MealTracking {
  [childId: string]: {
    breakfast: boolean;
    morningSnack: boolean;
    lunch: boolean;
    afternoonSnack: boolean;
    dinner: boolean;
  };
}

const mealTypes = [
  { key: "breakfast", label: "Café da Manhã", icon: Coffee, time: "07:30", dbField: "breakfast_served" },
  { key: "morningSnack", label: "Lanche Manhã", icon: Cookie, time: "09:30", dbField: "morning_snack_served" },
  { key: "lunch", label: "Almoço", icon: Salad, time: "11:30", dbField: "lunch_served" },
  { key: "afternoonSnack", label: "Lanche Tarde", icon: Apple, time: "15:00", dbField: "afternoon_snack_served" },
  { key: "dinner", label: "Jantar", icon: Moon, time: "17:30", dbField: "dinner_served" },
];

const classLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const daysOfWeek = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
];

const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
  </div>
));

export default function CookDashboard() {
  const { profile, user } = useAuth();
  const { items: shoppingList, addItem, toggleItem, removeItem, pendingCount, completedCount, loading: shoppingLoading } = useShoppingList();
  
  const [activeTab, setActiveTab] = useState("cardapio");
  const [mealTracking, setMealTracking] = useState<MealTracking>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("todas");
  
  // Menu state
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [menuType, setMenuType] = useState<"bercario" | "maternal">("bercario");
  const [selectedMenuDay, setSelectedMenuDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 || today === 6 ? 1 : today;
  });
  
  // Shopping list
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("un");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [shoppingSuggestions, setShoppingSuggestions] = useState<string[]>([]);

  // Fetch children with React Query
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["cook-children"],
    queryFn: async () => {
      const { data } = await supabase.from("children").select("*").order("full_name");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch weekly menu
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const { data: weeklyMenu = {} } = useQuery({
    queryKey: ["cook-menu", weekStartStr, menuType],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("week_start", weekStartStr)
        .eq("menu_type", menuType);
      
      const menuByDay: Record<number, any> = {};
      data?.forEach((item) => { menuByDay[item.day_of_week] = item; });
      return menuByDay;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch meal tracking
  useEffect(() => {
    if (children.length === 0) return;

    const fetchMealTracking = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: trackingData } = await supabase
        .from("meal_tracking")
        .select("*")
        .eq("meal_date", today) as any;
      
      const tracking: MealTracking = {};
      (trackingData || []).forEach((record: any) => {
        tracking[record.child_id] = {
          breakfast: record.breakfast_served || false,
          morningSnack: record.morning_snack_served || false,
          lunch: record.lunch_served || false,
          afternoonSnack: record.afternoon_snack_served || false,
          dinner: record.dinner_served || false,
        };
      });
      setMealTracking(tracking);
    };

    fetchMealTracking();
  }, [children]);

  const toggleMeal = useCallback(async (childId: string, mealKey: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const currentValue = mealTracking[childId]?.[mealKey as keyof MealTracking[string]] || false;
    const newValue = !currentValue;
    
    setMealTracking((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        breakfast: prev[childId]?.breakfast || false,
        morningSnack: prev[childId]?.morningSnack || false,
        lunch: prev[childId]?.lunch || false,
        afternoonSnack: prev[childId]?.afternoonSnack || false,
        dinner: prev[childId]?.dinner || false,
        [mealKey]: newValue,
      },
    }));

    const dbFieldMap: Record<string, string> = {
      breakfast: "breakfast_served",
      morningSnack: "morning_snack_served",
      lunch: "lunch_served",
      afternoonSnack: "afternoon_snack_served",
      dinner: "dinner_served",
    };

    try {
      const { data: existing } = await (supabase.from("meal_tracking").select("id").eq("child_id", childId).eq("meal_date", today).single() as any);

      if (existing) {
        await (supabase.from("meal_tracking").update({ [dbFieldMap[mealKey]]: newValue }).eq("id", existing.id) as any);
      } else {
        await (supabase.from("meal_tracking").insert({
          child_id: childId,
          meal_date: today,
          [dbFieldMap[mealKey]]: newValue,
        }) as any);
      }
    } catch (error) {
      console.error("Error updating meal tracking:", error);
      setMealTracking((prev) => ({
        ...prev,
        [childId]: { ...prev[childId], [mealKey]: currentValue },
      }));
    }
  }, [mealTracking]);

  const markAllMeals = useCallback(async (mealKey: string, markAsServed = true) => {
    const filtered = selectedClass === "todas" ? children : children.filter((c) => c.class_type === selectedClass);
    
    for (const child of filtered) {
      if (mealTracking[child.id]?.[mealKey as keyof MealTracking[string]] !== markAsServed) {
        await toggleMeal(child.id, mealKey);
      }
    }
    toast.success(markAsServed ? "Todas as refeições marcadas!" : "Marcações removidas!");
  }, [children, mealTracking, selectedClass, toggleMeal]);

  const getCurrentMeal = () => {
    const hour = new Date().getHours();
    if (hour < 9) return "breakfast";
    if (hour < 11) return "morningSnack";
    if (hour < 14) return "lunch";
    if (hour < 16) return "afternoonSnack";
    return "dinner";
  };

  const filteredChildren = useMemo(() => 
    children.filter((child) => {
      const matchesSearch = child.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === "todas" || child.class_type === selectedClass;
      return matchesSearch && matchesClass;
    }), 
    [children, searchTerm, selectedClass]
  );

  const childrenWithAllergies = useMemo(() => children.filter((c) => c.allergies), [children]);
  const childrenWithSpecialMilk = useMemo(() => children.filter((c) => c.special_milk), [children]);

  const handleAddItem = useCallback(async () => {
    const success = await addItem(newItem, newQuantity, newUnit);
    if (success) {
      setNewItem("");
      setNewQuantity("1");
      setNewUnit("un");
    }
  }, [addItem, newItem, newQuantity, newUnit]);

  const currentMeal = getCurrentMeal();
  const currentMenu = weeklyMenu[selectedMenuDay];

  if (loadingChildren) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      <DashboardHeader
        icon={ChefHat}
        iconColor="text-orange-500"
        greeting={`Olá, ${profile?.full_name?.split(" ")[0]}! 👋`}
        subtitle={`Painel da Cozinha • ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      <StatGrid columns={4}>
        <StatCard icon={UtensilsCrossed} iconColor="text-orange-600" bgColor="bg-orange-50" borderColor="border-orange-200" value={children.length} label="Crianças" />
        <StatCard icon={AlertTriangle} iconColor="text-red-600" bgColor="bg-red-50" borderColor="border-red-200" value={childrenWithAllergies.length} label="Com Alergias" />
        <StatCard icon={Milk} iconColor="text-blue-600" bgColor="bg-blue-50" borderColor="border-blue-200" value={childrenWithSpecialMilk.length} label="Leite Especial" />
        <StatCard icon={ShoppingCart} iconColor="text-green-600" bgColor="bg-green-50" borderColor="border-green-200" value={pendingCount} label="Itens Pendentes" />
      </StatGrid>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b bg-muted/30 overflow-x-auto scrollbar-hide">
            <TabsList className="w-max min-w-full h-auto p-0 bg-transparent rounded-none flex">
              <TabsTrigger value="cardapio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <UtensilsCrossed className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Cardápio</span>
              </TabsTrigger>
              <TabsTrigger value="refeicoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Refeições</span>
              </TabsTrigger>
              <TabsTrigger value="alergias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Alergias</span>
              </TabsTrigger>
              <TabsTrigger value="leites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <Milk className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Leites</span>
              </TabsTrigger>
              <TabsTrigger value="equipe" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Equipe</span>
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Relatórios</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <Settings className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-4">
            <TabsContent value="cardapio" className="mt-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={menuType === "bercario" ? "default" : "outline"}
                  onClick={() => setMenuType("bercario")}
                  size="sm"
                  className={menuType === "bercario" ? "bg-pimpo-blue hover:bg-pimpo-blue/90" : ""}
                >
                  <Baby className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Berçário</span>
                </Button>
                <Button
                  variant={menuType === "maternal" ? "default" : "outline"}
                  onClick={() => setMenuType("maternal")}
                  size="sm"
                  className={menuType === "maternal" ? "bg-pimpo-green hover:bg-pimpo-green/90" : ""}
                >
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Maternal/Jardim</span>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  {format(weekStart, "dd/MM", { locale: ptBR })} - {format(addDays(weekStart, 4), "dd/MM", { locale: ptBR })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekStart(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-1 overflow-x-auto">
                {daysOfWeek.map((day) => (
                  <Button
                    key={day.value}
                    variant={selectedMenuDay === day.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMenuDay(day.value)}
                    className="flex-shrink-0"
                  >
                    {day.label.slice(0, 3)}
                  </Button>
                ))}
              </div>

              {currentMenu ? (
                <div className="space-y-3">
                  {mealTypes.map((meal) => {
                    const mealValue = currentMenu[meal.key.replace(/([A-Z])/g, '_$1').toLowerCase()];
                    if (!mealValue) return null;
                    return (
                      <Card key={meal.key} className={currentMeal === meal.key ? "border-orange-400 bg-orange-50/50" : ""}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <meal.icon className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-sm">{meal.label}</span>
                            <Badge variant="outline" className="text-xs">{meal.time}</Badge>
                            {currentMeal === meal.key && <Badge className="bg-orange-500">Agora</Badge>}
                          </div>
                          <p className="text-sm">{mealValue}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Cardápio não configurado para este dia</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="refeicoes" className="mt-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar criança..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="bercario">Berçário</SelectItem>
                    <SelectItem value="maternal">Maternal</SelectItem>
                    <SelectItem value="jardim">Jardim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredChildren.map((child) => (
                    <div key={child.id} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        {child.photo_url && <AvatarImage src={child.photo_url} />}
                        <AvatarFallback className="text-xs">{child.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{child.full_name}</p>
                        <p className="text-xs text-muted-foreground">{classLabels[child.class_type]}</p>
                      </div>
                      <div className="flex gap-1">
                        {mealTypes.map((meal) => (
                          <button
                            key={meal.key}
                            onClick={() => toggleMeal(child.id, meal.key)}
                            className={`p-1.5 rounded transition-colors ${
                              mealTracking[child.id]?.[meal.key as keyof MealTracking[string]]
                                ? "bg-green-100 text-green-600"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title={meal.label}
                          >
                            <meal.icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="alergias" className="mt-0">
              {childrenWithAllergies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>Nenhuma criança com alergias registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {childrenWithAllergies.map((child) => (
                    <Card key={child.id} className="border-red-200 bg-red-50/50">
                      <CardContent className="p-4 flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {child.photo_url && <AvatarImage src={child.photo_url} />}
                          <AvatarFallback className="bg-red-100 text-red-700">{child.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{child.full_name}</p>
                          <Badge variant="destructive" className="mt-1">⚠️ {child.allergies}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="leites" className="mt-0">
              {childrenWithSpecialMilk.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Milk className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma criança com leite especial</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {childrenWithSpecialMilk.map((child) => (
                    <Card key={child.id} className="border-blue-200 bg-blue-50/50">
                      <CardContent className="p-4 flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {child.photo_url && <AvatarImage src={child.photo_url} />}
                          <AvatarFallback className="bg-blue-100 text-blue-700">{child.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{child.full_name}</p>
                          <Badge className="mt-1 bg-blue-100 text-blue-700">🍼 {child.special_milk}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="equipe" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <StaffChatWindow />
              </Suspense>
            </TabsContent>

            <TabsContent value="relatorios" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <MyReportsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="config" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <EmployeeSettingsTab />
              </Suspense>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
