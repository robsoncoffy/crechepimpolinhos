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
  highlight?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: 'basico',
    name: 'Plano Básico',
    description: 'Meio período - 4 horas diárias',
    features: [
      'Manhã (7h às 11h) ou Tarde (15h às 19h)',
      '2 refeições incluídas',
      'Atividades pedagógicas',
      'Agenda digital',
      'Chat com professores',
    ],
  },
  {
    id: 'intermediario',
    name: 'Plano Intermediário',
    description: 'Período integral - até 8 horas',
    features: [
      'Funcionamento das 7h às 19h',
      'Até 8 horas diárias',
      'Todas as refeições incluídas',
      'Atividades extras (Ballet, Capoeira, Música)',
      'Agenda digital completa',
      'Chat com professores',
    ],
    highlight: true,
  },
  {
    id: 'plus',
    name: 'Plano Plus+',
    description: 'Integral estendido - até 10 horas',
    features: [
      'Tudo do Plano Intermediário',
      'Até 10 horas diárias',
      'Flexibilidade total de horário',
      'Prioridade em eventos especiais',
      'Acompanhamento pedagógico exclusivo',
    ],
  },
];

// Pricing matrix: prices[classType][planType]
export const PRICES: Record<ClassType, Record<PlanType, number>> = {
  bercario: {
    basico: 900,
    intermediario: 1400,
    plus: 1600,
  },
  maternal: {
    basico: 800,
    intermediario: 1300,
    plus: 1500,
  },
  jardim: {
    basico: 700,
    intermediario: 1200,
    plus: 1400,
  },
};

export const CLASS_NAMES: Record<ClassType, string> = {
  bercario: 'Berçário',
  maternal: 'Maternal',
  jardim: 'Jardim',
};

export const PLAN_NAMES: Record<PlanType, string> = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  plus: 'Plus+',
};

export function getPrice(classType: ClassType, planType: PlanType): number {
  return PRICES[classType]?.[planType] ?? 0;
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
