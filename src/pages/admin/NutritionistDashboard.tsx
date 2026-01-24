import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addWeeks, subWeeks, addDays, getDay } from "date-fns";
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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { MenuPdfExport } from "@/components/admin/MenuPdfExport";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
import { MyReportsTab } from "@/components/employee/MyReportsTab";
import { TeacherParentChat } from "@/components/teacher/TeacherParentChat";
import { MealField, MenuItem, dayNames, emptyMenuItem } from "@/components/admin/MealField";
import { IngredientWithNutrition } from "@/components/admin/IngredientQuantityEditor";
import { TodayOverviewWidget } from "@/components/admin/nutritionist/TodayOverviewWidget";
import { WeeklyNutritionSummary } from "@/components/admin/nutritionist/WeeklyNutritionSummary";
import { SimplifiedNutritionPdf } from "@/components/admin/nutritionist/SimplifiedNutritionPdf";
import { AllergyCheckBadge } from "@/components/admin/nutritionist/AllergyCheckBadge";

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

type MenuType = 'bercario_0_6' | 'bercario_6_24' | 'maternal';

interface NutritionTotals {
  // Macros
  energy: number;
  protein: number;
  lipid: number;
  carbohydrate: number;
  fiber: number;
  // Minerals
  calcium: number;
  iron: number;
  sodium: number;
  potassium: number;
  magnesium: number;
  phosphorus: number;
  zinc: number;
  copper: number;
  manganese: number;
  // Vitamins
  vitamin_c: number;
  vitamin_a: number;
  retinol: number;
  thiamine: number;
  riboflavin: number;
  pyridoxine: number;
  niacin: number;
  // Lipid composition
  cholesterol: number;
  saturated: number;
  monounsaturated: number;
  polyunsaturated: number;
}

interface MealNutritionState {
  [key: string]: NutritionTotals | null; // key: `${dayOfWeek}-${field}`
}

interface MealIngredientsState {
  [key: string]: IngredientWithNutrition[]; // key: `${dayOfWeek}-${field}`
}

interface ChildAllergy {
  childName: string;
  allergies: string;
}

