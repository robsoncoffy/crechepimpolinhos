import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Loader2 } from "lucide-react";

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
  feels_like: number;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get current time in Canoas/RS timezone
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch weather for Canoas, RS using Open-Meteo (free, no API key needed)
    const fetchWeather = async () => {
      try {
        // Canoas, RS coordinates
        const lat = -29.9175;
        const lon = -51.1833;
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`
        );
        
        if (!response.ok) throw new Error("Weather fetch failed");
        
        const data = await response.json();
        const current = data.current;
        
        // Map weather codes to descriptions
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
          icon: String(current.weather_code),
          humidity: current.relative_humidity_2m,
          wind: Math.round(current.wind_speed_10m),
          feels_like: Math.round(current.apparent_temperature),
        });
      } catch (err) {
        console.error("Weather error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh weather every 30 minutes
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, []);

  const getWeatherIcon = (code: string) => {
    const numCode = parseInt(code);
    if (numCode === 0 || numCode === 1) return <Sun className="w-8 h-8 text-pimpo-yellow" />;
    if (numCode === 2 || numCode === 3) return <Cloud className="w-8 h-8 text-muted-foreground" />;
    if (numCode >= 51 && numCode <= 67) return <CloudRain className="w-8 h-8 text-pimpo-blue" />;
    if (numCode >= 71 && numCode <= 77) return <CloudSnow className="w-8 h-8 text-blue-200" />;
    if (numCode >= 80 && numCode <= 82) return <CloudRain className="w-8 h-8 text-pimpo-blue" />;
    if (numCode >= 95) return <CloudLightning className="w-8 h-8 text-pimpo-yellow" />;
    return <Cloud className="w-8 h-8 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-pimpo-blue/10 to-primary/5">
        <CardContent className="p-4 flex items-center justify-center h-32">
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
            <Cloud className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-pimpo-blue/10 to-primary/5 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Canoas, RS</p>
            <p className="text-3xl font-fredoka font-bold">{currentTime}</p>
            <p className="text-sm text-muted-foreground capitalize">{getCurrentDate()}</p>
          </div>
          <div className="text-right">
            {getWeatherIcon(weather.icon)}
            <p className="text-2xl font-bold mt-1">{weather.temp}°C</p>
            <p className="text-xs text-muted-foreground">{weather.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Droplets className="w-3.5 h-3.5" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wind className="w-3.5 h-3.5" />
            <span>{weather.wind} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Sensação: {weather.feels_like}°C</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
