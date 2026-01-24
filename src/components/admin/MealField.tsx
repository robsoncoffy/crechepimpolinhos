import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { MealSuggestions } from './MealSuggestions';
import { AutoNutritionBadges } from './AutoNutritionBadges';
import { useAutoNutrition } from '@/hooks/useAutoNutrition';

export interface MenuItem {
  id?: string;
  week_start: string;
  day_of_week: number;
  breakfast: string;
  breakfast_time: string;
  breakfast_qty: string;
  morning_snack: string;
  morning_snack_time: string;
  morning_snack_qty: string;
  lunch: string;
  lunch_time: string;
  lunch_qty: string;
  bottle: string;
  bottle_time: string;
  bottle_qty: string;
  snack: string;
  snack_time: string;
  snack_qty: string;
  pre_dinner: string;
  pre_dinner_time: string;
  pre_dinner_qty: string;
  dinner: string;
  dinner_time: string;
  dinner_qty: string;
  notes: string;
  menu_type: 'bercario_0_6' | 'bercario_6_24' | 'maternal';
}

interface NutritionTotals {
  energy: number;
  protein: number;
  lipid: number;
  carbohydrate: number;
  fiber: number;
  calcium: number;
  iron: number;
  sodium: number;
  vitamin_c: number;
  vitamin_a: number;
}

interface MealFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  timeValue: string;
  qtyValue: string;
  field: keyof MenuItem;
  timeField: keyof MenuItem;
  qtyField: keyof MenuItem;
  placeholder: string;
  menuType: 'bercario_0_6' | 'bercario_6_24' | 'maternal';
  dayOfWeek: number;
  onValueChange: (field: keyof MenuItem, value: string) => void;
  onTimeChange: (field: keyof MenuItem, value: string) => void;
  onQtyChange: (field: keyof MenuItem, value: string) => void;
  onNutritionCalculated?: (totals: NutritionTotals | null) => void;
}

// Memoized component to prevent unnecessary re-renders
export const MealField = memo(function MealField({
  icon,
  label,
  value,
  timeValue,
  qtyValue,
  field,
  timeField,
  qtyField,
  placeholder,
  menuType,
  dayOfWeek,
  onValueChange,
  onTimeChange,
  onQtyChange,
  onNutritionCalculated,
}: MealFieldProps) {
  const { parseNutrition, loading } = useAutoNutrition();
  const [nutritionTotals, setNutritionTotals] = useState<NutritionTotals | null>(null);
  const [foodCount, setFoodCount] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Map new menu types to the API expected types
  const apiMenuType = menuType === 'maternal' ? 'maternal' : 'bercario';

  // Auto-calculate nutrition when value or quantity changes (debounced)
  const calculateNutrition = useCallback(async (mealText: string, qty: string) => {
    if (mealText.trim().length < 3) {
      setNutritionTotals(null);
      setFoodCount(0);
      onNutritionCalculated?.(null);
      return;
    }

    // Include quantity in the description if provided, so AI can use it
    const descriptionWithQty = qty && qty.trim() 
      ? `${mealText} (${qty.trim()})`
      : mealText;

    const result = await parseNutrition(descriptionWithQty);
    setNutritionTotals(result.totals);
    setFoodCount(result.foods?.length || 0);
    onNutritionCalculated?.(result.totals);
  }, [parseNutrition, onNutritionCalculated]);

  // Debounced nutrition calculation - triggers on value or qty changes
  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only calculate if we have enough text
    if (!value || value.trim().length < 3) {
      setNutritionTotals(null);
      setFoodCount(0);
      onNutritionCalculated?.(null);
      return;
    }

    // Always debounce - 600ms for responsive feel
    debounceRef.current = setTimeout(() => {
      calculateNutrition(value, qtyValue);
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, qtyValue, calculateNutrition, onNutritionCalculated]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-sm min-w-0">
          {icon}
          <span className="truncate">{label}</span>
        </Label>
        {mealType && (
          <MealSuggestions
            mealType={mealType}
            menuType={apiMenuType}
            dayOfWeek={dayOfWeek}
            onSelect={(suggestion, qty) => {
              onValueChange(field, suggestion);
              if (qty) {
                onQtyChange(qtyField, qty);
              }
            }}
          />
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={value}
          onChange={(e) => onValueChange(field, e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0"
        />
        <Input
          value={qtyValue}
          onChange={(e) => onQtyChange(qtyField, e.target.value)}
          placeholder="Ex: 100g, 150ml"
          className="w-full sm:w-28 text-sm"
        />
        <div className="relative flex-shrink-0">
          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => onTimeChange(timeField, e.target.value)}
            className="w-full sm:w-24 pl-7 text-sm"
          />
        </div>
      </div>
      
      {/* Auto-calculated nutrition badges */}
      <AutoNutritionBadges 
        totals={nutritionTotals} 
        loading={loading} 
        foodCount={foodCount} 
      />
    </div>
  );
});

export const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

export const emptyMenuItem = (
  weekStart: string, 
  dayOfWeek: number, 
  menuType: 'bercario_0_6' | 'bercario_6_24' | 'maternal'
): MenuItem => ({
  week_start: weekStart,
  day_of_week: dayOfWeek,
  breakfast: '',
  breakfast_time: menuType === 'maternal' ? '08:00' : '07:30',
  breakfast_qty: '',
  morning_snack: '',
  morning_snack_time: '09:30',
  morning_snack_qty: '',
  lunch: '',
  lunch_time: menuType === 'maternal' ? '11:30' : '11:00',
  lunch_qty: '',
  bottle: '',
  bottle_time: '13:00',
  bottle_qty: '',
  snack: '',
  snack_time: menuType === 'maternal' ? '15:30' : '15:00',
  snack_qty: '',
  pre_dinner: '',
  pre_dinner_time: '16:30',
  pre_dinner_qty: '',
  dinner: '',
  dinner_time: menuType === 'maternal' ? '18:00' : '17:30',
  dinner_qty: '',
  notes: '',
  menu_type: menuType
});
