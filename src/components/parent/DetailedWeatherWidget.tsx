import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Umbrella,
  AlertTriangle
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

interface DetailedWeatherWidgetProps {
  pickupTime?: string; // e.g., "17:00"
}

export function DetailedWeatherWidget({ pickupTime = "17:00" }: DetailedWeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  function getCurrentTime() {
    return new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
        for (let i = currentHour; i < 24 && hourlyForecast.length < 12; i++) {
          hourlyForecast.push({
            time: `${String(i).padStart(2, "0")}:00`,
            temp: Math.round(hourly.temperature_2m[i]),
            weatherCode: hourly.weather_code[i],
            precipitationProb: hourly.precipitation_probability[i] || 0,
          });
        }
        
        const weatherDescriptions: Record<number, string> = {
          0: "Céu limpo",
          1: "Principalmente limpo",
          2: "Parcialmente nublado",
          3: "Nublado",
          45: "Neblina",
          48: "Neblina com gelo",
          51: "Garoa leve",
          53: "Garoa moderada",
          55: "Garoa intensa",
          61: "Chuva leve",
          63: "Chuva moderada",
          65: "Chuva forte",
          71: "Neve leve",
          73: "Neve moderada",
          75: "Neve forte",
          80: "Pancadas leves",
          81: "Pancadas moderadas",
          82: "Pancadas fortes",
          95: "Tempestade",
          96: "Tempestade com granizo leve",
          99: "Tempestade com granizo forte",
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
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, []);

  const getWeatherIcon = (code: number, size: "sm" | "lg" = "lg") => {
    const sizeClass = size === "lg" ? "w-10 h-10" : "w-5 h-5";
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

  const getPickupHourWeather = () => {
    if (!weather || !pickupTime) return null;
    const pickupHour = parseInt(pickupTime.split(":")[0]);
    const forecast = weather.hourlyForecast.find(h => parseInt(h.time.split(":")[0]) === pickupHour);
    return forecast;
  };

  const pickupWeather = getPickupHourWeather();
  const willRainAtPickup = pickupWeather && (isRainyWeather(pickupWeather.weatherCode) || pickupWeather.precipitationProb > 50);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-pimpo-blue/10 to-primary/5">
        <CardContent className="p-4 flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="bg-gradient-to-br from-pimpo-blue/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Canoas, RS</p>
              <p className="text-2xl font-fredoka font-bold">{currentTime}</p>
              <p className="text-sm text-muted-foreground capitalize">{getCurrentDate()}</p>
            </div>
            <Cloud className="w-10 h-10 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-pimpo-blue/10 to-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sun className="w-4 h-4 text-pimpo-yellow" />
          Previsão do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Canoas, RS</p>
            <p className="text-3xl font-fredoka font-bold">{weather.temp}°C</p>
            <p className="text-sm text-muted-foreground">{weather.description}</p>
          </div>
          <div className="text-right">
            {getWeatherIcon(weather.weatherCode)}
            <p className="text-lg font-semibold mt-1">{currentTime}</p>
          </div>
        </div>

        {/* Weather Details */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Droplets className="w-3.5 h-3.5" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wind className="w-3.5 h-3.5" />
            <span>{weather.wind} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Sensação: {weather.feelsLike}°C</span>
          </div>
        </div>

        {/* Pickup Alert */}
        {willRainAtPickup && (
          <div className="flex items-center gap-2 p-3 bg-pimpo-yellow/10 border border-pimpo-yellow/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-pimpo-yellow shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-pimpo-yellow">
                <Umbrella className="w-4 h-4 inline mr-1" />
                Previsão de chuva às {pickupTime}!
              </p>
              <p className="text-xs text-muted-foreground">
                {pickupWeather?.precipitationProb}% de chance • Leve guarda-chuva
              </p>
            </div>
          </div>
        )}

        {/* Hourly Forecast */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Previsão hora a hora</p>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {weather.hourlyForecast.map((hour, i) => {
                const isPickupHour = hour.time === pickupTime || hour.time === `${pickupTime.split(":")[0]}:00`;
                const hasRain = isRainyWeather(hour.weatherCode) || hour.precipitationProb > 50;
                
                return (
                  <div 
                    key={i}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] ${
                      isPickupHour 
                        ? "bg-primary/10 border-2 border-primary" 
                        : "bg-muted/30"
                    }`}
                  >
                    <span className={`text-xs font-medium ${isPickupHour ? "text-primary" : ""}`}>
                      {hour.time}
                    </span>
                    {getWeatherIcon(hour.weatherCode, "sm")}
                    <span className="text-sm font-semibold">{hour.temp}°</span>
                    {hour.precipitationProb > 0 && (
                      <Badge 
                        variant={hasRain ? "destructive" : "secondary"} 
                        className="text-[10px] px-1 py-0"
                      >
                        <Droplets className="w-2.5 h-2.5 mr-0.5" />
                        {hour.precipitationProb}%
                      </Badge>
                    )}
                    {isPickupHour && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
                        Busca
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
