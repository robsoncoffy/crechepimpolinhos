import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TacoFood } from '@/hooks/useTacoSearch';

interface SelectedFood extends TacoFood {
  quantity: number;
}

interface MealNutritionData {
  mealName: string;
  foods: SelectedFood[];
}

interface DayNutritionData {
  dayName: string;
  date: string;
  meals: MealNutritionData[];
}

interface NutritionPdfExportProps {
  weekStart: Date;
  nutritionData: DayNutritionData[];
  menuType: string;
  disabled?: boolean;
}

export function NutritionPdfExport({ 
  weekStart, 
  nutritionData, 
  menuType,
  disabled 
}: NutritionPdfExportProps) {
  
  const generatePdfContent = () => {
    const title = `Relatório Nutricional - ${menuType}`;
    const weekRange = `${format(weekStart, "d 'de' MMMM", { locale: ptBR })} a ${format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

    // Calculate totals per day
    const dayTotals = nutritionData.map(day => {
      const totals = { energy: 0, protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calcium: 0, iron: 0, sodium: 0, vitamin_c: 0, vitamin_a: 0 };
      
      day.meals.forEach(meal => {
        meal.foods.forEach(food => {
          const multiplier = food.quantity / food.base_qty;
          const attrs = food.attributes;
          totals.energy += (attrs.energy?.qty || 0) * multiplier;
          totals.protein += (attrs.protein?.qty || 0) * multiplier;
          totals.carbohydrate += (attrs.carbohydrate?.qty || 0) * multiplier;
          totals.lipid += (attrs.lipid?.qty || 0) * multiplier;
          totals.fiber += (attrs.fiber?.qty || 0) * multiplier;
          totals.calcium += (attrs.calcium?.qty || 0) * multiplier;
          totals.iron += (attrs.iron?.qty || 0) * multiplier;
          totals.sodium += (attrs.sodium?.qty || 0) * multiplier;
          totals.vitamin_c += (attrs.vitamin_c?.qty || 0) * multiplier;
          totals.vitamin_a += (attrs.vitamin_a?.qty || 0) * multiplier;
        });
      });
      
      return { day: day.dayName, date: day.date, ...totals };
    });

    const content = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: white;
            color: #333;
            font-size: 11px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #22c55e;
          }
          
          .header h1 {
            font-size: 22px;
            color: #22c55e;
            margin-bottom: 5px;
          }
          
          .header .week {
            font-size: 13px;
            color: #666;
          }
          
          .header .school-name {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: center;
          }
          
          th {
            background: #22c55e;
            color: white;
            font-weight: 600;
          }
          
          .nutrient-row:nth-child(even) {
            background: #f9fafb;
          }
          
          .nutrient-label {
            text-align: left;
            font-weight: 500;
            background: #f3f4f6;
          }
          
          .total-row {
            background: #ecfdf5;
            font-weight: bold;
          }
          
          .legend {
            margin-top: 20px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 5px;
          }
          
          .legend h3 {
            font-size: 12px;
            margin-bottom: 5px;
          }
          
          .legend p {
            font-size: 10px;
            color: #666;
          }
          
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
          
          .no-print {
            margin-bottom: 20px;
            text-align: center;
          }
          
          @media print {
            .no-print { display: none; }
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
          <p style="margin-top: 5px; font-size: 10px; color: #666;">Dados nutricionais baseados na Tabela TACO (Tabela Brasileira de Composição de Alimentos)</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Nutriente</th>
              ${dayTotals.map(d => `<th>${d.day}<br/><small>${d.date}</small></th>`).join('')}
              <th style="background: #16a34a;">Média</th>
            </tr>
          </thead>
          <tbody>
            <tr class="nutrient-row">
              <td class="nutrient-label">Energia (kcal)</td>
              ${dayTotals.map(d => `<td>${d.energy.toFixed(1)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.energy, 0) / dayTotals.length).toFixed(1)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Proteínas (g)</td>
              ${dayTotals.map(d => `<td>${d.protein.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.protein, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Carboidratos (g)</td>
              ${dayTotals.map(d => `<td>${d.carbohydrate.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.carbohydrate, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Lipídios (g)</td>
              ${dayTotals.map(d => `<td>${d.lipid.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.lipid, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Fibras (g)</td>
              ${dayTotals.map(d => `<td>${d.fiber.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.fiber, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Cálcio (mg)</td>
              ${dayTotals.map(d => `<td>${d.calcium.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.calcium, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Ferro (mg)</td>
              ${dayTotals.map(d => `<td>${d.iron.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.iron, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Sódio (mg)</td>
              ${dayTotals.map(d => `<td>${d.sodium.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.sodium, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Vitamina C (mg)</td>
              ${dayTotals.map(d => `<td>${d.vitamin_c.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.vitamin_c, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Vitamina A (µg RAE)</td>
              ${dayTotals.map(d => `<td>${d.vitamin_a.toFixed(2)}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.vitamin_a, 0) / dayTotals.length).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="legend">
          <h3>📊 Referências Nutricionais</h3>
          <p>Os valores diários de referência para crianças variam de acordo com a faixa etária. Consulte as diretrizes do PNAE (Programa Nacional de Alimentação Escolar) para recomendações específicas.</p>
          <p style="margin-top: 5px;">Fonte dos dados: TACO - Tabela Brasileira de Composição de Alimentos (UNICAMP/NEPA)</p>
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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportPdf}
      disabled={disabled}
      className="border-primary text-primary hover:bg-primary/10"
    >
      <FileDown className="w-4 h-4 mr-1" />
      PDF Nutricional
    </Button>
  );
}
