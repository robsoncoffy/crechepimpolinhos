import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Ruler, Scale } from "lucide-react";

interface MonthlyData {
  id: string;
  month: number;
  year: number;
  weight: number | null;
  height: number | null;
  observations: string | null;
}

interface GrowthChartProps {
  data: MonthlyData[];
  childName: string;
}

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export function GrowthChart({ data, childName }: GrowthChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .map((item) => ({
        name: `${monthNames[item.month - 1]}/${item.year.toString().slice(-2)}`,
        peso: item.weight,
        altura: item.height,
        month: item.month,
        year: item.year,
        observations: item.observations,
      }));
  }, [data]);

  const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const previousData = chartData.length > 1 ? chartData[chartData.length - 2] : null;

  const weightChange = latestData?.peso && previousData?.peso 
    ? (latestData.peso - previousData.peso).toFixed(1) 
    : null;
  
  const heightChange = latestData?.altura && previousData?.altura 
    ? (latestData.altura - previousData.altura).toFixed(1) 
    : null;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Ainda não há registros de crescimento para {childName}.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Os registros mensais de peso e altura aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pimpo-blue/10">
                <Scale className="w-5 h-5 text-pimpo-blue" />
              </div>
              <div>
                <p className="text-2xl font-fredoka font-bold">
                  {latestData?.peso ? `${latestData.peso} kg` : "—"}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Peso atual</p>
                  {weightChange && Number(weightChange) !== 0 && (
                    <span className={`text-xs font-medium ${Number(weightChange) > 0 ? "text-pimpo-green" : "text-pimpo-red"}`}>
                      ({Number(weightChange) > 0 ? "+" : ""}{weightChange} kg)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pimpo-green/10">
                <Ruler className="w-5 h-5 text-pimpo-green" />
              </div>
              <div>
                <p className="text-2xl font-fredoka font-bold">
                  {latestData?.altura ? `${latestData.altura} cm` : "—"}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Altura atual</p>
                  {heightChange && Number(heightChange) !== 0 && (
                    <span className={`text-xs font-medium ${Number(heightChange) > 0 ? "text-pimpo-green" : "text-pimpo-red"}`}>
                      ({Number(heightChange) > 0 ? "+" : ""}{heightChange} cm)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-pimpo-blue" />
            Evolução do Peso (kg)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} kg`, 'Peso']}
                />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="hsl(var(--pimpo-blue))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--pimpo-blue))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Height Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ruler className="w-5 h-5 text-pimpo-green" />
            Evolução da Altura (cm)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} cm`, 'Altura']}
                />
                <Line
                  type="monotone"
                  dataKey="altura"
                  stroke="hsl(var(--pimpo-green))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--pimpo-green))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Histórico de Medições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...chartData].reverse().map((item, index) => (
                <div 
                  key={`${item.year}-${item.month}`}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                  }`}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.observations && (
                      <p className="text-sm text-muted-foreground mt-1">{item.observations}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="text-pimpo-blue font-medium">{item.peso ? `${item.peso} kg` : "—"}</span>
                      {" · "}
                      <span className="text-pimpo-green font-medium">{item.altura ? `${item.altura} cm` : "—"}</span>
                    </p>
                    {index === 0 && (
                      <p className="text-xs text-muted-foreground">Mais recente</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
