// Centralized labels and constants to avoid duplication across the codebase

import { Database } from "@/integrations/supabase/types";

type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];
type PlanType = Database["public"]["Enums"]["plan_type"];
type AppRole = Database["public"]["Enums"]["app_role"];
type MealStatus = Database["public"]["Enums"]["meal_status"];
type MoodStatus = Database["public"]["Enums"]["mood_status"];
type EvacuationStatus = Database["public"]["Enums"]["evacuation_status"];

// Class type labels
export const classTypeLabels: Record<ClassType, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  maternal_1: "Maternal I",
  maternal_2: "Maternal II",
  jardim: "Jardim",
  jardim_1: "Jardim I",
  jardim_2: "Jardim II",
};

// Shift type labels
export const shiftTypeLabels: Record<ShiftType, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

// Plan type labels
export const planTypeLabels: Record<PlanType, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  plus: "Plus+",
};

// Role labels
export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  teacher: "Professor(a)",
  cook: "Cozinheira",
  nutritionist: "Nutricionista",
  pedagogue: "Pedagoga",
  auxiliar: "Auxiliar",
  parent: "Responsável",
};

// Role badge colors for consistent UI
export const roleBadgeColors: Record<AppRole, string> = {
  admin: "bg-blue-100 text-blue-800",
  teacher: "bg-purple-100 text-purple-800",
  cook: "bg-orange-100 text-orange-800",
  nutritionist: "bg-emerald-100 text-emerald-800",
  pedagogue: "bg-pink-100 text-pink-800",
  auxiliar: "bg-yellow-100 text-yellow-800",
  parent: "bg-green-100 text-green-800",
};

// Meal status labels
export const mealStatusLabels: Record<MealStatus, string> = {
  tudo: "Comeu tudo",
  quase_tudo: "Quase tudo",
  metade: "Metade",
  pouco: "Pouco",
  nao_aceitou: "Não aceitou",
};

// Mood status labels
export const moodStatusLabels: Record<MoodStatus, string> = {
  feliz: "Feliz",
  calmo: "Calmo",
  agitado: "Agitado",
  choroso: "Choroso",
  sonolento: "Sonolento",
};

// Evacuation status labels
export const evacuationStatusLabels: Record<EvacuationStatus, string> = {
  normal: "Normal",
  pastosa: "Pastosa",
  liquida: "Líquida",
  nao: "Não evacuou",
};

// Weather descriptions for Open-Meteo codes
export const weatherDescriptions: Record<number, string> = {
  0: "Céu limpo",
  1: "Principalmente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com gelo",
  51: "Garoa leve",
  53: "Garoa moderada",
  55: "Garoa intensa",
  61: "Chuva leve",
  63: "Chuva moderada",
  65: "Chuva forte",
  71: "Neve leve",
  73: "Neve moderada",
  75: "Neve forte",
  80: "Pancadas leves",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  95: "Trovoadas",
  96: "Trovoadas com granizo",
  99: "Trovoadas com granizo forte",
};

// Helper function to calculate age from birth date
export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const today = new Date();
  const months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0) {
    return `${years} ano${years > 1 ? "s" : ""} e ${remainingMonths} ${
      remainingMonths === 1 ? "mês" : "meses"
    }`;
  }
  return `${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`;
}

// Helper function to format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR");
}

// Helper function to format time for display
export function formatTime(timeString: string): string {
  return new Date(timeString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Canoas, RS coordinates for weather
export const CANOAS_COORDINATES = {
  lat: -29.9175,
  lon: -51.1833,
};
