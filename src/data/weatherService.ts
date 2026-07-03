import type { GeoLocation, WeatherState } from '@/domain/types';
import { normalizeWeather, type RawForecast } from '../domain/normalizeWeather.js';
import { createTtlCache } from './cache.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
].join(',');

/** Cache weather ~10 min per ~1km location bucket to avoid redundant fetches. */
const cache = createTtlCache<WeatherState>(10 * 60 * 1000);
const cacheKey = (loc: GeoLocation) => `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;

/** Fetch current weather for a location from Open-Meteo (no API key). */
export async function fetchWeather(
  location: GeoLocation,
  signal?: AbortSignal,
): Promise<WeatherState> {
  const cached = cache.get(cacheKey(location));
  if (cached) return { ...cached, location };

  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: CURRENT_FIELDS,
    daily: 'uv_index_max',
    timezone: 'auto',
    wind_speed_unit: 'kmh',
    forecast_days: '1',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);

  const raw = (await res.json()) as RawForecast;
  const weather = normalizeWeather(raw, location);
  cache.set(cacheKey(location), weather);
  return weather;
}
