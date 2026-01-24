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

interface DayNutritionData {
  dayOfWeek: number;
  dayName: string;
  date: string;
  totals: NutritionTotals | null;
  meals: Record<string, NutritionTotals | null>;
}

interface SimplifiedNutritionPdfProps {
  weekStart: Date;
  nutritionData: DayNutritionData[];
  menuType: string;
  disabled?: boolean;
}

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

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
        
    const title = `Relatório Nutricional - ${menuTypeLabel}`;
    const weekRange = `${format(weekStart, "d 'de' MMMM", { locale: ptBR })} a ${format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

    // Calculate day totals from the nutrition data
    const dayTotals = nutritionData.map((day, idx) => ({
      day: dayNames[idx],
      date: format(addDays(weekStart, idx), 'd/MM'),
      ...(day.totals || {
        energy: 0,
        protein: 0,
        carbohydrate: 0,
        lipid: 0,
        fiber: 0,
        calcium: 0,
        iron: 0,
        sodium: 0,
        vitamin_c: 0,
        vitamin_a: 0,
      }),
    }));

    const daysWithData = dayTotals.filter(d => d.energy > 0);
    const divisor = daysWithData.length || 1;

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
          
          .no-data {
            color: #999;
            font-style: italic;
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
          <p style="margin-top: 5px; font-size: 10px; color: #666;">
            ✨ Dados calculados automaticamente via TACO (Tabela Brasileira de Composição de Alimentos)
          </p>
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
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.energy.toFixed(1) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.energy, 0) / divisor).toFixed(1)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Proteínas (g)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.protein.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.protein, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Carboidratos (g)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.carbohydrate.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.carbohydrate, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Lipídios (g)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.lipid.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.lipid, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Fibras (g)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.fiber.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.fiber, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Cálcio (mg)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.calcium.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.calcium, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Ferro (mg)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.iron.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.iron, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Sódio (mg)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.sodium.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.sodium, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Vitamina C (mg)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.vitamin_c.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.vitamin_c, 0) / divisor).toFixed(2)}</td>
            </tr>
            <tr class="nutrient-row">
              <td class="nutrient-label">Vitamina A (µg RAE)</td>
              ${dayTotals.map(d => `<td${d.energy === 0 ? ' class="no-data"' : ''}>${d.energy > 0 ? d.vitamin_a.toFixed(2) : '-'}</td>`).join('')}
              <td class="total-row">${(dayTotals.reduce((sum, d) => sum + d.vitamin_a, 0) / divisor).toFixed(2)}</td>
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

  const hasData = nutritionData.some(d => d.totals && d.totals.energy > 0);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportPdf}
      disabled={disabled || !hasData}
      className="border-primary text-primary hover:bg-primary/10"
    >
      <FileDown className="w-4 h-4 mr-1" />
      PDF Nutricional
    </Button>
  );
}