export default function NutritionistDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("cardapio");
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeMenuTab, setActiveMenuTab] = useState<MenuType>('bercario_0_6');
  const [activeDayTab, setActiveDayTab] = useState<number>(1); // 1 = Segunda, 5 = Sexta
  const [bercario06Items, setBercario06Items] = useState<MenuItem[]>([]);
  const [bercario624Items, setBercario624Items] = useState<MenuItem[]>([]);
  const [maternalItems, setMaternalItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  
  // Nutrition tracking state
  const [nutritionByMeal, setNutritionByMeal] = useState<Record<MenuType, MealNutritionState>>({
    bercario_0_6: {},
    bercario_6_24: {},
    maternal: {},
  });
  
  // Ingredients tracking state for PDF export
  const [ingredientsByMeal, setIngredientsByMeal] = useState<Record<MenuType, MealIngredientsState>>({
    bercario_0_6: {},
    bercario_6_24: {},
    maternal: {},
  });
  
  // Children with allergies
  const [childrenWithAllergies, setChildrenWithAllergies] = useState<ChildAllergy[]>([]);
  
  const [stats, setStats] = useState({
    childrenWithAllergies: 0,
    menuDaysConfigured: 0,
  });

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  
  // Get today's day of week (1-5 for Mon-Fri, 0 otherwise)
  const todayDayOfWeek = (() => {
    const day = getDay(new Date());
    return day >= 1 && day <= 5 ? day : 1; // Default to Monday if weekend
  })();

  // Fetch stats and children with allergies
  useEffect(() => {
    async function fetchStats() {
      try {
        const [allergiesRes, menuRes, childrenRes] = await Promise.all([
          supabase.from("children").select("id", { count: "exact", head: true }).not("allergies", "is", null),
          supabase.from("weekly_menus").select("id", { count: "exact", head: true }),
          supabase.from("children").select("full_name, allergies").not("allergies", "is", null),
        ]);

        setStats({
          childrenWithAllergies: allergiesRes.count || 0,
          menuDaysConfigured: menuRes.count || 0,
        });
        
        if (childrenRes.data) {
          setChildrenWithAllergies(
            childrenRes.data.map(c => ({ 
              childName: c.full_name, 
              allergies: c.allergies || '' 
            }))
          );
        }
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
              const existingAny = existing as any;
              return {
                id: existing.id,
                week_start: existing.week_start,
                day_of_week: existing.day_of_week,
                breakfast: existing.breakfast || '',
                breakfast_time: existing.breakfast_time || defaultBreakfastTime,
                breakfast_qty: existingAny.breakfast_qty || '',
                morning_snack: existing.morning_snack || '',
                morning_snack_time: existing.morning_snack_time || '09:30',
                morning_snack_qty: existingAny.morning_snack_qty || '',
                lunch: existing.lunch || '',
                lunch_time: existing.lunch_time || defaultLunchTime,
                lunch_qty: existingAny.lunch_qty || '',
                bottle: existing.bottle || '',
                bottle_time: existing.bottle_time || '13:00',
                bottle_qty: existingAny.bottle_qty || '',
                snack: existing.snack || '',
                snack_time: existing.snack_time || defaultSnackTime,
                snack_qty: existingAny.snack_qty || '',
                pre_dinner: existing.pre_dinner || '',
                pre_dinner_time: existing.pre_dinner_time || '16:30',
                pre_dinner_qty: existingAny.pre_dinner_qty || '',
                dinner: existing.dinner || '',
                dinner_time: existing.dinner_time || defaultDinnerTime,
                dinner_qty: existingAny.dinner_qty || '',
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
        
        // Reset nutrition state when week changes
        setNutritionByMeal({
          bercario_0_6: {},
          bercario_6_24: {},
          maternal: {},
        });
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

  // Handle nutrition calculation callback with ingredients
  const handleNutritionCalculated = useCallback((
    menuType: MenuType, 
    dayOfWeek: number, 
    field: string, 
    totals: NutritionTotals | null,
    ingredients?: IngredientWithNutrition[]
  ) => {
    setNutritionByMeal(prev => ({
      ...prev,
      [menuType]: {
        ...prev[menuType],
        [`${dayOfWeek}-${field}`]: totals,
      }
    }));
    
    // Store ingredients for PDF export
    if (ingredients) {
      setIngredientsByMeal(prev => ({
        ...prev,
        [menuType]: {
          ...prev[menuType],
          [`${dayOfWeek}-${field}`]: ingredients,
        }
      }));
    }
  }, []);

  // Calculate day totals for a menu type
  const getDayTotals = useCallback((menuType: MenuType, dayOfWeek: number): NutritionTotals | null => {
    const mealFields = ['breakfast', 'morning_snack', 'lunch', 'bottle', 'snack', 'pre_dinner', 'dinner'];
    const dayMeals = nutritionByMeal[menuType];
    
    let hasAnyData = false;
    const totals: NutritionTotals = {
      energy: 0, protein: 0, lipid: 0, carbohydrate: 0, fiber: 0,
      calcium: 0, iron: 0, sodium: 0, potassium: 0, magnesium: 0,
      phosphorus: 0, zinc: 0, copper: 0, manganese: 0,
      vitamin_c: 0, vitamin_a: 0, retinol: 0, thiamine: 0,
      riboflavin: 0, pyridoxine: 0, niacin: 0,
      cholesterol: 0, saturated: 0, monounsaturated: 0, polyunsaturated: 0
    };
    
    mealFields.forEach(field => {
      const mealNutrition = dayMeals[`${dayOfWeek}-${field}`];
      if (mealNutrition) {
        hasAnyData = true;
        (Object.keys(totals) as (keyof NutritionTotals)[]).forEach(key => {
          totals[key] += (mealNutrition as any)[key] || 0;
        });
      }
    });
    
    return hasAnyData ? totals : null;
  }, [nutritionByMeal]);

  // Get today's nutrition for the active menu type
  const todayNutrition = getDayTotals(activeMenuTab, todayDayOfWeek);

  // Get weekly nutrition data for the active menu type
  const weeklyNutritionData = [1, 2, 3, 4, 5].map(day => ({
    dayOfWeek: day,
    dayName: dayNames[day - 1],
    totals: getDayTotals(activeMenuTab, day),
  }));

  // Prepare data for PDF export - include per-meal nutrition data and ingredients
  const pdfNutritionData = weeklyNutritionData.map((day, idx) => {
    const dayMeals = nutritionByMeal[activeMenuTab];
    const dayIngredients = ingredientsByMeal[activeMenuTab];
    const mealFields = ['breakfast', 'morning_snack', 'lunch', 'bottle', 'snack', 'pre_dinner', 'dinner'];
    const meals: Record<string, NutritionTotals | null> = {};
    const ingredients: Record<string, IngredientWithNutrition[]> = {};
    
    mealFields.forEach(field => {
      meals[field] = dayMeals[`${day.dayOfWeek}-${field}`] || null;
      ingredients[field] = dayIngredients[`${day.dayOfWeek}-${field}`] || [];
    });
    
    return {
      dayOfWeek: day.dayOfWeek,
      dayName: day.dayName,
      date: format(addDays(weekStart, idx), 'd/MM'),
      totals: day.totals,
      meals,
      ingredients,
    };
  });

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
            const existingAny = existing as any;
            return {
              id: currentItem?.id,
              week_start: weekStartStr,
              day_of_week: dayOfWeek,
              breakfast: existing.breakfast || '',
              breakfast_time: existing.breakfast_time || '07:30',
              breakfast_qty: existingAny.breakfast_qty || '',
              morning_snack: existing.morning_snack || '',
              morning_snack_time: existing.morning_snack_time || '09:30',
              morning_snack_qty: existingAny.morning_snack_qty || '',
              lunch: existing.lunch || '',
              lunch_time: existing.lunch_time || '11:00',
              lunch_qty: existingAny.lunch_qty || '',
              bottle: existing.bottle || '',
              bottle_time: existing.bottle_time || '13:00',
              bottle_qty: existingAny.bottle_qty || '',
              snack: existing.snack || '',
              snack_time: existing.snack_time || '15:00',
              snack_qty: existingAny.snack_qty || '',
              pre_dinner: existing.pre_dinner || '',
              pre_dinner_time: existing.pre_dinner_time || '16:30',
              pre_dinner_qty: existingAny.pre_dinner_qty || '',
              dinner: existing.dinner || '',
              dinner_time: existing.dinner_time || '17:30',
              dinner_qty: existingAny.dinner_qty || '',
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

  // Generate AI menu suggestion for a specific day
  const generateDayMenu = async (dayOfWeek: number, menuType: MenuType) => {
    setGeneratingDay(dayOfWeek);
    try {
      // Get previous menus for context
      const currentItems = menuType === 'bercario_0_6' ? bercario06Items 
        : menuType === 'bercario_6_24' ? bercario624Items 
        : maternalItems;
      
      const previousMenus = currentItems
        .filter(item => item.day_of_week !== dayOfWeek && (item.breakfast || item.lunch))
        .map(item => ({
          day: dayNames[item.day_of_week - 1],
          breakfast: item.breakfast,
          lunch: item.lunch,
          snack: item.snack,
        }));

      const { data, error } = await supabase.functions.invoke('suggest-daily-menu', {
        body: { menuType, dayOfWeek, previousMenus }
      });

      if (error) throw error;

      if (data?.suggestion) {
        const suggestion = data.suggestion;
        
        // Update each field from the suggestion (including qty fields)
        if (suggestion.breakfast) {
          updateMenuItem(menuType, dayOfWeek, 'breakfast', suggestion.breakfast);
        }
        if (suggestion.breakfast_qty) {
          updateMenuItem(menuType, dayOfWeek, 'breakfast_qty', suggestion.breakfast_qty);
        }
        if (suggestion.breakfast_time) {
          updateMenuItem(menuType, dayOfWeek, 'breakfast_time', suggestion.breakfast_time);
        }
        if (suggestion.morning_snack) {
          updateMenuItem(menuType, dayOfWeek, 'morning_snack', suggestion.morning_snack);
        }
        if (suggestion.morning_snack_qty) {
          updateMenuItem(menuType, dayOfWeek, 'morning_snack_qty', suggestion.morning_snack_qty);
        }
        if (suggestion.morning_snack_time) {
          updateMenuItem(menuType, dayOfWeek, 'morning_snack_time', suggestion.morning_snack_time);
        }
        if (suggestion.lunch) {
          updateMenuItem(menuType, dayOfWeek, 'lunch', suggestion.lunch);
        }
        if (suggestion.lunch_qty) {
          updateMenuItem(menuType, dayOfWeek, 'lunch_qty', suggestion.lunch_qty);
        }
        if (suggestion.lunch_time) {
          updateMenuItem(menuType, dayOfWeek, 'lunch_time', suggestion.lunch_time);
        }
        if (suggestion.bottle) {
          updateMenuItem(menuType, dayOfWeek, 'bottle', suggestion.bottle);
        }
        if (suggestion.bottle_qty) {
          updateMenuItem(menuType, dayOfWeek, 'bottle_qty', suggestion.bottle_qty);
        }
        if (suggestion.bottle_time) {
          updateMenuItem(menuType, dayOfWeek, 'bottle_time', suggestion.bottle_time);
        }
        if (suggestion.snack) {
          updateMenuItem(menuType, dayOfWeek, 'snack', suggestion.snack);
        }
        if (suggestion.snack_qty) {
          updateMenuItem(menuType, dayOfWeek, 'snack_qty', suggestion.snack_qty);
        }
        if (suggestion.snack_time) {
          updateMenuItem(menuType, dayOfWeek, 'snack_time', suggestion.snack_time);
        }
        if (suggestion.pre_dinner) {
          updateMenuItem(menuType, dayOfWeek, 'pre_dinner', suggestion.pre_dinner);
        }
        if (suggestion.pre_dinner_qty) {
          updateMenuItem(menuType, dayOfWeek, 'pre_dinner_qty', suggestion.pre_dinner_qty);
        }
        if (suggestion.pre_dinner_time) {
          updateMenuItem(menuType, dayOfWeek, 'pre_dinner_time', suggestion.pre_dinner_time);
        }
        if (suggestion.dinner) {
          updateMenuItem(menuType, dayOfWeek, 'dinner', suggestion.dinner);
        }
        if (suggestion.dinner_qty) {
          updateMenuItem(menuType, dayOfWeek, 'dinner_qty', suggestion.dinner_qty);
        }
        if (suggestion.dinner_time) {
          updateMenuItem(menuType, dayOfWeek, 'dinner_time', suggestion.dinner_time);
        }

        toast.success(`Cardápio de ${dayNames[dayOfWeek - 1]} gerado com sucesso!`);
      }
    } catch (error) {
      console.error('Error generating menu:', error);
      toast.error('Erro ao gerar sugestão. Tente novamente.');
    } finally {
      setGeneratingDay(null);
    }
  };

  const renderMenuForm = (items: MenuItem[], menuType: MenuType) => {
    const color = getMenuTypeColor(menuType);
    const isBercario = menuType !== 'maternal';
    
    // Filter to show only the selected day
    const selectedDayItem = items.find(item => item.day_of_week === activeDayTab);
    
    if (!selectedDayItem) return null;
    
    const item = selectedDayItem;
    const dayDate = addDays(weekStart, item.day_of_week - 1);
    const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                      item.morning_snack || item.bottle || item.pre_dinner;
    const dayTotals = getDayTotals(menuType, item.day_of_week);

    const handleValueChange = (field: keyof MenuItem, value: string) => {
      updateMenuItem(menuType, item.day_of_week, field, value);
    };

    const handleTimeChange = (field: keyof MenuItem, value: string) => {
      updateMenuItem(menuType, item.day_of_week, field, value);
    };
    
    const handleNutritionCallback = (field: string) => (totals: NutritionTotals | null, ingredients?: IngredientWithNutrition[]) => {
      handleNutritionCalculated(menuType, item.day_of_week, field, totals, ingredients);
    };

    // Get all meal texts for allergy checking
    const allMealTexts = [
      item.breakfast, item.morning_snack, item.lunch, 
      item.bottle, item.snack, item.pre_dinner, item.dinner
    ].filter(Boolean).join(', ');

    return (
      <Card 
        className={`transition-all ${
          hasContent 
            ? `border-${color}/30 bg-${color}/5`
            : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {dayNames[item.day_of_week - 1]}
              <span className="text-sm font-normal text-muted-foreground">
                ({format(dayDate, 'd/MM')})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* AI Generate button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateDayMenu(item.day_of_week, menuType)}
                disabled={generatingDay === item.day_of_week}
                className="gap-1 text-xs h-7"
              >
                {generatingDay === item.day_of_week ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">IA</span>
              </Button>
              {/* Allergy alert badge */}
              <AllergyCheckBadge 
                mealText={allMealTexts} 
                childrenWithAllergies={childrenWithAllergies} 
              />
              {/* Day total calories */}
              {dayTotals && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {dayTotals.energy.toFixed(0)} kcal
                </Badge>
              )}
              {hasContent && (
                <Check className={`w-5 h-5 text-${color}`} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <MealField
            icon={<Coffee className="w-4 h-4 text-amber-600" />}
            label="Café da Manhã"
            value={item.breakfast}
            timeValue={item.breakfast_time}
            qtyValue={item.breakfast_qty}
            field="breakfast"
            timeField="breakfast_time"
            qtyField="breakfast_qty"
            placeholder={menuType === 'bercario_0_6' ? "Leite materno, fórmula..." : "Descreva o café da manhã..."}
            menuType={menuType}
            dayOfWeek={item.day_of_week}
            onValueChange={handleValueChange}
            onTimeChange={handleTimeChange}
            onQtyChange={handleValueChange}
            onNutritionCalculated={handleNutritionCallback('breakfast')}
          />
          
          <MealField
            icon={<Cookie className="w-4 h-4 text-orange-500" />}
            label="Lanche da Manhã"
            value={item.morning_snack}
            timeValue={item.morning_snack_time}
            qtyValue={item.morning_snack_qty}
            field="morning_snack"
            timeField="morning_snack_time"
            qtyField="morning_snack_qty"
            placeholder={menuType === 'bercario_0_6' ? "Papinha, fruta amassada..." : "Descreva o lanche da manhã..."}
            menuType={menuType}
            dayOfWeek={item.day_of_week}
            onValueChange={handleValueChange}
            onTimeChange={handleTimeChange}
            onQtyChange={handleValueChange}
            onNutritionCalculated={handleNutritionCallback('morning_snack')}
          />
          
          <MealField
            icon={<Soup className="w-4 h-4 text-red-500" />}
            label="Almoço"
            value={item.lunch}
            timeValue={item.lunch_time}
            qtyValue={item.lunch_qty}
            field="lunch"
            timeField="lunch_time"
            qtyField="lunch_qty"
            placeholder={menuType === 'bercario_0_6' ? "Papinha salgada, sopinha..." : "Descreva o almoço..."}
            menuType={menuType}
            dayOfWeek={item.day_of_week}
            onValueChange={handleValueChange}
            onTimeChange={handleTimeChange}
            onQtyChange={handleValueChange}
            onNutritionCalculated={handleNutritionCallback('lunch')}
          />
          
          {isBercario && (
            <MealField
              icon={<Milk className="w-4 h-4 text-blue-400" />}
              label="Mamadeira"
              value={item.bottle}
              timeValue={item.bottle_time}
              qtyValue={item.bottle_qty}
              field="bottle"
              timeField="bottle_time"
              qtyField="bottle_qty"
              placeholder="Fórmula/Leite..."
              menuType={menuType}
              dayOfWeek={item.day_of_week}
              onValueChange={handleValueChange}
              onTimeChange={handleTimeChange}
              onQtyChange={handleValueChange}
              onNutritionCalculated={handleNutritionCallback('bottle')}
            />
          )}
          
          <MealField
            icon={<Apple className="w-4 h-4 text-green-500" />}
            label="Lanche da Tarde"
            value={item.snack}
            timeValue={item.snack_time}
            qtyValue={item.snack_qty}
            field="snack"
            timeField="snack_time"
            qtyField="snack_qty"
            placeholder={menuType === 'bercario_0_6' ? "Fruta amassada, vitamina..." : "Descreva o lanche da tarde..."}
            menuType={menuType}
            dayOfWeek={item.day_of_week}
            onValueChange={handleValueChange}
            onTimeChange={handleTimeChange}
            onQtyChange={handleValueChange}
            onNutritionCalculated={handleNutritionCallback('snack')}
          />
          
          {isBercario && (
            <MealField
              icon={<Cookie className="w-4 h-4 text-purple-500" />}
              label="Pré-Janta"
              value={item.pre_dinner}
              timeValue={item.pre_dinner_time}
              qtyValue={item.pre_dinner_qty}
              field="pre_dinner"
              timeField="pre_dinner_time"
              qtyField="pre_dinner_qty"
              placeholder="Papa de frutas, vitamina..."
              menuType={menuType}
              dayOfWeek={item.day_of_week}
              onValueChange={handleValueChange}
              onTimeChange={handleTimeChange}
              onQtyChange={handleValueChange}
              onNutritionCalculated={handleNutritionCallback('pre_dinner')}
            />
          )}
          
          <MealField
            icon={<Moon className="w-4 h-4 text-indigo-500" />}
            label="Jantar"
            value={item.dinner}
            timeValue={item.dinner_time}
            qtyValue={item.dinner_qty}
            field="dinner"
            timeField="dinner_time"
            qtyField="dinner_qty"
            placeholder={menuType === 'bercario_0_6' ? "Papinha, sopinha..." : "Descreva o jantar..."}
            menuType={menuType}
            dayOfWeek={item.day_of_week}
            onValueChange={handleValueChange}
            onTimeChange={handleTimeChange}
            onQtyChange={handleValueChange}
            onNutritionCalculated={handleNutritionCallback('dinner')}
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

      {/* Today Overview Widget */}
      <TodayOverviewWidget 
        todayNutrition={todayNutrition}
        childrenWithAllergies={stats.childrenWithAllergies}
        menuType={activeMenuTab}
      />

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
              <SimplifiedNutritionPdf
                weekStart={weekStart}
                nutritionData={pdfNutritionData}
                menuType={activeMenuTab}
                disabled={loading}
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

          {/* Weekly Nutrition Summary */}
          <WeeklyNutritionSummary weeklyData={weeklyNutritionData} />

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

              {/* Day sub-tabs */}
              <div className="mt-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-max min-w-full">
                  {[1, 2, 3, 4, 5].map((day) => {
                    const dayDate = addDays(weekStart, day - 1);
                    const currentItems = activeMenuTab === 'bercario_0_6' ? bercario06Items 
                      : activeMenuTab === 'bercario_6_24' ? bercario624Items 
                      : maternalItems;
                    const dayItem = currentItems.find(item => item.day_of_week === day);
                    const hasContent = dayItem && (dayItem.breakfast || dayItem.lunch || dayItem.snack || dayItem.dinner || 
                                      dayItem.morning_snack || dayItem.bottle || dayItem.pre_dinner);
                    
                    return (
                      <button
                        key={day}
                        onClick={() => setActiveDayTab(day)}
                        className={`flex-1 min-w-[60px] sm:min-w-[80px] px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${
                          activeDayTab === day
                            ? 'bg-background shadow-sm text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        <span className="hidden sm:inline">{dayNames[day - 1]}</span>
                        <span className="sm:hidden">{dayNames[day - 1].slice(0, 3)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(dayDate, 'd/MM')}
                        </span>
                        {hasContent && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
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
