import { NutritionTotals, MealNutritionState } from "@/types/nutrition";

export const emptyNutritionTotals: NutritionTotals = {
    energy: 0, protein: 0, lipid: 0, carbohydrate: 0, fiber: 0,
    calcium: 0, iron: 0, sodium: 0, potassium: 0, magnesium: 0,
    phosphorus: 0, zinc: 0, copper: 0, manganese: 0,
    vitamin_c: 0, vitamin_a: 0, retinol: 0, thiamine: 0,
    riboflavin: 0, pyridoxine: 0, niacin: 0,
    cholesterol: 0, saturated: 0, monounsaturated: 0, polyunsaturated: 0
};

export function calculateDayTotals(
    dayOfWeek: number,
    nutritionState: MealNutritionState
): NutritionTotals | null {
    const mealFields = ['breakfast', 'morning_snack', 'lunch', 'bottle', 'snack', 'pre_dinner', 'dinner'];
    let hasAnyData = false;
    const totals: NutritionTotals = { ...emptyNutritionTotals };

    mealFields.forEach(field => {
        const key = `${dayOfWeek}-${field}`;
        const mealNutrition = nutritionState[key];
        if (mealNutrition) {
            hasAnyData = true;
            (Object.keys(totals) as (keyof NutritionTotals)[]).forEach(k => {
                totals[k] += (mealNutrition as any)[k] || 0;
            });
        }
    });

    return hasAnyData ? totals : null;
}
