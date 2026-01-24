import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, Zap, Droplets, Wheat } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

interface TodayOverviewWidgetProps {
  todayNutrition: NutritionTotals | null;
  childrenWithAllergies: number;
  allergyConflicts?: string[];
}

export function TodayOverviewWidget({ 
  todayNutrition, 
  childrenWithAllergies,
  allergyConflicts = []
}: TodayOverviewWidgetProps) {
  const hasTodayData = todayNutrition && todayNutrition.energy > 0;
  
  // Prepare pie chart data for macros
  const macroData = hasTodayData ? [
    { name: "Proteínas", value: todayNutrition.protein, color: "hsl(var(--pimpo-blue))" },
    { name: "Carboidratos", value: todayNutrition.carbohydrate, color: "hsl(var(--pimpo-yellow))" },
    { name: "Lipídios", value: todayNutrition.lipid, color: "hsl(var(--pimpo-purple))" },
  ] : [];

  const totalMacros = hasTodayData 
    ? todayNutrition.protein + todayNutrition.carbohydrate + todayNutrition.lipid 
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          Visão Geral - Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Macro Pie Chart */}
          <div className="flex flex-col items-center">
            {hasTodayData ? (
              <>
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {macroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)}g`}
                        contentStyle={{ 
                          background: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-2">
                  <p className="text-2xl font-fredoka font-bold text-primary">
                    {todayNutrition.energy.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal total</p>
                </div>
              </>
            ) : (
              <div className="w-32 h-32 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  Preencha o cardápio de hoje para ver o resumo
                </p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-pimpo-blue/10">
              <Zap className="w-4 h-4 text-pimpo-blue" />
              <div>
                <p className="text-xs text-muted-foreground">Proteínas</p>
                <p className="font-semibold text-sm">
                  {hasTodayData ? `${todayNutrition.protein.toFixed(1)}g` : "-"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg bg-pimpo-yellow/10">
              <Wheat className="w-4 h-4 text-pimpo-yellow" />
              <div>
                <p className="text-xs text-muted-foreground">Carboidratos</p>
                <p className="font-semibold text-sm">
                  {hasTodayData ? `${todayNutrition.carbohydrate.toFixed(1)}g` : "-"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg bg-pimpo-purple/10">
              <Droplets className="w-4 h-4 text-pimpo-purple" />
              <div>
                <p className="text-xs text-muted-foreground">Lipídios</p>
                <p className="font-semibold text-sm">
                  {hasTodayData ? `${todayNutrition.lipid.toFixed(1)}g` : "-"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg bg-pimpo-green/10">
              <div className="w-4 h-4 flex items-center justify-center text-pimpo-green font-bold text-xs">
                Fe
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ferro</p>
                <p className="font-semibold text-sm">
                  {hasTodayData ? `${todayNutrition.iron.toFixed(1)}mg` : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

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
