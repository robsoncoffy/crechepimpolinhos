import { useState, useEffect } from "react";
import { CANOAS_COORDINATES, weatherDescriptions } from "@/lib/constants";

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  description: string;
  windSpeed: number;
  weatherCode: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface UseWeatherResult {
  weather: WeatherData | null;
  hourlyForecast: HourlyForecast[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseWeatherOptions {
  includeHourly?: boolean;
}

export function useWeather(options: UseWeatherOptions = {}): UseWeatherResult {
  const { includeHourly = false } = options;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      const { lat, lon } = CANOAS_COORDINATES;
      
      let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`;
      
      if (includeHourly) {
        url += "&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=1";
      }

      const response = await fetch(url);

      if (!response.ok) throw new Error("Weather fetch failed");

      const data = await response.json();
      const current = data.current;

      const description = weatherDescriptions[current.weather_code] || "Desconhecido";

      setWeather({
        temperature: Math.round(current.temperature_2m),
        apparentTemperature: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        description,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
      });

      // Process hourly forecast if requested
      if (includeHourly && data.hourly) {
        const hourly = data.hourly;
        const now = new Date();
        const currentHour = now.getHours();

        const forecast: HourlyForecast[] = [];
        for (let i = currentHour; i < 24 && forecast.length < 12; i++) {
          forecast.push({
            time: `${String(i).padStart(2, "0")}:00`,
            temp: Math.round(hourly.temperature_2m[i]),
            weatherCode: hourly.weather_code[i],
            precipitationProbability: hourly.precipitation_probability[i],
          });
        }
        setHourlyForecast(forecast);
      }
    } catch (err) {
      console.error("Error fetching weather:", err);
      setError("Não foi possível carregar o clima");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [includeHourly]);

  return {
    weather,
    hourlyForecast,
    loading,
    error,
    refetch: fetchWeather,
  };
}

// Helper function to get weather icon based on code
export function getWeatherIcon(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 55) return "🌧️";
  if (code >= 61 && code <= 65) return "🌧️";
  if (code >= 71 && code <= 75) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

// Helper to check if weather indicates rain
export function isRainy(code: number): boolean {
  return (
    (code >= 51 && code <= 55) ||
    (code >= 61 && code <= 65) ||
    (code >= 80 && code <= 82) ||
    code >= 95
  );
}
