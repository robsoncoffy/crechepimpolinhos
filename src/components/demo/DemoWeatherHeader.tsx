import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Loader2,
} from "lucide-react";

interface HourlyForecast {
  time: string;
  temp: number;
  weatherCode: number;
  precipitationProb: number;
}

interface WeatherData {
  temp: number;
  description: string;
  weatherCode: number;
  humidity: number;
  wind: number;
  feelsLike: number;
  hourlyForecast: HourlyForecast[];
}

export function DemoWeatherHeader() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Canoas, RS coordinates
        const lat = -29.9175;
        const lon = -51.1833;
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&timezone=America/Sao_Paulo&forecast_days=1`
        );
        
        if (!response.ok) throw new Error("Weather fetch failed");
        
        const data = await response.json();
        const current = data.current;
        const hourly = data.hourly;
        
        // Get current hour index
        const now = new Date();
        const currentHour = now.getHours();
        
        // Get hourly forecast from current hour to end of day
        const hourlyForecast: HourlyForecast[] = [];
        for (let i = currentHour; i < 24 && hourlyForecast.length < 10; i++) {
          hourlyForecast.push({
            time: `${String(i).padStart(2, "0")}:00`,
            temp: Math.round(hourly.temperature_2m[i]),
            weatherCode: hourly.weather_code[i],
            precipitationProb: hourly.precipitation_probability[i] || 0,
          });
        }
        
        const weatherDescriptions: Record<number, string> = {
          0: "Céu limpo",
          1: "Limpo",
          2: "Parc. nublado",
          3: "Nublado",
          45: "Neblina",
          48: "Neblina",
          51: "Garoa leve",
          53: "Garoa",
          55: "Garoa forte",
          61: "Chuva leve",
          63: "Chuva",
          65: "Chuva forte",
          71: "Neve leve",
          73: "Neve",
          75: "Neve forte",
          80: "Pancadas",
          81: "Pancadas",
          82: "Pancadas fortes",
          95: "Tempestade",
          96: "Tempestade",
          99: "Tempestade",
        };
        
        setWeather({
          temp: Math.round(current.temperature_2m),
          description: weatherDescriptions[current.weather_code] || "Indefinido",
          weatherCode: current.weather_code,
          humidity: current.relative_humidity_2m,
          wind: Math.round(current.wind_speed_10m),
          feelsLike: Math.round(current.apparent_temperature),
          hourlyForecast,
        });
      } catch (err) {
        console.error("Weather error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (code: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    };
    const sizeClass = sizeClasses[size];
    
    if (code === 0 || code === 1) return <Sun className={`${sizeClass} text-pimpo-yellow`} />;
    if (code === 2 || code === 3) return <Cloud className={`${sizeClass} text-muted-foreground`} />;
    if (code >= 51 && code <= 67) return <CloudRain className={`${sizeClass} text-pimpo-blue`} />;
    if (code >= 71 && code <= 77) return <CloudSnow className={`${sizeClass} text-blue-200`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${sizeClass} text-pimpo-blue`} />;
    if (code >= 95) return <CloudLightning className={`${sizeClass} text-pimpo-yellow`} />;
    return <Cloud className={`${sizeClass} text-muted-foreground`} />;
  };

  const isRainyWeather = (code: number) => {
    return (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-pimpo-blue/10 via-primary/5 to-pimpo-blue/10 rounded-xl p-4 flex items-center justify-center h-20">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gradient-to-r from-pimpo-blue/10 via-primary/5 to-pimpo-blue/10 rounded-xl p-4 flex items-center gap-4">
        <Cloud className="w-8 h-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Canoas, RS</p>
          <p className="text-xs text-muted-foreground">Previsão indisponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-pimpo-blue/10 via-primary/5 to-pimpo-blue/10 rounded-xl p-4">
      <div className="flex items-start gap-4">
        {/* Current Weather */}
        <div className="flex items-center gap-3 shrink-0">
          {getWeatherIcon(weather.weatherCode, "lg")}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-fredoka font-bold">{weather.temp}°C</span>
            </div>
            <p className="text-xs text-muted-foreground">{weather.description}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {weather.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                {weather.wind}km/h
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-16 bg-border/50 self-center shrink-0" />

        {/* Hourly Forecast */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="text-xs font-medium text-muted-foreground mb-2">Previsão hora a hora</p>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-1">
              {weather.hourlyForecast.map((hour, i) => {
                const hasRain = isRainyWeather(hour.weatherCode) || hour.precipitationProb > 50;
                
                return (
                  <div 
                    key={i}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[52px] ${
                      hasRain ? "bg-pimpo-blue/10" : "bg-muted/30"
                    }`}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {hour.time}
                    </span>
                    {getWeatherIcon(hour.weatherCode, "sm")}
                    <span className="text-sm font-bold">{hour.temp}°</span>
                    {hour.precipitationProb > 0 && (
                      <Badge 
                        variant={hasRain ? "destructive" : "secondary"} 
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        {hour.precipitationProb}%
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
