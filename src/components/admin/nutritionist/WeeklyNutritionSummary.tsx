import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { PNAE_TARGETS_BY_AGE, NutritionTargets } from "@/lib/constants/nutrition";
import { NutritionTotals, MenuType } from "@/types/nutrition";

interface DayNutrition {
  dayOfWeek: number;
  dayName: string;
  totals: NutritionTotals | null;
}

interface WeeklyNutritionSummaryProps {
  weeklyData: DayNutrition[];
  menuType: MenuType;
}

const dayShortNames = ["Seg", "Ter", "Qua", "Qui", "Sex"];

export function WeeklyNutritionSummary({ weeklyData, menuType }: WeeklyNutritionSummaryProps) {
  const targets = PNAE_TARGETS_BY_AGE[menuType];

  const chartData = weeklyData.map((day, idx) => ({
    day: dayShortNames[idx],
    protein: day.totals?.protein || 0,
    carbohydrate: day.totals?.carbohydrate || 0,
    lipid: day.totals?.lipid || 0,
    energy: day.totals?.energy || 0,
    hasData: !!day.totals && day.totals.energy > 0,
  }));

  const weeklyTotals = weeklyData.reduce(
    (acc, day) => {
      if (day.totals) {
        acc.energy += day.totals.energy;
        acc.protein += day.totals.protein;
        acc.carbohydrate += day.totals.carbohydrate;
        acc.lipid += day.totals.lipid;
        acc.fiber += day.totals.fiber;
        acc.calcium += day.totals.calcium;
        acc.iron += day.totals.iron;
        acc.count++;
      }
      return acc;
    },
    { energy: 0, protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calcium: 0, iron: 0, count: 0 }
  );

  const weeklyAvg = weeklyTotals.count > 0 ? {
    energy: weeklyTotals.energy / weeklyTotals.count,
    protein: weeklyTotals.protein / weeklyTotals.count,
    carbohydrate: weeklyTotals.carbohydrate / weeklyTotals.count,
    lipid: weeklyTotals.lipid / weeklyTotals.count,
    fiber: weeklyTotals.fiber / weeklyTotals.count,
    calcium: weeklyTotals.calcium / weeklyTotals.count,
    iron: weeklyTotals.iron / weeklyTotals.count,
  } : null;

  const getStatusColor = (value: number, target: number) => {
    // 10% tolerance
    const ratio = value / target;
    if (ratio >= 0.9 && ratio <= 1.1) return "text-green-600";
    if (ratio >= 0.7 && ratio < 0.9) return "text-yellow-600";
    if (ratio > 1.1 && ratio <= 1.3) return "text-yellow-600";
    return "text-red-600";
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-2 text-xs z-50">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-muted-foreground">
              {entry.dataKey === 'protein' ? 'Proteínas' :
                entry.dataKey === 'carbohydrate' ? 'Carboidratos' : 'Lipídios'}:
            </span>
            <span className="font-medium">{Number(entry.value).toFixed(1)}g</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Resumo Nutricional Semanal
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Meta: {targets.energy} kcal
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart container with fixed height */}
        <div style={{ width: '100%', height: 180, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="protein" stackId="a" radius={[0, 0, 0, 0]} fill="hsl(210, 80%, 45%)" />
              <Bar dataKey="carbohydrate" stackId="a" radius={[0, 0, 0, 0]} fill="hsl(45, 95%, 55%)" />
              <Bar dataKey="lipid" stackId="a" radius={[4, 4, 0, 0]} fill="hsl(270, 60%, 55%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(210, 80%, 45%)' }} />
            <span>Proteínas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(45, 95%, 55%)' }} />
            <span>Carboidratos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(270, 60%, 55%)' }} />
            <span>Lipídios</span>
          </div>
        </div>

        {/* Weekly Averages Table */}
        {weeklyAvg && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Média Diária vs. Metas (PNAE)</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {weeklyTotals.count}/5 dias
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-px bg-border">
              <div className="bg-background p-2 text-center">
                <p className={`text-lg font-bold ${getStatusColor(weeklyAvg.energy, targets.energy)}`}>
                  {weeklyAvg.energy.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">kcal ({targets.energy})</p>
              </div>
              <div className="bg-background p-2 text-center">
                <p className={`text-lg font-bold ${getStatusColor(weeklyAvg.protein, targets.protein)}`}>
                  {weeklyAvg.protein.toFixed(1)}g
                </p>
                <p className="text-xs text-muted-foreground">Prot. ({targets.protein})</p>
              </div>
              <div className="bg-background p-2 text-center">
                <p className={`text-lg font-bold ${getStatusColor(weeklyAvg.carbohydrate, targets.carbohydrate)}`}>
                  {weeklyAvg.carbohydrate.toFixed(1)}g
                </p>
                <p className="text-xs text-muted-foreground">Carb. ({targets.carbohydrate})</p>
              </div>
              <div className="bg-background p-2 text-center">
                <p className={`text-lg font-bold ${getStatusColor(weeklyAvg.lipid, targets.lipid)}`}>
                  {weeklyAvg.lipid.toFixed(1)}g
                </p>
                <p className="text-xs text-muted-foreground">Lip. ({targets.lipid})</p>
              </div>
            </div>
            <div className="bg-background p-2 text-xs text-center text-muted-foreground border-t">
              Metas calculadas para: <strong>{menuType.replace(/_/g, ' ').toUpperCase()}</strong>
            </div>
          </div>
        )}

        {!weeklyAvg && (
          <div className="text-center py-4 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Preencha o cardápio para ver o resumo semanal</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}