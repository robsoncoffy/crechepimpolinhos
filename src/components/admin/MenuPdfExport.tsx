import { Button } from "@/components/ui/button";
import { FileDown, Baby, Users } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MenuItem {
  id?: string;
  week_start: string;
  day_of_week: number;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  notes: string;
}

interface MenuPdfExportProps {
  menuItems: MenuItem[];
  weekStart: Date;
  disabled?: boolean;
}

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

export function MenuPdfExport({ menuItems, weekStart, disabled }: MenuPdfExportProps) {
  
  const generatePdfContent = (type: 'bercario' | 'maternal') => {
    const title = type === 'bercario' 
      ? 'Cardápio Semanal - Berçário'
      : 'Cardápio Semanal - Maternal e Jardim';
    
    const weekRange = `${format(weekStart, "d 'de' MMMM", { locale: ptBR })} a ${format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

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
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: white;
            color: #333;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid ${type === 'bercario' ? '#3b82f6' : '#22c55e'};
          }
          
          .header h1 {
            font-size: 24px;
            color: ${type === 'bercario' ? '#3b82f6' : '#22c55e'};
            margin-bottom: 5px;
          }
          
          .header .week {
            font-size: 14px;
            color: #666;
          }
          
          .header .school-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          
          th {
            background: ${type === 'bercario' ? '#3b82f6' : '#22c55e'};
            color: white;
            font-weight: 600;
            text-align: center;
          }
          
          th.day-header {
            background: ${type === 'bercario' ? '#60a5fa' : '#4ade80'};
          }
          
          .meal-label {
            font-weight: 600;
            color: #555;
            width: 100px;
            background: #f8f8f8;
          }
          
          .meal-content {
            min-height: 30px;
          }
          
          .notes-row td {
            background: #fffbeb;
            font-style: italic;
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
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: ${type === 'bercario' ? '#3b82f6' : '#22c55e'}; color: white; border: none; border-radius: 5px;">
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
        
        <div class="header">
          <div class="school-name">Creche Pimpolinhos</div>
          <h1>${title}</h1>
          <div class="week">${weekRange}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 100px;">Refeição</th>
              ${dayNames.map((day, index) => {
                const dayDate = addDays(weekStart, index);
                return `<th class="day-header">${day}<br/><small>${format(dayDate, 'd/MM')}</small></th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="meal-label">☕ Café da Manhã</td>
              ${menuItems.map(item => `<td class="meal-content">${item.breakfast || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td class="meal-label">🍲 Almoço</td>
              ${menuItems.map(item => `<td class="meal-content">${item.lunch || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td class="meal-label">🍪 Lanche</td>
              ${menuItems.map(item => `<td class="meal-content">${item.snack || '-'}</td>`).join('')}
            </tr>
            <tr>
              <td class="meal-label">🌙 Jantar</td>
              ${menuItems.map(item => `<td class="meal-content">${item.dinner || '-'}</td>`).join('')}
            </tr>
            <tr class="notes-row">
              <td class="meal-label">📝 Observações</td>
              ${menuItems.map(item => `<td>${item.notes || '-'}</td>`).join('')}
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Creche Pimpolinhos - Canoas/RS</p>
          <p>Cardápio sujeito a alterações conforme disponibilidade de ingredientes</p>
        </div>
      </body>
      </html>
    `;
    
    return content;
  };

  const exportPdf = (type: 'bercario' | 'maternal') => {
    const content = generatePdfContent(type);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPdf('bercario')}
        disabled={disabled}
        className="border-pimpo-blue text-pimpo-blue hover:bg-pimpo-blue/10 flex-1 sm:flex-none"
      >
        <FileDown className="w-4 h-4 mr-1" />
        <Baby className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">PDF Berçário</span>
        <span className="sm:hidden">Berçário</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPdf('maternal')}
        disabled={disabled}
        className="border-pimpo-green text-pimpo-green hover:bg-pimpo-green/10 flex-1 sm:flex-none"
      >
        <FileDown className="w-4 h-4 mr-1" />
        <Users className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">PDF Maternal/Jardim</span>
        <span className="sm:hidden">Maternal</span>
      </Button>
    </div>
  );
}
