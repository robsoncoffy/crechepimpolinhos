import { memo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { MealSuggestions } from './MealSuggestions';
import { TacoFoodSearch } from './TacoFoodSearch';
import { MealNutritionSummary } from './MealNutritionSummary';
import { TacoFood } from '@/hooks/useTacoSearch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface MenuItem {
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
  menu_type: 'bercario_0_6' | 'bercario_6_24' | 'maternal';
}

interface SelectedFood extends TacoFood {
  quantity: number;
}

interface MealFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  timeValue: string;
  field: keyof MenuItem;
  timeField: keyof MenuItem;
  placeholder: string;
  menuType: 'bercario_0_6' | 'bercario_6_24' | 'maternal';
  dayOfWeek: number;
  onValueChange: (field: keyof MenuItem, value: string) => void;
  onTimeChange: (field: keyof MenuItem, value: string) => void;
  selectedFoods?: SelectedFood[];
  onFoodsChange?: (foods: SelectedFood[]) => void;
}

// Memoized component to prevent unnecessary re-renders
export const MealField = memo(function MealField({
  icon,
  label,
  value,
  timeValue,
  field,
  timeField,
  placeholder,
  menuType,
  dayOfWeek,
  onValueChange,
  onTimeChange,
  selectedFoods = [],
  onFoodsChange,
}: MealFieldProps) {
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  
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
            onSelect={(suggestion) => onValueChange(field, suggestion)}
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
      
      {/* Inline nutrition summary if foods are selected */}
      {selectedFoods.length > 0 && (
        <MealNutritionSummary foods={selectedFoods} compact />
      )}
      
      {/* Collapsible TACO Search */}
      {onFoodsChange && (
        <Collapsible open={isNutritionOpen} onOpenChange={setIsNutritionOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground hover:text-foreground">
              <span>📊 Análise nutricional TACO</span>
              {isNutritionOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <TacoFoodSearch
              selectedFoods={selectedFoods}
              onFoodsChange={onFoodsChange}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
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
});
