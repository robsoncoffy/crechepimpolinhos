import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, AlertTriangle, Coffee, Cookie, Soup, Milk, Apple, Moon } from "lucide-react";
import { format, addDays } from "date-fns";
import { MealField, MenuItem, dayNames } from "@/components/admin/MealField";
import { AllergyCheckBadge } from "@/components/admin/nutritionist/AllergyCheckBadge";
import { MenuType } from "@/lib/constants/nutrition";
import { NutritionTotals, IngredientWithNutrition, MealNutritionState } from "@/types/nutrition";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Define local interfaces if not imported
interface ChildAllergy {
    childName: string;
    allergies: string;
}

interface MenuEditorProps {
    menuType: MenuType;
    items: MenuItem[];
    activeDay: number;
    weekStart: Date;
    nutritionState: MealNutritionState;
    childrenWithAllergies: ChildAllergy[];
    generatingDay: number | null;
    onUpdateMenuItem: (dayOfWeek: number, field: keyof MenuItem, value: string) => void;
    onNutritionCalculated: (dayOfWeek: number, field: string, totals: NutritionTotals | null, ingredients?: IngredientWithNutrition[]) => void;
    onGenerateDay: (dayOfWeek: number) => void;
}

const getMenuTypeColor = (type: MenuType) => {
    switch (type) {
        case 'bercario_0_6': return 'pimpo-blue';
        case 'bercario_6_12': return 'pimpo-purple';
        case 'bercario_12_24': return 'pimpo-orange';
        case 'maternal': return 'pimpo-green';
        default: return 'primary';
    }
};

export function MenuEditor({
    menuType,
    items,
    activeDay,
    weekStart,
    nutritionState,
    childrenWithAllergies,
    generatingDay,
    onUpdateMenuItem,
    onNutritionCalculated,
    onGenerateDay
}: MenuEditorProps) {
    const color = getMenuTypeColor(menuType);
    const isBercario = menuType !== 'maternal';

    // Filter to show only the selected day
    const item = items.find(item => item.day_of_week === activeDay);

    if (!item) return null;

    const dayDate = addDays(weekStart, item.day_of_week - 1);
    const hasContent = item.breakfast || item.lunch || item.snack || item.dinner ||
        item.morning_snack || item.bottle || item.pre_dinner;

    // Calculate day totals inline
    const dayTotals = (() => {
        const mealFields = ['breakfast', 'morning_snack', 'lunch', 'bottle', 'snack', 'pre_dinner', 'dinner'];
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
            const mealNutrition = nutritionState[`${item.day_of_week}-${field}`];
            if (mealNutrition) {
                hasAnyData = true;
                (Object.keys(totals) as (keyof NutritionTotals)[]).forEach(key => {
                    totals[key] += (mealNutrition as any)[key] || 0;
                });
            }
        });
        return hasAnyData ? totals : null;
    })();

    const handleValueChange = (field: keyof MenuItem, value: string) => {
        onUpdateMenuItem(item.day_of_week, field, value);
    };

    const handleTimeChange = (field: keyof MenuItem, value: string) => {
        onUpdateMenuItem(item.day_of_week, field, value);
    };

    const handleNutritionCallback = (field: string) => (totals: NutritionTotals | null, ingredients?: IngredientWithNutrition[]) => {
        onNutritionCalculated(item.day_of_week, field, totals, ingredients);
    };

    // Get all meal texts for allergy checking
    const allMealTexts = [
        item.breakfast, item.morning_snack, item.lunch,
        item.bottle, item.snack, item.pre_dinner, item.dinner
    ].filter(Boolean).join(', ');

    return (
        <Card
            className={`transition-all ${hasContent
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
                            onClick={() => onGenerateDay(item.day_of_week)}
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
                        onChange={(e) => onUpdateMenuItem(item.day_of_week, 'notes', e.target.value)}
                        placeholder="Notas especiais, substituições, alertas de alergia..."
                        rows={2}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
