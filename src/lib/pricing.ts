// Pricing configuration for Creche Pimpolinhos
import { supabase } from "@/integrations/supabase/client";

export type PlanType = 'basico' | 'intermediario' | 'plus';
export type ClassType = 'bercario' | 'maternal' | 'maternal_1' | 'maternal_2' | 'jardim' | 'jardim_1' | 'jardim_2';
export type ShiftType = 'manha' | 'tarde' | 'integral';

export const ENROLLMENT_FEE = 250; // Taxa de Matrícula

export interface PlanInfo {
  id: PlanType;
  name: string;
  description: string;
  features: string[];
  note?: string;
  highlight?: boolean;
  price?: number; // Added price field
}

export const PLANS_METADATA: Record<PlanType, Omit<PlanInfo, 'id' | 'price'>> = {
  basico: {
    name: 'Meio Turno',
    description: 'Meio período - 5 horas diárias',
    features: [
      'Manhã (7h às 12h) ou Tarde (13h às 18h)',
      '2 refeições incluídas',
      'Atividades pedagógicas',
      'Agenda digital',
      'Chat com professores',
    ],
    note: 'Disponível para todas as turmas',
  },
  intermediario: {
    name: 'Integral',
    description: 'Período integral - 9 horas diárias',
    features: [
      '9 horas diárias de permanência',
      'Flexibilidade de horário',
      'Todas as refeições incluídas',
      'Atividades extras disponíveis (Ballet, Capoeira, Música)*',
      'Agenda digital completa',
      'Chat com professores',
    ],
    note: '*Atividades extras cobradas separadamente. Disponível para Berçário e Maternal.',
    highlight: true,
  },
  plus: {
    name: 'Plano Plus+',
    description: 'Integral estendido - até 10 horas',
    features: [
      'Tudo do Plano Integral',
      'Até 10 horas diárias',
      'Flexibilidade total de horário',
      'Prioridade em eventos especiais',
      'Acompanhamento pedagógico exclusivo',
    ],
    note: 'Disponível para Berçário e Maternal.',
  },
};

export const CLASS_NAMES: Record<ClassType, string> = {
  bercario: 'Berçário',
  maternal: 'Maternal',
  maternal_1: 'Maternal I',
  maternal_2: 'Maternal II',
  jardim: 'Jardim',
  jardim_1: 'Jardim I',
  jardim_2: 'Jardim II',
};

export const PLAN_NAMES: Record<PlanType, string> = {
  basico: 'Meio Turno',
  intermediario: 'Integral',
  plus: 'Plus+',
};

// Classes that only have meio turno (basico) available
export const MEIO_TURNO_ONLY_CLASSES: ClassType[] = ['jardim', 'jardim_1', 'jardim_2'];

/**
 * Check if a class type only supports meio turno
 */
export function isHalfDayOnly(classType: ClassType): boolean {
  return MEIO_TURNO_ONLY_CLASSES.includes(classType);
}

/**
 * Get available plans for a class type
 */
export function getAvailablePlans(classType: ClassType): PlanType[] {
  if (isHalfDayOnly(classType)) {
    return ['basico'];
  }
  return ['basico', 'intermediario', 'plus'];
}

/**
 * Get the display name for a class type
 */
export function getClassDisplayName(classType: ClassType): string {
  return CLASS_NAMES[classType] || classType;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

// === NEW DYNAMIC FUNCTIONS ===

/**
 * Fetch plans/prices for a specific class type from Supabase
 */
export async function fetchPricesForClass(classType: string): Promise<Record<string, number>> {
  // @ts-ignore — 'plans' table may not exist in generated types yet
  const { data, error } = await (supabase as any)
    .from('plans')
    .select('plan_type, price')
    .eq('class_type', classType)
    .eq('active', true);

  if (error) {
    console.error('Error fetching prices:', error);
    return {};
  }

  const prices: Record<string, number> = {};
  data.forEach((row: any) => {
    prices[row.plan_type] = Number(row.price);
  });

  return prices;
}

/**
 * Get suggested class type based on birth date using Supabase RPC (Centralized Logic)
 */
export async function getSuggestedClassType(birthDate: string | Date): Promise<ClassType> {
  const dateStr = typeof birthDate === 'string' ? birthDate : birthDate.toISOString().split('T')[0];

  // @ts-ignore
  const { data, error } = await supabase.rpc('get_suggested_class_type', {
    birth_date: dateStr
  });

  if (error) {
    console.error('Error fetching class type:', error);
    // Fallback logic (local) if RPC fails or during disconnected dev
    return getLocalSuggestedClassType(birthDate);
  }

  return (data as ClassType) || 'maternal_1';
}

/**
 * Fallback local logic - kept for robustness but labeled as fallback
 */
function getLocalSuggestedClassType(birthDate: string | Date): ClassType {
  const birth = typeof birthDate === 'string'
    ? new Date(`${birthDate}T12:00:00`)
    : birthDate;
  const now = new Date();

  if (isNaN(birth.getTime())) return 'maternal_1';

  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;

  if (months < 24) return 'bercario';
  if (months < 36) return 'maternal_1';
  if (months < 48) return 'maternal_2';
  if (months < 60) return 'jardim_1';
  return 'jardim_2';
}

// GHL WhatsApp link
export const GHL_WHATSAPP_LINK = 'https://wa.me/5551989965423?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Creche%20Pimpolinhos.';

// Legacy aliases kept for backward compatibility
// PLANS_METADATA is a Record, expose as array for pages that iterate it
export const PLANS = Object.entries(PLANS_METADATA).map(([id, meta]) => ({
  id: id as PlanType,
  ...meta,
}));

export function getAgeInMonths(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string'
    ? new Date(`${birthDate}T12:00:00`)
    : birthDate;
  const now = new Date();
  if (isNaN(birth.getTime())) return 0;
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Synchronous class type suggestion based on birth date (local fallback)
 */
export function getSuggestedClassTypeSync(birthDate: string | Date): ClassType {
  const months = getAgeInMonths(birthDate);
  if (months < 24) return 'bercario';
  if (months < 36) return 'maternal_1';
  if (months < 48) return 'maternal_2';
  if (months < 60) return 'jardim_1';
  return 'jardim_2';
}

/**
 * Get price for a class/plan combination (static lookup based on local config)
 * Returns 0 if not found — prices managed via system_settings in the DB.
 */
export function getPrice(classType: ClassType, planType: PlanType): number {
  // Prices are managed dynamically via system_settings; this is a safe fallback
  const staticPrices: Partial<Record<ClassType, Partial<Record<PlanType, number>>>> = {
    bercario: { basico: 1200, intermediario: 1600, plus: 2000 },
    maternal: { basico: 1000, intermediario: 1400, plus: 1800 },
    maternal_1: { basico: 1000, intermediario: 1400, plus: 1800 },
    maternal_2: { basico: 1000, intermediario: 1400, plus: 1800 },
    jardim: { basico: 900 },
    jardim_1: { basico: 900 },
    jardim_2: { basico: 900 },
  };
  return staticPrices[classType]?.[planType] ?? 0;
}
