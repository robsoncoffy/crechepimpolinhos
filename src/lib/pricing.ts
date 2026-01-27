// Pricing configuration for Creche Pimpolinhos
// Based on the official pricing table

export type PlanType = 'basico' | 'intermediario' | 'plus';
export type ClassType = 'bercario' | 'maternal' | 'jardim';
export type ShiftType = 'manha' | 'tarde' | 'integral';

export const ENROLLMENT_FEE = 250; // Taxa de Matrícula

export interface PlanInfo {
  id: PlanType;
  name: string;
  description: string;
  features: string[];
  note?: string;
  highlight?: boolean;
  startingPrice?: number;
}

export const PLANS: PlanInfo[] = [
  {
    id: 'basico',
    name: 'Meio Turno',
    description: 'Meio período - 5 horas diárias',
    features: [
      'Manhã (7h às 12h) ou Tarde (13h às 18h)',
      '2 refeições incluídas',
      'Atividades pedagógicas',
      'Agenda digital',
      'Chat com professores',
    ],
    startingPrice: 649.90,
  },
  {
    id: 'intermediario',
    name: 'Integral',
    description: 'Período integral - até 9 horas',
    features: [
      'Funcionamento das 7h às 19h',
      'Até 9 horas diárias',
      'Todas as refeições incluídas',
      'Atividades extras disponíveis (Ballet, Capoeira, Música)*',
      'Agenda digital completa',
      'Chat com professores',
    ],
    note: '*Atividades extras cobradas separadamente',
    startingPrice: 799.90,
    highlight: true,
  },
  {
    id: 'plus',
    name: 'Plano Plus+',
    description: 'Integral estendido - até 10 horas',
    features: [
      'Tudo do Plano Integral',
      'Até 10 horas diárias',
      'Flexibilidade total de horário',
      'Prioridade em eventos especiais',
      'Acompanhamento pedagógico exclusivo',
    ],
    startingPrice: 1099.90,
  },
];

// Base pricing matrix: prices[classType][planType]
// Note: Maternal I (24-35 months) uses Berçário prices
// Maternal II (36-47 months) uses Maternal prices
export const PRICES: Record<ClassType, Record<PlanType, number>> = {
  bercario: {
    basico: 799.90,
    intermediario: 1299.90,
    plus: 1699.90,
  },
  maternal: {
    basico: 749.90,
    intermediario: 1099.90,
    plus: 1499.90,
  },
  jardim: {
    basico: 649.90,
    intermediario: 949.90,
    plus: 1299.90,
  },
};

export const CLASS_NAMES: Record<ClassType, string> = {
  bercario: 'Berçário',
  maternal: 'Maternal',
  jardim: 'Jardim',
};

export const PLAN_NAMES: Record<PlanType, string> = {
  basico: 'Meio Turno',
  intermediario: 'Integral',
  plus: 'Plus+',
};

/**
 * Calculate age in months from a birth date
 */
export function getAgeInMonths(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' 
    ? new Date(`${birthDate}T12:00:00`) 
    : birthDate;
  const now = new Date();
  
  if (isNaN(birth.getTime())) return 0;
  
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  
  return months;
}

/**
 * Determine if child is Maternal I (24-35 months) or Maternal II (36-47 months)
 * Maternal I has the same pricing as Berçário
 */
export function isMaternalI(birthDate: string | Date): boolean {
  const months = getAgeInMonths(birthDate);
  return months >= 24 && months < 36; // 2 anos a 2 anos e 11 meses
}

/**
 * Get the maternal tier label based on age
 */
export function getMaternalTier(birthDate: string | Date): 'I' | 'II' {
  return isMaternalI(birthDate) ? 'I' : 'II';
}

/**
 * Get the display name for a class type, with Maternal I/II distinction
 */
export function getClassDisplayName(classType: ClassType, birthDate?: string | Date): string {
  if (classType === 'maternal' && birthDate) {
    const tier = getMaternalTier(birthDate);
    return `Maternal ${tier}`;
  }
  return CLASS_NAMES[classType];
}

/**
 * Get price for a plan, considering Maternal I uses Berçário prices
 */
export function getPrice(classType: ClassType, planType: PlanType, birthDate?: string | Date): number {
  // Validate inputs
  if (!classType || !planType) {
    console.warn("getPrice called with invalid params:", { classType, planType });
    return 0;
  }
  
  // If maternal and we have birth date, check if it's Maternal I (uses Berçário prices)
  if (classType === 'maternal' && birthDate && isMaternalI(birthDate)) {
    return PRICES.bercario?.[planType] ?? 0;
  }
  
  // Safe access with fallback
  const classPrice = PRICES[classType];
  if (!classPrice) {
    console.warn("Unknown class type:", classType);
    return 0;
  }
  
  return classPrice[planType] ?? 0;
}

/**
 * Get the price tier for a child based on class type and birth date
 * Returns the effective pricing class (maternal1 uses bercario prices)
 */
export function getEffectivePricingClass(classType: ClassType, birthDate?: string | Date): ClassType {
  if (classType === 'maternal' && birthDate && isMaternalI(birthDate)) {
    return 'bercario'; // Maternal I uses Berçário prices
  }
  return classType;
}

/**
 * Get all prices for a class type, considering Maternal I pricing
 */
export function getPricesForClass(classType: ClassType, birthDate?: string | Date): Record<PlanType, number> {
  const effectiveClass = getEffectivePricingClass(classType, birthDate);
  return PRICES[effectiveClass];
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

// GHL WhatsApp link
export const GHL_WHATSAPP_LINK = 'https://wa.me/5551989965423?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Creche%20Pimpolinhos.';
