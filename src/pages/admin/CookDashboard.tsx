import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList, unitOptions } from "@/hooks/useShoppingList";
import { 
  UtensilsCrossed, 
  Clock, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Check, 
  ChefHat,
  AlertTriangle,
  Baby,
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
  Sparkles,
  Loader2,
  MessageSquare,
  Users,
  CheckCheck,
  Wand2,
  DollarSign,
} from "lucide-react";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { MyReportsTab } from "@/components/employee/MyReportsTab";

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

export default function CookDashboard() {
  const { profile, user } = useAuth();
  const { items: shoppingList, addItem, toggleItem, removeItem, pendingCount, completedCount, loading: shoppingLoading } = useShoppingList();
  
  const [activeTab, setActiveTab] = useState("cardapio");
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
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
  const [weeklyMenu, setWeeklyMenu] = useState<Record<number, any>>({});
  
  // Shopping list
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("un");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [shoppingSuggestions, setShoppingSuggestions] = useState<string[]>([]);

  // Fetch children and menu data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch children
        const { data: childrenData, error: childrenError } = await supabase
          .from("children")
          .select("*")
          .order("full_name");
        
        if (childrenError) throw childrenError;
        setChildren(childrenData || []);

        // Fetch weekly menu
        const weekStartStr = format(weekStart, "yyyy-MM-dd");
        const { data: menuData } = await supabase
          .from("weekly_menus")
          .select("*")
          .eq("week_start", weekStartStr)
          .eq("menu_type", menuType);
        
        const menuByDay: Record<number, any> = {};
        menuData?.forEach((item) => {
          menuByDay[item.day_of_week] = item;
        });
        setWeeklyMenu(menuByDay);

        // Fetch today's meal tracking
        const today = format(new Date(), "yyyy-MM-dd");
        // Using a workaround for TypeScript deep recursion issue
        const mealTable = supabase.from("meal_tracking");
        const mealQuery = mealTable.select("*").eq("meal_date", today);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: trackingData } = await (mealQuery as any);
        
        const tracking: MealTracking = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [weekStart, menuType]);

  // Toggle meal for a child
  const toggleMeal = async (childId: string, mealKey: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const currentValue = mealTracking[childId]?.[mealKey as keyof MealTracking[string]] || false;
    const newValue = !currentValue;
    
    // Optimistic update
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

    // Map frontend key to database field
    const dbFieldMap: Record<string, string> = {
      breakfast: "breakfast_served",
      morningSnack: "morning_snack_served",
      lunch: "lunch_served",
      afternoonSnack: "afternoon_snack_served",
      dinner: "dinner_served",
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingQuery = supabase.from("meal_tracking").select("id").eq("child_id", childId).eq("meal_date", today).single() as any;
      const { data: existing } = await existingQuery;

      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("meal_tracking").update({ [dbFieldMap[mealKey]]: newValue }).eq("id", existing.id) as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("meal_tracking").insert({
            child_id: childId,
            meal_date: today,
            [dbFieldMap[mealKey]]: newValue,
          }) as any);
      }
    } catch (error) {
      console.error("Error updating meal tracking:", error);
      // Revert on error
      setMealTracking((prev) => ({
        ...prev,
        [childId]: {
          ...prev[childId],
          [mealKey]: currentValue,
        },
      }));
    }
  };

  // Mark all children for a meal
  const markAllMeals = async (mealKey: string, markAsServed: boolean = true) => {
    const filteredChildren = selectedClass === "todas" 
      ? children 
      : children.filter((c) => c.class_type === selectedClass);
    
    for (const child of filteredChildren) {
      if (mealTracking[child.id]?.[mealKey as keyof MealTracking[string]] !== markAsServed) {
        await toggleMeal(child.id, mealKey);
      }
    }
    toast.success(markAsServed ? "Todas as refeições marcadas!" : "Marcações removidas!");
  };

  // Get current meal based on time
  const getCurrentMeal = () => {
    const hour = new Date().getHours();
    if (hour < 9) return "breakfast";
    if (hour < 11) return "morningSnack";
    if (hour < 14) return "lunch";
    if (hour < 16) return "afternoonSnack";
    return "dinner";
  };

  // Filter children
  const filteredChildren = children.filter((child) => {
    const matchesSearch = child.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "todas" || child.class_type === selectedClass;
    return matchesSearch && matchesClass;
  });

  const childrenWithAllergies = children.filter((c) => c.allergies);
  const childrenWithSpecialMilk = children.filter((c) => c.special_milk);

  // Generate AI shopping suggestions
  const generateShoppingSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("menu-ai-suggestions", {
        body: { 
          mealType: "lunch", 
          menuType: "maternal",
          dayOfWeek: new Date().getDay(),
          ingredient: "compras"
        },
      });
      
      if (error) throw error;
      
      // Filter out items already in the list
      const existingNames = shoppingList.map((item) => item.name.toLowerCase());
      const suggestions = (data.suggestions || [])
        .filter((s: string) => !existingNames.some((name) => s.toLowerCase().includes(name)))
        .slice(0, 4);
      
      setShoppingSuggestions(suggestions);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Fallback suggestions
      setShoppingSuggestions([
        "Frango - 3kg",
        "Cenoura - 2kg",
        "Batata - 3kg",
        "Feijão - 2kg",
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAddItem = async () => {
    const success = await addItem(newItem, newQuantity, newUnit);
    if (success) {
      setNewItem("");
      setNewQuantity("1");
      setNewUnit("un");
    }
  };

  const handleAddFromSuggestion = async (suggestion: string) => {
    const parts = suggestion.split(" - ");
    const itemName = parts[0].trim();
    const quantity = parts[1]?.trim() || "1 un";
    const success = await addItem(itemName, quantity.split(" ")[0] || "1", quantity.split(" ")[1] || "un");
    if (success) {
      setShoppingSuggestions((prev) => prev.filter((s) => s !== suggestion));
    }
  };

  const currentMeal = getCurrentMeal();
  const currentMenu = weeklyMenu[selectedMenuDay];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-2">
          <ChefHat className="w-8 h-8 text-orange-500" />
          Olá, {profile?.full_name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Painel da Cozinha • {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <UtensilsCrossed className="w-5 h-5 mx-auto text-orange-600 mb-1" />
            <p className="text-2xl font-fredoka font-bold text-orange-600">{children.length}</p>
            <p className="text-xs text-muted-foreground">Crianças</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto text-red-600 mb-1" />
            <p className="text-2xl font-fredoka font-bold text-red-600">{childrenWithAllergies.length}</p>
            <p className="text-xs text-muted-foreground">Com Alergias</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Milk className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-fredoka font-bold text-blue-600">{childrenWithSpecialMilk.length}</p>
            <p className="text-xs text-muted-foreground">Leite Especial</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-fredoka font-bold text-green-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Itens Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b bg-muted/30">
              <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-6">
                <TabsTrigger value="cardapio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="hidden sm:inline">Cardápio</span>
                </TabsTrigger>
                <TabsTrigger value="refeicoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Refeições</span>
                </TabsTrigger>
                <TabsTrigger value="alergias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Alergias</span>
                </TabsTrigger>
                <TabsTrigger value="leites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                  <Milk className="w-4 h-4" />
                  <span className="hidden sm:inline">Leites</span>
                </TabsTrigger>
                <TabsTrigger value="equipe" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Equipe</span>
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Relatórios</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Cardápio Tab */}
              <TabsContent value="cardapio" className="mt-0 space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant={menuType === "bercario" ? "default" : "outline"}
                      onClick={() => setMenuType("bercario")}
                      className={menuType === "bercario" ? "bg-pimpo-blue hover:bg-pimpo-blue/90" : ""}
                    >
                      <Baby className="w-4 h-4 mr-2" />
                      Berçário
                    </Button>
                    <Button
                      variant={menuType === "maternal" ? "default" : "outline"}
                      onClick={() => setMenuType("maternal")}
                      className={menuType === "maternal" ? "bg-pimpo-green hover:bg-pimpo-green/90" : ""}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Maternal/Jardim
                    </Button>
                  </div>
                  <Link to="/painel/cardapio">
                    <Button variant="outline" size="sm">
                      Ver Cardápio Completo
                    </Button>
                  </Link>
                </div>

                {/* Day Selector */}
                <div className="flex gap-2 flex-wrap">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day.value}
                      variant={selectedMenuDay === day.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMenuDay(day.value)}
                      className={selectedMenuDay === day.value ? "bg-orange-500 hover:bg-orange-600" : ""}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>

                {/* Menu Display */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : currentMenu ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {currentMenu.breakfast && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-1">
                          <Coffee className="w-4 h-4" />
                          Café da Manhã
                          <span className="text-xs ml-auto">{currentMenu.breakfast_time || "07:30"}</span>
                        </div>
                        <p className="text-sm">{currentMenu.breakfast}</p>
                      </div>
                    )}
                    {currentMenu.morning_snack && (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-orange-700 mb-1">
                          <Cookie className="w-4 h-4" />
                          Lanche da Manhã
                          <span className="text-xs ml-auto">{currentMenu.morning_snack_time || "09:30"}</span>
                        </div>
                        <p className="text-sm">{currentMenu.morning_snack}</p>
                      </div>
                    )}
                    {currentMenu.lunch && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-1">
                          <Salad className="w-4 h-4" />
                          Almoço
                          <span className="text-xs ml-auto">{currentMenu.lunch_time || "11:30"}</span>
                        </div>
                        <p className="text-sm">{currentMenu.lunch}</p>
                      </div>
                    )}
                    {menuType === "bercario" && currentMenu.bottle && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-1">
                          <Milk className="w-4 h-4" />
                          Mamadeira
                          <span className="text-xs ml-auto">{currentMenu.bottle_time || "13:00"}</span>
                        </div>
                        <p className="text-sm">{currentMenu.bottle}</p>
                      </div>
                    )}
                    {currentMenu.snack && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-1">
                          <Apple className="w-4 h-4" />
                          Lanche da Tarde
                          <span className="text-xs ml-auto">{currentMenu.snack_time || "15:00"}</span>
                        </div>
                        <p className="text-sm">{currentMenu.snack}</p>
                      </div>
                    )}
                    {currentMenu.dinner && (
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 mb-1">
                          <Moon className="w-4 h-4" />
                          Jantar
                          <span className="text-xs ml-auto">{currentMenu.dinner_time || "17:30"}</span>
                        </div>
                        <p className="text-sm">{currentMenu.dinner}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Cardápio não configurado para este dia</p>
                    <Link to="/painel/cardapio">
                      <Button variant="link" className="mt-2">Configurar cardápio</Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              {/* Refeições Tab */}
              <TabsContent value="refeicoes" className="mt-0 space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar criança..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-48"
                      />
                    </div>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-32">
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
                  <Badge variant="outline" className="text-sm">
                    Refeição atual: {mealTypes.find((m) => m.key === currentMeal)?.label}
                  </Badge>
                </div>

                {/* Meal Type Selector with Mark All */}
                <div className="flex flex-wrap gap-2">
                  {mealTypes.map((meal) => {
                    const Icon = meal.icon;
                    const allMarked = filteredChildren.length > 0 && 
                      filteredChildren.every((c) => mealTracking[c.id]?.[meal.key as keyof MealTracking[string]]);
                    
                    return (
                      <Button
                        key={meal.key}
                        variant={currentMeal === meal.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => markAllMeals(meal.key, !allMarked)}
                        className={`gap-2 ${allMarked ? "bg-green-500 hover:bg-green-600" : ""}`}
                      >
                        <Icon className="w-4 h-4" />
                        {meal.label}
                        {allMarked && <Check className="w-3 h-3" />}
                      </Button>
                    );
                  })}
                </div>

                {/* Children List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredChildren.map((child) => (
                      <div key={child.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
                            <AvatarFallback className="bg-orange-100 text-orange-700">
                              {child.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{child.full_name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {classLabels[child.class_type] || child.class_type}
                              </span>
                              {child.allergies && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                  Alergia
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {mealTypes.map((meal) => {
                              const Icon = meal.icon;
                              const isChecked = mealTracking[child.id]?.[meal.key as keyof MealTracking[string]] || false;
                              
                              return (
                                <Button
                                  key={meal.key}
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${isChecked ? "bg-green-100 text-green-700" : "text-muted-foreground"}`}
                                  onClick={() => toggleMeal(child.id, meal.key)}
                                >
                                  <Icon className="w-4 h-4" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Alergias Tab */}
              <TabsContent value="alergias" className="mt-0 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Crianças com Alergias e Restrições
                </h3>
                
                {childrenWithAllergies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>Nenhuma criança com alergias cadastradas</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {childrenWithAllergies.map((child) => (
                        <Card key={child.id} className="border-red-200 bg-red-50/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12">
                                {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
                                <AvatarFallback className="bg-red-100 text-red-700">
                                  {child.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">{child.full_name}</p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {classLabels[child.class_type] || child.class_type}
                                </p>
                                {child.allergies && (
                                  <div className="mb-1">
                                    <span className="text-xs font-medium text-red-700">Alergias: </span>
                                    <span className="text-sm text-red-600">{child.allergies}</span>
                                  </div>
                                )}
                                {child.dietary_restrictions && (
                                  <div>
                                    <span className="text-xs font-medium text-amber-700">Restrições: </span>
                                    <span className="text-sm text-amber-600">{child.dietary_restrictions}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Leites Tab */}
              <TabsContent value="leites" className="mt-0 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Milk className="w-5 h-5 text-blue-500" />
                  Crianças com Leite Especial
                </h3>
                
                {childrenWithSpecialMilk.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Milk className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma criança com leite especial cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {childrenWithSpecialMilk.map((child) => (
                        <Card key={child.id} className="border-blue-200 bg-blue-50/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12">
                                {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                  {child.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">{child.full_name}</p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {classLabels[child.class_type] || child.class_type}
                                </p>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  <Milk className="w-3 h-3 mr-1" />
                                  {child.special_milk}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Equipe Tab */}
              <TabsContent value="equipe" className="mt-0">
                <div className="h-[500px]">
                  <StaffChatWindow />
                </div>
              </TabsContent>

              {/* Meus Relatórios Tab */}
              <TabsContent value="relatorios" className="mt-0">
                <MyReportsTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Shopping List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Lista de Compras
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateShoppingSuggestions}
                disabled={isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-2">Sugestões IA</span>
              </Button>
              <Badge variant="secondary">{pendingCount} pendentes</Badge>
              <Badge variant="outline" className="text-green-600 border-green-300">
                <Check className="w-3 h-3 mr-1" />
                {completedCount} comprados
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Suggestions */}
          {shoppingSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="w-full flex items-center gap-2 text-sm text-primary mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">Sugestões:</span>
              </div>
              {shoppingSuggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddFromSuggestion(suggestion)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {/* Add new item */}
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Nome do item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              className="flex-1 min-w-[150px]"
            />
            <Input
              placeholder="Qtd"
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-16"
            />
            <Select value={newUnit} onValueChange={setNewUnit}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddItem} disabled={!newItem.trim()} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Shopping List Items */}
          {shoppingLoading ? (
            <p className="text-muted-foreground text-center py-4">Carregando...</p>
          ) : shoppingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum item na lista</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.checked ? "bg-muted/50 opacity-60" : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id, item.checked)}
                      />
                      <div>
                        <p className={`font-medium text-sm ${item.checked ? "line-through" : ""}`}>
                          {item.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Mini Calendar */}
      <MiniCalendar />
    </div>
  );
}
