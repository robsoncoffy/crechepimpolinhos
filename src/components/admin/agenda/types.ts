import type { Database } from "@/integrations/supabase/types";

export type Child = Database["public"]["Tables"]["children"]["Row"];
export type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
export type MealStatus = Database["public"]["Enums"]["meal_status"];
export type EvacuationStatus = Database["public"]["Enums"]["evacuation_status"];
export type ClassType = Database["public"]["Enums"]["class_type"];

export interface ChildWithRecord extends Child {
    daily_record?: DailyRecord | null;
}

export type MoodStatus = "feliz" | "calmo" | "agitado" | "choroso" | "sonolento";

export interface AgendaFormData {
    breakfast: MealStatus | null;
    lunch: MealStatus | null;
    snack: MealStatus | null;
    dinner: MealStatus | null;
    slept_morning: boolean;
    slept_afternoon: boolean;
    sleep_notes: string;
    urinated: boolean;
    evacuated: EvacuationStatus | null;
    mood: MoodStatus | null;
    had_fever: boolean;
    temperature: string;
    took_medicine: boolean;
    medicine_notes: string;
    activities: string;
    school_notes: string;
}
