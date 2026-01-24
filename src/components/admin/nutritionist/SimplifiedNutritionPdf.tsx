import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NutritionTotals {
  energy: number;
  protein: number;
  lipid: number;
  carbohydrate: number;
  fiber: number;
  calcium: number;
  iron: number;
  sodium: number;
  vitamin_c: number;
  vitamin_a: number;
}

interface IngredientWithNutrition {
  name: string;
  quantity: number;
  unit: string;
  energy?: number;
  protein?: number;
  lipid?: number;
  carbohydrate?: number;
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
      <div class="ingredients-title">📋 Ingredientes:</div>
      ${ingredients.map(ing => `
        <div class="ingredient-item">
          <span class="ingredient-name">${ing.name}</span>
          <span class="ingredient-qty">${ing.quantity}g</span>
          <span class="ingredient-kcal">${((ing.energy || 0) * ing.quantity / 100).toFixed(0)} kcal</span>
        </div>
      `).join('')}
    </div>
  `;
}

function generateNutrientsList(totals: NutritionTotals): string {
  return `
    <div class="nutrients-list">
      <span><strong>Energia:</strong> ${formatNutrientValue(totals.energy, 0)} kcal</span>
      <span><strong>Proteínas:</strong> ${formatNutrientValue(totals.protein)} g</span>
      <span><strong>Carboidratos:</strong> ${formatNutrientValue(totals.carbohydrate)} g</span>
      <span><strong>Lipídios:</strong> ${formatNutrientValue(totals.lipid)} g</span>
      <span><strong>Fibras:</strong> ${formatNutrientValue(totals.fiber)} g</span>
      <span><strong>Cálcio:</strong> ${formatNutrientValue(totals.calcium)} mg</span>
      <span><strong>Ferro:</strong> ${formatNutrientValue(totals.iron, 2)} mg</span>
      <span><strong>Sódio:</strong> ${formatNutrientValue(totals.sodium)} mg</span>
      <span><strong>Vitamina C:</strong> ${formatNutrientValue(totals.vitamin_c)} mg</span>
      <span><strong>Vitamina A:</strong> ${formatNutrientValue(totals.vitamin_a)} µg</span>
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
        
    const title = `Relatório Nutricional Detalhado - ${menuTypeLabel}`;
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
            <div class="meals-grid">
              ${mealsContent}
            </div>
            ${dayTotalsContent}
          </div>
        </div>
      `;
    }).join('');

    // Calculate weekly averages
    const daysWithData = nutritionData.filter(d => d.totals && d.totals.energy > 0);
    const divisor = daysWithData.length || 1;
    const weeklyAvg: NutritionTotals = {
      energy: daysWithData.reduce((sum, d) => sum + (d.totals?.energy || 0), 0) / divisor,
      protein: daysWithData.reduce((sum, d) => sum + (d.totals?.protein || 0), 0) / divisor,
      carbohydrate: daysWithData.reduce((sum, d) => sum + (d.totals?.carbohydrate || 0), 0) / divisor,
      lipid: daysWithData.reduce((sum, d) => sum + (d.totals?.lipid || 0), 0) / divisor,
      fiber: daysWithData.reduce((sum, d) => sum + (d.totals?.fiber || 0), 0) / divisor,
      calcium: daysWithData.reduce((sum, d) => sum + (d.totals?.calcium || 0), 0) / divisor,
      iron: daysWithData.reduce((sum, d) => sum + (d.totals?.iron || 0), 0) / divisor,
      sodium: daysWithData.reduce((sum, d) => sum + (d.totals?.sodium || 0), 0) / divisor,
      vitamin_c: daysWithData.reduce((sum, d) => sum + (d.totals?.vitamin_c || 0), 0) / divisor,
      vitamin_a: daysWithData.reduce((sum, d) => sum + (d.totals?.vitamin_a || 0), 0) / divisor,
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
              margin: 10mm;
            }
            .no-print { display: none !important; }
            .day-section { page-break-inside: avoid; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 15px;
            background: white;
            color: #333;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #22c55e;
          }
          
          .header h1 {
            font-size: 18px;
            color: #22c55e;
            margin-bottom: 5px;
          }
          
          .header .week {
            font-size: 12px;
            color: #666;
          }
          
          .header .school-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          
          .day-section {
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .day-header {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .day-name {
            font-weight: 600;
            font-size: 13px;
          }
          
          .day-date {
            font-size: 11px;
            opacity: 0.9;
          }
          
          .day-content {
            padding: 15px;
          }
          
          .meals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 15px;
          }
          
          .meal-block {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
          }
          
          .meal-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 11px;
          }
          
          .ingredients-list {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #d1d5db;
          }
          
          .ingredients-title {
            font-weight: 600;
            color: #4b5563;
            font-size: 9px;
            margin-bottom: 4px;
          }
          
          .ingredient-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            padding: 2px 0;
            gap: 8px;
          }
          
          .ingredient-name {
            flex: 1;
            color: #374151;
          }
          
          .ingredient-qty {
            color: #6b7280;
            font-weight: 500;
            min-width: 40px;
            text-align: right;
          }
          
          .ingredient-kcal {
            color: #059669;
            font-weight: 600;
            min-width: 50px;
            text-align: right;
          }
          
          .nutrients-list {
            display: flex;
            flex-direction: column;
            gap: 3px;
            font-size: 10px;
          }
          
          .nutrients-list span {
            display: flex;
            justify-content: space-between;
          }
          
          .nutrients-list strong {
            color: #6b7280;
            font-weight: 500;
          }
          
          .day-totals {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 2px solid #22c55e;
            border-radius: 8px;
            padding: 12px;
          }
          
          .totals-title {
            font-weight: 700;
            color: #166534;
            margin-bottom: 10px;
            font-size: 12px;
          }
          
          .day-totals .nutrients-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px 15px;
          }
          
          .no-data {
            color: #9ca3af;
            font-style: italic;
            text-align: center;
            padding: 10px;
          }
          
          .weekly-summary {
            margin-top: 25px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 10px;
            padding: 15px;
          }
          
          .weekly-summary h2 {
            color: #92400e;
            font-size: 14px;
            margin-bottom: 10px;
            text-align: center;
          }
          
          .weekly-summary .nutrients-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px 20px;
            font-size: 11px;
          }
          
          .legend {
            margin-top: 20px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 5px;
            font-size: 9px;
          }
          
          .legend h3 {
            font-size: 10px;
            margin-bottom: 5px;
          }
          
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #999;
          }
          
          .no-print {
            margin-bottom: 20px;
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
          <p style="margin-top: 5px; font-size: 9px; color: #666;">
            ✨ Nutrientes calculados por refeição via TACO (Tabela Brasileira de Composição de Alimentos)
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
          <h3>📊 Referências Nutricionais</h3>
          <p>Os valores diários de referência para crianças variam de acordo com a faixa etária. Consulte as diretrizes do PNAE para recomendações específicas.</p>
          <p style="margin-top: 3px;">Fonte: TACO - Tabela Brasileira de Composição de Alimentos (UNICAMP/NEPA)</p>
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
      disabled={disabled}
      className="border-primary text-primary hover:bg-primary/10"
      title={!hasData ? 'Os nutrientes serão calculados automaticamente ao preencher as refeições' : undefined}
    >
      <FileDown className="w-4 h-4 mr-1" />
      PDF Nutricional
      {!hasData && <span className="text-[10px] ml-1 text-muted-foreground">(sem dados)</span>}
    </Button>
  );
}
