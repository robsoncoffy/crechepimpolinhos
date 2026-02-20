import { MenuType } from '@/types/nutrition';

export interface NutritionTargets {
    energy: number;
    protein: number;
    lipid: number;
    carbohydrate: number;
    fiber: number;
    calcium: number;
    iron: number;
    sodium: number;
    potassium: number;
    magnesium: number;
    phosphorus: number;
    zinc: number;
    vitamin_a: number;
    vitamin_c: number;
}

export const AGE_RANGES: Record<MenuType, string> = {
    bercario_0_6: '0 a 6 meses',
    bercario_6_12: '6 a 12 meses',
    bercario_12_24: '1 a 2 anos',
    maternal: '3 a 5 anos',
};

// PNAE Targets (approximate values based on PNAE guidelines for 70% daily needs in full-time schools)
// Note: These are example values. Real values should be verified with a nutritionist.
export const PNAE_TARGETS_BY_AGE: Record<MenuType, NutritionTargets> = {
    // 0-6 months: mostly breastfeeding/formula, solid food introduction starts at 6m
    // Providing placeholder targets for reference
    bercario_0_6: {
        energy: 500, // Very variable
        protein: 9,
        lipid: 30,
        carbohydrate: 60,
        fiber: 0,
        calcium: 210,
        iron: 0.27,
        sodium: 100,
        potassium: 400,
        magnesium: 30,
        phosphorus: 100,
        zinc: 2,
        vitamin_a: 400,
        vitamin_c: 40,
    },
    // 6-12 months
    bercario_6_12: {
        energy: 700,
        protein: 11,
        lipid: 30,
        carbohydrate: 95,
        fiber: 5,
        calcium: 260,
        iron: 11,
        sodium: 300,
        potassium: 700,
        magnesium: 75,
        phosphorus: 275,
        zinc: 3,
        vitamin_a: 500,
        vitamin_c: 50,
    },
    // 1-3 years (12-36 months)
    bercario_12_24: {
        energy: 900,
        protein: 13,
        lipid: 35, // 30-40% of energy
        carbohydrate: 130,
        fiber: 19,
        calcium: 500,
        iron: 7,
        sodium: 800,
        potassium: 3000,
        magnesium: 80,
        phosphorus: 460,
        zinc: 3,
        vitamin_a: 300,
        vitamin_c: 15,
    },
    // 4-5 years (Maternal/Jardim)
    maternal: {
        energy: 1200,
        protein: 19,
        lipid: 40,
        carbohydrate: 180,
        fiber: 25,
        calcium: 800,
        iron: 10,
        sodium: 1200,
        potassium: 3800,
        magnesium: 130,
        phosphorus: 500,
        zinc: 5,
        vitamin_a: 400,
        vitamin_c: 25,
    },
};
