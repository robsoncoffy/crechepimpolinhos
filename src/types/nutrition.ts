export interface NutritionTotals {
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

export interface ParsedIngredient {
    name: string;
    quantity: number;
    unit: string;
}

export interface IngredientWithNutrition extends ParsedIngredient {
    id?: number;
    description?: string;
    category?: string;
    // Macros
    energy?: number;
    protein?: number;
    lipid?: number;
    carbohydrate?: number;
    fiber?: number;
    // Minerals
    calcium?: number;
    iron?: number;
    sodium?: number;
    potassium?: number;
    magnesium?: number;
    phosphorus?: number;
    zinc?: number;
    copper?: number;
    manganese?: number;
    // Vitamins
    vitamin_c?: number;
    vitamin_a?: number;
    retinol?: number;
    thiamine?: number;
    riboflavin?: number;
    pyridoxine?: number;
    niacin?: number;
    // Lipid composition
    cholesterol?: number;
    saturated?: number;
    monounsaturated?: number;
    polyunsaturated?: number;
}

export interface WeeklyMenuData {
    breakfast: string;
    morning_snack: string;
    lunch: string;
    afternoon_snack: string;
    dinner: string;
}

export type MealTime = 'breakfast' | 'morningSnack' | 'lunch' | 'snack' | 'dinner';

export interface MealNutritionState {
    [key: string]: NutritionTotals | null;
}

export type MenuType = 'bercario_0_6' | 'bercario_6_12' | 'bercario_12_24' | 'maternal';

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
    menu_type: MenuType;
}

export interface MealIngredientsState {
    [key: string]: IngredientWithNutrition[];
}

export interface ChildAllergy {
    childName: string;
    allergies: string;
}
