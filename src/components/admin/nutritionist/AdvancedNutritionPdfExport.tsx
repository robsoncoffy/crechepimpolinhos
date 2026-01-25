import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachWeekOfInterval, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface NutritionTotals {
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
  copper: number;
  manganese: number;
  vitamin_c: number;
  vitamin_a: number;
  retinol: number;
  thiamine: number;
  riboflavin: number;
  pyridoxine: number;
  niacin: number;
  cholesterol: number;
  saturated: number;
  monounsaturated: number;
  polyunsaturated: number;
}

interface IngredientWithNutrition {
  name: string;
  quantity: number;
  unit: string;
  energy?: number;
  protein?: number;
  lipid?: number;
  carbohydrate?: number;
  fiber?: number;
  calcium?: number;
  iron?: number;
  sodium?: number;
  potassium?: number;
  magnesium?: number;
  phosphorus?: number;
  zinc?: number;
  copper?: number;
  manganese?: number;
  vitamin_c?: number;
  vitamin_a?: number;
  retinol?: number;
  thiamine?: number;
  riboflavin?: number;
  pyridoxine?: number;
  niacin?: number;
  cholesterol?: number;
  saturated?: number;
  monounsaturated?: number;
  polyunsaturated?: number;
}

type PeriodType = 'week' | 'month' | 'semester' | 'year';
type MenuType = 'bercario_0_6' | 'bercario_6_12' | 'bercario_12_24' | 'maternal';

