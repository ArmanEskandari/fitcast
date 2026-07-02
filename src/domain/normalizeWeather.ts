import type { Condition, GeoLocation, WeatherState } from './types';

/**
 * The subset of the Open-Meteo forecast response we request.
 * See docs/PLAN.md §2 (Open-Meteo) and the `current`/`daily` fields in
 * data/weatherService.ts.
 */
export interface RawForecast {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    /** 1 = day, 0 = night. */
    is_day: number;
    precipitation: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    uv_index_max?: number[];
  };
}

/**
 * Map a WMO weather-interpretation code to our coarser {@link Condition}.
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes).
 */
export function conditionFromWmo(code: number): Condition {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partlyCloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle'; // incl. freezing drizzle
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95 && code <= 99) return 'thunder'; // 95, 96, 99
  return 'cloudy';
}

/** Transform a raw Open-Meteo response + resolved location into a WeatherState. */
export function normalizeWeather(raw: RawForecast, location: GeoLocation): WeatherState {
  const c = raw.current;
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    condition: conditionFromWmo(c.weather_code),
    isDay: c.is_day === 1,
    windKph: c.wind_speed_10m,
    precipMm: c.precipitation,
    humidity: c.relative_humidity_2m ?? 0,
    uvIndex: raw.daily?.uv_index_max?.[0] ?? 0,
    location,
  };
}
