// Pricing configuration for Creche Pimpolinhos
// Based on the official pricing table

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
// Berçário: 0-2 anos, Maternal I: 2-3 anos, Maternal II: 3-4 anos, Jardim I: 4-5 anos, Jardim II: 5-6 anos
export const PRICES: Record<ClassType, Record<PlanType, number>> = {
  bercario: {
    basico: 799.90,
    intermediario: 1099.90,
    plus: 1299.90,
  },
  maternal: {
    basico: 749.90,
    intermediario: 999.90,
    plus: 1199.90,
  },
  maternal_1: {
    basico: 749.90,
    intermediario: 999.90,
    plus: 1199.90,
  },
  maternal_2: {
    basico: 699.90,
    intermediario: 899.90,
    plus: 1099.90,
  },
  jardim: {
    basico: 649.90,
    intermediario: 799.90,
    plus: 1099.90,
  },
  jardim_1: {
    basico: 649.90,
    intermediario: 799.90,
    plus: 1099.90,
  },
  jardim_2: {
    basico: 649.90,
    intermediario: 799.90,
    plus: 1099.90,
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
 * Get suggested class type based on age in months
 * Berçário: 0-2 anos (0-23 meses)
 * Maternal I: 2-3 anos (24-35 meses)
 * Maternal II: 3-4 anos (36-47 meses)
 * Jardim I: 4-5 anos (48-59 meses)
 * Jardim II: 5-6 anos (60+ meses)
 */
export function getSuggestedClassType(birthDate: string | Date): ClassType {
  const months = getAgeInMonths(birthDate);
  if (months < 24) return 'bercario';
  if (months < 36) return 'maternal_1';
  if (months < 48) return 'maternal_2';
  if (months < 60) return 'jardim_1';
  return 'jardim_2';
}

/**
 * Get the display name for a class type
 */
export function getClassDisplayName(classType: ClassType): string {
  return CLASS_NAMES[classType] || classType;
}

/**
 * Get price for a plan
 */
export function getPrice(classType: ClassType, planType: PlanType): number {
  if (!classType || !planType) {
    console.warn("getPrice called with invalid params:", { classType, planType });
    return 0;
  }
  
  const classPrice = PRICES[classType];
  if (!classPrice) {
    console.warn("Unknown class type:", classType);
    return 0;
  }
  
  return classPrice[planType] ?? 0;
}

/**
 * Get all prices for a class type
 */
export function getPricesForClass(classType: ClassType): Record<PlanType, number> {
  return PRICES[classType];
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