interface AdvancedNutritionPdfExportProps {
  menuType: MenuType;
  currentWeekStart: Date;
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

const menuTypeLabels: Record<MenuType, string> = {
  bercario_0_6: 'Berçário (0-6 meses)',
  bercario_6_12: 'Berçário (6m - 1 ano)',
  bercario_12_24: 'Berçário (1a - 2 anos)',
  maternal: 'Maternal / Jardim',
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
      <table class="ingredients-table">
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th>Qtd</th>
            <th>kcal</th>
            <th>Prot</th>
            <th>Carb</th>
            <th>Lip</th>
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
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateNutrientsSummary(totals: NutritionTotals): string {
  return `
    <div class="nutrients-summary">
      <span class="nutrient"><strong>${formatNutrientValue(totals.energy, 0)}</strong> kcal</span>
      <span class="nutrient"><strong>${formatNutrientValue(totals.protein)}</strong>g prot</span>
      <span class="nutrient"><strong>${formatNutrientValue(totals.carbohydrate)}</strong>g carb</span>
      <span class="nutrient"><strong>${formatNutrientValue(totals.lipid)}</strong>g lip</span>
      <span class="nutrient"><strong>${formatNutrientValue(totals.fiber)}</strong>g fibra</span>
    </div>
  `;
}

export function AdvancedNutritionPdfExport({ 
  menuType,
  currentWeekStart 
}: AdvancedNutritionPdfExportProps) {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getDateRange = () => {
    if (periodType === 'week') {
      return {
        start: currentWeekStart,
        end: addDays(currentWeekStart, 4),
        label: `Semana de ${format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })}`,
      };
    } else if (periodType === 'month') {
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
      const monthEnd = endOfMonth(monthStart);
      return {
        start: monthStart,
        end: monthEnd,
        label: `${months[selectedMonth]} de ${selectedYear}`,
      };
    } else if (periodType === 'semester') {
      // Semester: First half (Jan-Jun) or Second half (Jul-Dec)
      const isFirstSemester = selectedMonth < 6;
      const semesterStart = new Date(selectedYear, isFirstSemester ? 0 : 6, 1);
      const semesterEnd = endOfMonth(new Date(selectedYear, isFirstSemester ? 5 : 11, 1));
      const semesterLabel = isFirstSemester ? '1º Semestre' : '2º Semestre';
      return {
        start: semesterStart,
        end: semesterEnd,
        label: `${semesterLabel} de ${selectedYear}`,
      };
    } else {
      const yearStart = startOfYear(new Date(selectedYear, 0));
      const yearEnd = endOfYear(yearStart);
      return {
        start: yearStart,
        end: yearEnd,
        label: `Ano de ${selectedYear}`,
      };
    }
  };

  const fetchMenuData = async () => {
    const { start, end } = getDateRange();
    
    // Get all weeks in the range
    const weeks = eachWeekOfInterval(
      { start, end },
      { weekStartsOn: 1 }
    );

    const weekStarts = weeks.map(w => format(startOfWeek(w, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    
    // Map menu type to database type
    const dbMenuType = menuType === 'bercario_0_6' 
      ? 'bercario' 
      : menuType === 'bercario_6_12' 
        ? 'bercario_6_12' 
        : menuType === 'bercario_12_24' 
          ? 'bercario_12_24'
          : 'maternal';

    const { data, error } = await supabase
      .from('weekly_menus')
      .select('*')
      .in('week_start', weekStarts)
      .eq('menu_type', dbMenuType)
      .order('week_start')
      .order('day_of_week');

    if (error) throw error;
    return data || [];
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const menuData = await fetchMenuData();
      
      if (!menuData.length) {
        toast.error('Nenhum cardápio encontrado para o período selecionado');
        return;
      }

      const { label } = getDateRange();
      const content = generatePdfContent(menuData, label);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();
      }
      
      toast.success('PDF gerado com sucesso!');
      setOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  const generatePdfContent = (menuData: any[], periodLabel: string) => {
    // Group by week
    const groupedByWeek = menuData.reduce((acc, item) => {
      if (!acc[item.week_start]) acc[item.week_start] = [];
      acc[item.week_start].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const weeksContent = Object.entries(groupedByWeek).map(([weekStart, items]) => {
      const weekDate = new Date(weekStart + 'T00:00:00');
      const weekLabel = format(weekDate, "d 'de' MMMM", { locale: ptBR });
      
      const daysContent = (items as any[]).map((item: any) => {
        const dayDate = addDays(weekDate, item.day_of_week - 1);
        const nutritionData = item.nutrition_data || {};
        const mealFields = ['breakfast', 'morning_snack', 'lunch', 'bottle', 'snack', 'pre_dinner', 'dinner'];
        
        const mealsContent = mealFields.map(field => {
          const mealValue = item[field];
          if (!mealValue) return '';
          
          const nutrition = nutritionData[field];
          const ingredients = nutritionData[`${field}_ingredients`] || [];
          
          return `
            <div class="meal-row">
              <div class="meal-name">${mealLabels[field]}</div>
              <div class="meal-desc">${mealValue}</div>
              ${ingredients.length > 0 ? generateIngredientsList(ingredients) : ''}
              ${nutrition ? generateNutrientsSummary(nutrition) : ''}
            </div>
          `;
        }).filter(Boolean).join('');

        if (!mealsContent) return '';

        // Calculate day totals
        let dayTotals: NutritionTotals = {
          energy: 0, protein: 0, lipid: 0, carbohydrate: 0, fiber: 0,
          calcium: 0, iron: 0, sodium: 0, potassium: 0, magnesium: 0,
          phosphorus: 0, zinc: 0, copper: 0, manganese: 0,
          vitamin_c: 0, vitamin_a: 0, retinol: 0, thiamine: 0,
          riboflavin: 0, pyridoxine: 0, niacin: 0,
          cholesterol: 0, saturated: 0, monounsaturated: 0, polyunsaturated: 0
        };
        
        mealFields.forEach(field => {
          const nutrition = nutritionData[field];
          if (nutrition) {
            (Object.keys(dayTotals) as (keyof NutritionTotals)[]).forEach(key => {
              dayTotals[key] += (nutrition as any)[key] || 0;
            });
          }
        });

        return `
          <div class="day-block">
            <div class="day-header">
              <span class="day-name">${dayNames[item.day_of_week - 1]}</span>
              <span class="day-date">${format(dayDate, 'd/MM')}</span>
            </div>
            <div class="day-meals">${mealsContent}</div>
            ${dayTotals.energy > 0 ? `
              <div class="day-total">
                <strong>Total do dia:</strong> ${generateNutrientsSummary(dayTotals)}
              </div>
            ` : ''}
          </div>
        `;
      }).filter(Boolean).join('');

      if (!daysContent) return '';

      return `
        <div class="week-section">
          <div class="week-header">📅 Semana de ${weekLabel}</div>
          ${daysContent}
        </div>
      `;
    }).filter(Boolean).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Nutricional - ${periodLabel}</title>
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
            .week-section { page-break-inside: avoid; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', sans-serif;
            padding: 15px;
            font-size: 9px;
            line-height: 1.4;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #22c55e;
          }
          .header h1 { font-size: 18px; color: #22c55e; margin-bottom: 5px; }
          .header .subtitle { font-size: 12px; color: #666; }
          .header .period { font-size: 11px; color: #333; font-weight: 600; margin-top: 5px; }
          
          .week-section {
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .week-header {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            padding: 10px 15px;
            font-size: 12px;
            font-weight: 600;
          }
          
          .day-block {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 15px;
          }
          .day-block:last-child { border-bottom: none; }
          .day-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px dashed #d1d5db;
          }
          .day-name { font-weight: 600; color: #374151; }
          .day-date { color: #6b7280; }
          
          .meal-row {
            margin-bottom: 8px;
            padding: 6px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .meal-name { font-weight: 600; color: #059669; font-size: 8px; }
          .meal-desc { color: #374151; margin: 3px 0; }
          
          .nutrients-summary {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 4px;
          }
          .nutrient {
            background: #ecfdf5;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            color: #065f46;
          }
          
          .ingredients-list { margin: 5px 0; }
          .ingredients-title { font-size: 7px; color: #059669; font-weight: 600; }
          .ingredients-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
            margin-top: 3px;
          }
          .ingredients-table th {
            background: #f3f4f6;
            padding: 2px 4px;
            text-align: left;
            font-weight: 600;
          }
          .ingredients-table td { padding: 2px 4px; border-bottom: 1px solid #e5e7eb; }
          .ing-name { font-weight: 500; }
          .ing-qty { color: #6b7280; }
          
          .day-total {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
            font-size: 8px;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 8px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🥗 Relatório Nutricional Completo</h1>
          <div class="subtitle">${menuTypeLabels[menuType]}</div>
          <div class="period">${periodLabel}</div>
        </div>
        
        ${weeksContent || '<p>Nenhum dado encontrado para o período.</p>'}
        
        <div class="footer">
          Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Creche Pimpolinhos
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Calendar className="w-4 h-4 mr-2" />
          PDF por Período
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Exportar Relatório Nutricional
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana Atual</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="semester">Semestre (6 meses)</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType !== 'week' && (
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {periodType === 'semester' && (
            <div className="space-y-2">
              <Label>Semestre</Label>
              <Select 
                value={selectedMonth < 6 ? '0' : '6'} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">1º Semestre (Jan - Jun)</SelectItem>
                  <SelectItem value="6">2º Semestre (Jul - Dez)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {periodType === 'month' && (
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              📊 O relatório incluirá todos os cardápios do tipo <strong>{menuTypeLabels[menuType]}</strong> para o período selecionado, com informações nutricionais detalhadas por ingrediente.
            </p>
            
            <Button 
              onClick={handleExport} 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
