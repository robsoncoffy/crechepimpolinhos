import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, Zap, Droplets, Wheat, Baby, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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

type MenuType = 'bercario_0_6' | 'bercario_6_12' | 'bercario_12_24' | 'maternal';

const MENU_LABELS: Record<MenuType, string> = {
  bercario_0_6: 'Berçário 0-6m',
  bercario_6_12: 'Berçário 6m-1a',
  bercario_12_24: 'Berçário 1a-2a',
  maternal: 'Maternal'
};

const MENU_SHORT_LABELS: Record<MenuType, string> = {
  bercario_0_6: '0-6m',
  bercario_6_12: '6m-1a',
  bercario_12_24: '1a-2a',
  maternal: 'Mat.'
};

const MENU_COLORS: Record<MenuType, string> = {
  bercario_0_6: 'hsl(var(--pimpo-pink))',
  bercario_6_12: 'hsl(var(--pimpo-yellow))',
  bercario_12_24: 'hsl(var(--pimpo-purple))',
  maternal: 'hsl(var(--pimpo-blue))'
};

interface ConsolidatedNutrition {
  bercario_0_6: NutritionTotals | null;
  bercario_6_12: NutritionTotals | null;
  bercario_12_24: NutritionTotals | null;
  maternal: NutritionTotals | null;
}

interface TodayOverviewWidgetProps {
  consolidatedNutrition: ConsolidatedNutrition;
  childrenWithAllergies: number;
  allergyConflicts?: string[];
}

export function TodayOverviewWidget({ 
  consolidatedNutrition, 
  childrenWithAllergies,
  allergyConflicts = [],
}: TodayOverviewWidgetProps) {
  const menuTypes: MenuType[] = ['bercario_0_6', 'bercario_6_12', 'bercario_12_24', 'maternal'];
  
  // Count how many menus have data
  const menusWithData = menuTypes.filter(type => 
    consolidatedNutrition[type] && consolidatedNutrition[type]!.energy > 0
  );
  
  const hasAnyData = menusWithData.length > 0;

  // Prepare bar chart data for energy comparison
  const energyData = menuTypes.map(type => ({
    name: MENU_SHORT_LABELS[type],
    fullName: MENU_LABELS[type],
    energy: consolidatedNutrition[type]?.energy || 0,
    fill: MENU_COLORS[type],
  })).filter(d => d.energy > 0);

  // Calculate consolidated totals for macros pie chart
  const consolidatedTotals: NutritionTotals = {
    energy: 0, protein: 0, lipid: 0, carbohydrate: 0, fiber: 0,
    calcium: 0, iron: 0, sodium: 0, vitamin_c: 0, vitamin_a: 0
  };

  menuTypes.forEach(type => {
    const nutrition = consolidatedNutrition[type];
    if (nutrition) {
      (Object.keys(consolidatedTotals) as (keyof NutritionTotals)[]).forEach(key => {
        consolidatedTotals[key] += nutrition[key] || 0;
      });
    }
  });

  // Prepare pie chart data for consolidated macros
  const macroData = hasAnyData ? [
    { name: "Proteínas", value: consolidatedTotals.protein, color: "hsl(var(--pimpo-blue))" },
    { name: "Carboidratos", value: consolidatedTotals.carbohydrate, color: "hsl(var(--pimpo-yellow))" },
    { name: "Lipídios", value: consolidatedTotals.lipid, color: "hsl(var(--pimpo-purple))" },
  ] : [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Visão Geral - Hoje
          </CardTitle>
          <div className="flex gap-1">
            {menuTypes.map(type => {
              const hasData = consolidatedNutrition[type] && consolidatedNutrition[type]!.energy > 0;
              return (
                <Badge 
                  key={type}
                  variant={hasData ? "default" : "outline"} 
                  className={`text-xs ${hasData ? '' : 'opacity-50'}`}
                >
                  {MENU_SHORT_LABELS[type]}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasAnyData ? (
          <div className="space-y-4">
            {/* Energy Comparison Bar Chart */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Calorias por Cardápio</p>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyData} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      width={40}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(0)} kcal`, 'Energia']}
                      labelFormatter={(label) => {
                        const item = energyData.find(d => d.name === label);
                        return item?.fullName || label;
                      }}
                      contentStyle={{ 
                        background: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="energy" radius={[0, 4, 4, 0]}>
                      {energyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cards per menu type */}
            <div className="grid grid-cols-3 gap-2">
              {menuTypes.map(type => {
                const nutrition = consolidatedNutrition[type];
                const hasData = nutrition && nutrition.energy > 0;
                const Icon = type === 'maternal' ? Users : Baby;
                
                return (
                  <div 
                    key={type}
                    className={`p-2 rounded-lg text-center transition-all ${
                      hasData 
                        ? 'bg-primary/10' 
                        : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{MENU_SHORT_LABELS[type]}</p>
                    <p className="font-bold text-sm">
                      {hasData ? `${nutrition!.energy.toFixed(0)}` : '-'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                );
              })}
            </div>

            {/* Consolidated Macros Summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pimpo-blue/10">
                <Zap className="w-3 h-3 text-pimpo-blue" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Prot.</p>
                  <p className="font-semibold text-xs">{consolidatedTotals.protein.toFixed(0)}g</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pimpo-yellow/10">
                <Wheat className="w-3 h-3 text-pimpo-yellow" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Carb.</p>
                  <p className="font-semibold text-xs">{consolidatedTotals.carbohydrate.toFixed(0)}g</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pimpo-purple/10">
                <Droplets className="w-3 h-3 text-pimpo-purple" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Lip.</p>
                  <p className="font-semibold text-xs">{consolidatedTotals.lipid.toFixed(0)}g</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-pimpo-green/10">
                <div className="w-3 h-3 flex items-center justify-center text-pimpo-green font-bold text-[10px]">
                  Fe
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Ferro</p>
                  <p className="font-semibold text-xs">{consolidatedTotals.iron.toFixed(1)}mg</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Preencha os cardápios de hoje para ver o resumo consolidado
            </p>
          </div>
        )}

        {/* Allergy Alerts */}
        {(childrenWithAllergies > 0 || allergyConflicts.length > 0) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-pimpo-red" />
              <span className="text-sm font-medium">Alertas de Alergia</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-pimpo-red/10 text-pimpo-red border-pimpo-red/30">
                {childrenWithAllergies} crianças com restrições
              </Badge>
              {allergyConflicts.map((conflict, i) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {conflict}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
