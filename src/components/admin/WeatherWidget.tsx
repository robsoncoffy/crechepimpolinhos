import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useWeather, getWeatherIcon as getWeatherEmoji } from "@/hooks/useWeather";

export function WeatherWidget() {
  const { weather, loading, error } = useWeather();

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

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-pimpo-yellow" />;
    if (code === 2 || code === 3) return <Cloud className="w-8 h-8 text-muted-foreground" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-pimpo-blue" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-8 h-8 text-blue-200" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-8 h-8 text-pimpo-blue" />;
    if (code >= 95) return <CloudLightning className="w-8 h-8 text-pimpo-yellow" />;
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
            {getWeatherIcon(weather.weatherCode)}
            <p className="text-2xl font-bold mt-1">{weather.temperature}°C</p>
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
            <span>{weather.windSpeed} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Sensação: {weather.apparentTemperature}°C</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
