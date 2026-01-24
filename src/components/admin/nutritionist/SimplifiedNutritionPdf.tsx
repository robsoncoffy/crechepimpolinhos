import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NutritionTotals {
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

interface IngredientWithNutrition {
  name: string;
  quantity: number;
  unit: string;
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

interface DayNutritionData {
  dayOfWeek: number;
  dayName: string;
  date: string;
  totals: NutritionTotals | null;
  meals: Record<string, NutritionTotals | null>;
  ingredients?: Record<string, IngredientWithNutrition[]>;
}

interface SimplifiedNutritionPdfProps {
  weekStart: Date;
  nutritionData: DayNutritionData[];
  menuType: string;
  disabled?: boolean;
}

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const mealLabels: Record<string, string> = {
  breakfast: 'Café da Manhã',
  morning_snack: 'Lanche da Manhã',
  lunch: 'Almoço',
  bottle: 'Mamadeira',
  snack: 'Lanche da Tarde',
  pre_dinner: 'Pré-Jantar',
  dinner: 'Jantar',
};

function formatNutrientValue(value: number | undefined, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '-';
  return value.toFixed(decimals);
}

function generateIngredientsList(ingredients: IngredientWithNutrition[]): string {
  if (!ingredients || ingredients.length === 0) return '';
  
  return `
    <div class="ingredients-list">
      <div class="ingredients-title">📋 Ingredientes por porção:</div>
      <table class="ingredients-table">
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th>Qtd</th>
            <th>kcal</th>
            <th>Prot</th>
            <th>Carb</th>
            <th>Lip</th>
            <th>Fibra</th>
          </tr>
        </thead>
        <tbody>
          ${ingredients.map(ing => {
            const mult = ing.quantity / 100;
            return `
              <tr>
                <td class="ing-name">${ing.name}</td>
                <td class="ing-qty">${ing.quantity}${ing.unit}</td>
                <td>${((ing.energy || 0) * mult).toFixed(0)}</td>
                <td>${((ing.protein || 0) * mult).toFixed(1)}g</td>
                <td>${((ing.carbohydrate || 0) * mult).toFixed(1)}g</td>
                <td>${((ing.lipid || 0) * mult).toFixed(1)}g</td>
                <td>${((ing.fiber || 0) * mult).toFixed(1)}g</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <!-- Detailed micronutrients per ingredient -->
      <div class="micro-detail">
        <div class="micro-title">🔬 Micronutrientes por ingrediente:</div>
        <table class="micro-table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Ca</th>
              <th>Fe</th>
              <th>K</th>
              <th>Mg</th>
              <th>P</th>
              <th>Zn</th>
              <th>Vit.C</th>
              <th>Vit.A</th>
              <th>B1</th>
              <th>B2</th>
              <th>B3</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map(ing => {
              const mult = ing.quantity / 100;
              return `
                <tr>
                  <td class="ing-name">${ing.name.substring(0, 15)}${ing.name.length > 15 ? '...' : ''}</td>
                  <td>${((ing.calcium || 0) * mult).toFixed(0)}</td>
                  <td>${((ing.iron || 0) * mult).toFixed(1)}</td>
                  <td>${((ing.potassium || 0) * mult).toFixed(0)}</td>
                  <td>${((ing.magnesium || 0) * mult).toFixed(0)}</td>
                  <td>${((ing.phosphorus || 0) * mult).toFixed(0)}</td>
                  <td>${((ing.zinc || 0) * mult).toFixed(1)}</td>
                  <td>${((ing.vitamin_c || 0) * mult).toFixed(1)}</td>
                  <td>${((ing.vitamin_a || 0) * mult).toFixed(0)}</td>
                  <td>${((ing.thiamine || 0) * mult).toFixed(2)}</td>
                  <td>${((ing.riboflavin || 0) * mult).toFixed(2)}</td>
                  <td>${((ing.niacin || 0) * mult).toFixed(1)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function generateNutrientsList(totals: NutritionTotals): string {
  return `
    <div class="nutrients-grid">
      <div class="nutrient-section">
        <div class="section-title">🥩 Macronutrientes</div>
        <div class="nutrient-row"><span>Energia:</span><strong>${formatNutrientValue(totals.energy, 0)} kcal</strong></div>
        <div class="nutrient-row"><span>Proteínas:</span><strong>${formatNutrientValue(totals.protein)} g</strong></div>
        <div class="nutrient-row"><span>Carboidratos:</span><strong>${formatNutrientValue(totals.carbohydrate)} g</strong></div>
        <div class="nutrient-row"><span>Lipídios:</span><strong>${formatNutrientValue(totals.lipid)} g</strong></div>
        <div class="nutrient-row"><span>Fibras:</span><strong>${formatNutrientValue(totals.fiber)} g</strong></div>
      </div>
      
      <div class="nutrient-section">
        <div class="section-title">🧪 Minerais</div>
        <div class="nutrient-row"><span>Cálcio:</span><strong>${formatNutrientValue(totals.calcium)} mg</strong></div>
        <div class="nutrient-row"><span>Ferro:</span><strong>${formatNutrientValue(totals.iron, 2)} mg</strong></div>
        <div class="nutrient-row"><span>Sódio:</span><strong>${formatNutrientValue(totals.sodium)} mg</strong></div>
        <div class="nutrient-row"><span>Potássio:</span><strong>${formatNutrientValue(totals.potassium)} mg</strong></div>
        <div class="nutrient-row"><span>Magnésio:</span><strong>${formatNutrientValue(totals.magnesium)} mg</strong></div>
        <div class="nutrient-row"><span>Fósforo:</span><strong>${formatNutrientValue(totals.phosphorus)} mg</strong></div>
        <div class="nutrient-row"><span>Zinco:</span><strong>${formatNutrientValue(totals.zinc, 2)} mg</strong></div>
        <div class="nutrient-row"><span>Cobre:</span><strong>${formatNutrientValue(totals.copper, 2)} mg</strong></div>
        <div class="nutrient-row"><span>Manganês:</span><strong>${formatNutrientValue(totals.manganese, 2)} mg</strong></div>
      </div>
      
      <div class="nutrient-section">
        <div class="section-title">💊 Vitaminas</div>
        <div class="nutrient-row"><span>Vitamina C:</span><strong>${formatNutrientValue(totals.vitamin_c)} mg</strong></div>
        <div class="nutrient-row"><span>Vitamina A (RAE):</span><strong>${formatNutrientValue(totals.vitamin_a)} µg</strong></div>
        <div class="nutrient-row"><span>Retinol:</span><strong>${formatNutrientValue(totals.retinol)} µg</strong></div>
        <div class="nutrient-row"><span>Tiamina (B1):</span><strong>${formatNutrientValue(totals.thiamine, 2)} mg</strong></div>
        <div class="nutrient-row"><span>Riboflavina (B2):</span><strong>${formatNutrientValue(totals.riboflavin, 2)} mg</strong></div>
        <div class="nutrient-row"><span>Piridoxina (B6):</span><strong>${formatNutrientValue(totals.pyridoxine, 2)} mg</strong></div>
        <div class="nutrient-row"><span>Niacina (B3):</span><strong>${formatNutrientValue(totals.niacin, 2)} mg</strong></div>
      </div>
      
      <div class="nutrient-section">
        <div class="section-title">🫒 Composição Lipídica</div>
        <div class="nutrient-row"><span>Colesterol:</span><strong>${formatNutrientValue(totals.cholesterol)} mg</strong></div>
        <div class="nutrient-row"><span>Gord. Saturada:</span><strong>${formatNutrientValue(totals.saturated)} g</strong></div>
        <div class="nutrient-row"><span>Gord. Monoinsaturada:</span><strong>${formatNutrientValue(totals.monounsaturated)} g</strong></div>
        <div class="nutrient-row"><span>Gord. Poli-insaturada:</span><strong>${formatNutrientValue(totals.polyunsaturated)} g</strong></div>
      </div>
    </div>
  `;
}

export function SimplifiedNutritionPdf({ 
  weekStart, 
  nutritionData, 
  menuType,
  disabled 
}: SimplifiedNutritionPdfProps) {
  
  const generatePdfContent = () => {
    const menuTypeLabel = menuType === 'bercario_0_6' 
      ? 'Berçário (0-6 meses)' 
      : menuType === 'bercario_6_24' 
        ? 'Berçário (6m - 1a 11m)' 
        : 'Maternal / Jardim';
        
    const title = `Relatório Nutricional Completo - ${menuTypeLabel}`;
    const weekRange = `${format(weekStart, "d 'de' MMMM", { locale: ptBR })} a ${format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

    // Generate per-day, per-meal content
    const daysContent = nutritionData.map((day, idx) => {
      const dayDate = format(addDays(weekStart, idx), 'd/MM');
      
      // Filter meals that have data
      const mealsWithData = Object.entries(day.meals)
        .filter(([_, nutrition]) => nutrition && nutrition.energy > 0);
      
      const mealsContent = mealsWithData.length > 0 
        ? mealsWithData.map(([mealKey, nutrition]) => {
            const mealIngredients = day.ingredients?.[mealKey] || [];
            return `
              <div class="meal-block">
                <div class="meal-title">${mealLabels[mealKey] || mealKey}</div>
                ${generateIngredientsList(mealIngredients)}
                ${nutrition ? generateNutrientsList(nutrition) : '<p class="no-data">Sem dados</p>'}
              </div>
            `;
          }).join('')
        : '<p class="no-data">Nenhuma refeição com dados nutricionais</p>';
      
      const dayTotalsContent = day.totals && day.totals.energy > 0
        ? `
          <div class="day-totals">
            <div class="totals-title">📊 TOTAL DO DIA</div>
            ${generateNutrientsList(day.totals)}
          </div>
        `
        : '';
      
      return `
        <div class="day-section">
          <div class="day-header">
            <span class="day-name">${day.dayName}</span>
            <span class="day-date">${dayDate}</span>
          </div>
          <div class="day-content">
            <div class="meals-container">
              ${mealsContent}
            </div>
            ${dayTotalsContent}
          </div>
        </div>
      `;
    }).join('');

    // Calculate weekly averages with all nutrients
    const daysWithData = nutritionData.filter(d => d.totals && d.totals.energy > 0);
    const divisor = daysWithData.length || 1;
    
    const sumNutrient = (key: keyof NutritionTotals) => 
      daysWithData.reduce((sum, d) => sum + ((d.totals as any)?.[key] || 0), 0) / divisor;
    
    const weeklyAvg: NutritionTotals = {
      energy: sumNutrient('energy'),
      protein: sumNutrient('protein'),
      carbohydrate: sumNutrient('carbohydrate'),
      lipid: sumNutrient('lipid'),
      fiber: sumNutrient('fiber'),
      calcium: sumNutrient('calcium'),
      iron: sumNutrient('iron'),
      sodium: sumNutrient('sodium'),
      potassium: sumNutrient('potassium'),
      magnesium: sumNutrient('magnesium'),
      phosphorus: sumNutrient('phosphorus'),
      zinc: sumNutrient('zinc'),
      copper: sumNutrient('copper'),
      manganese: sumNutrient('manganese'),
      vitamin_c: sumNutrient('vitamin_c'),
      vitamin_a: sumNutrient('vitamin_a'),
      retinol: sumNutrient('retinol'),
      thiamine: sumNutrient('thiamine'),
      riboflavin: sumNutrient('riboflavin'),
      pyridoxine: sumNutrient('pyridoxine'),
      niacin: sumNutrient('niacin'),
      cholesterol: sumNutrient('cholesterol'),
      saturated: sumNutrient('saturated'),
      monounsaturated: sumNutrient('monounsaturated'),
      polyunsaturated: sumNutrient('polyunsaturated'),
    };

    const content = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            .no-print { display: none !important; }
            .day-section { page-break-inside: avoid; }
            .meal-block { page-break-inside: avoid; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 10px;
            background: white;
            color: #333;
            font-size: 9px;
            line-height: 1.3;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #22c55e;
          }
          
          .header h1 {
            font-size: 16px;
            color: #22c55e;
            margin-bottom: 3px;
          }
          
          .header .week {
            font-size: 10px;
            color: #666;
          }
          
          .header .school-name {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
          }
          
          .day-section {
            margin-bottom: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
          }
          
          .day-header {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .day-name {
            font-weight: 600;
            font-size: 11px;
          }
          
          .day-date {
            font-size: 9px;
            opacity: 0.9;
          }
          
          .day-content {
            padding: 10px;
          }
          
          .meals-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 10px;
          }
          
          .meal-block {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            padding: 8px;
          }
          
          .meal-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
          }
          
          .ingredients-list {
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px dashed #d1d5db;
          }
          
          .ingredients-title {
            font-weight: 600;
            color: #059669;
            font-size: 8px;
            margin-bottom: 4px;
          }
          
          .ingredients-table, .micro-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
            margin-bottom: 6px;
          }
          
          .ingredients-table th, .micro-table th {
            background: #f3f4f6;
            padding: 3px 4px;
            text-align: left;
            font-weight: 600;
            color: #4b5563;
            border-bottom: 1px solid #d1d5db;
          }
          
          .ingredients-table td, .micro-table td {
            padding: 2px 4px;
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
          }
          
          .ingredients-table .ing-name, .micro-table .ing-name {
            font-weight: 500;
            max-width: 80px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .ingredients-table .ing-qty {
            color: #6b7280;
            font-weight: 600;
          }
          
          .micro-detail {
            margin-top: 6px;
          }
          
          .micro-title {
            font-weight: 600;
            color: #7c3aed;
            font-size: 7px;
            margin-bottom: 3px;
          }
          
          .nutrients-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            font-size: 8px;
          }
          
          .nutrient-section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 6px;
          }
          
          .section-title {
            font-weight: 700;
            color: #374151;
            font-size: 8px;
            margin-bottom: 4px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 2px;
          }
          
          .nutrient-row {
            display: flex;
            justify-content: space-between;
            padding: 1px 0;
          }
          
          .nutrient-row span {
            color: #6b7280;
          }
          
          .nutrient-row strong {
            color: #111827;
            font-weight: 600;
          }
          
          .day-totals {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 2px solid #22c55e;
            border-radius: 6px;
            padding: 10px;
          }
          
          .totals-title {
            font-weight: 700;
            color: #166534;
            margin-bottom: 8px;
            font-size: 10px;
          }
          
          .no-data {
            color: #9ca3af;
            font-style: italic;
            text-align: center;
            padding: 8px;
          }
          
          .weekly-summary {
            margin-top: 20px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 12px;
          }
          
          .weekly-summary h2 {
            color: #92400e;
            font-size: 12px;
            margin-bottom: 8px;
            text-align: center;
          }
          
          .legend {
            margin-top: 15px;
            padding: 8px;
            background: #f9fafb;
            border-radius: 4px;
            font-size: 7px;
          }
          
          .legend h3 {
            font-size: 8px;
            margin-bottom: 4px;
          }
          
          .legend-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            margin-top: 4px;
          }
          
          .legend-item {
            background: #e5e7eb;
            padding: 2px 4px;
            border-radius: 2px;
          }
          
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 8px;
            color: #999;
          }
          
          .no-print {
            margin-bottom: 15px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #22c55e; color: white; border: none; border-radius: 5px;">
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
        
        <div class="header">
          <div class="school-name">Creche Pimpolinhos</div>
          <h1>${title}</h1>
          <div class="week">${weekRange}</div>
          <p style="margin-top: 3px; font-size: 8px; color: #666;">
            ✨ 25+ nutrientes calculados via TACO (Tabela Brasileira de Composição de Alimentos)
          </p>
        </div>
        
        ${daysContent}
        
        ${daysWithData.length > 0 ? `
          <div class="weekly-summary">
            <h2>📈 MÉDIA SEMANAL (${daysWithData.length} dias com dados)</h2>
            ${generateNutrientsList(weeklyAvg)}
          </div>
        ` : ''}
        
        <div class="legend">
          <h3>📊 Legenda de Abreviações</h3>
          <div class="legend-grid">
            <div class="legend-item"><strong>Ca</strong> = Cálcio (mg)</div>
            <div class="legend-item"><strong>Fe</strong> = Ferro (mg)</div>
            <div class="legend-item"><strong>K</strong> = Potássio (mg)</div>
            <div class="legend-item"><strong>Mg</strong> = Magnésio (mg)</div>
            <div class="legend-item"><strong>P</strong> = Fósforo (mg)</div>
            <div class="legend-item"><strong>Zn</strong> = Zinco (mg)</div>
            <div class="legend-item"><strong>Vit.C</strong> = Vitamina C (mg)</div>
            <div class="legend-item"><strong>Vit.A</strong> = Vitamina A RAE (µg)</div>
            <div class="legend-item"><strong>B1</strong> = Tiamina (mg)</div>
            <div class="legend-item"><strong>B2</strong> = Riboflavina (mg)</div>
            <div class="legend-item"><strong>B3</strong> = Niacina (mg)</div>
            <div class="legend-item"><strong>B6</strong> = Piridoxina (mg)</div>
          </div>
          <p style="margin-top: 6px;">Fonte: TACO - Tabela Brasileira de Composição de Alimentos (UNICAMP/NEPA)</p>
        </div>
        
        <div class="footer">
          <p>Creche Pimpolinhos - Canoas/RS</p>
          <p>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </body>
      </html>
    `;
    
    return content;
  };

  const exportPdf = () => {
    const content = generatePdfContent();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    }
  };

  // Check if there's any data at all
  const hasData = nutritionData.some(d => 
    d.totals && d.totals.energy > 0 || 
    Object.values(d.meals).some(m => m && m.energy > 0)
  );

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportPdf}
      disabled={disabled || !hasData}
      className="gap-2"
    >
      <FileDown className="w-4 h-4" />
      PDF Nutricional Completo
    </Button>
  );
}
