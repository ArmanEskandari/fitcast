import type { HourPoint } from '@/domain/forecastTimeline';
import type { GeoLocation, WeatherState } from '@/domain/types';
import {
  nearestHourIndex,
  normalizeHourly,
  normalizeWeather,
  type RawForecast,
} from '../domain/normalizeWeather.js';
import { createTtlCache } from './cache.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const WEATHER_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
];
const CURRENT_FIELDS = WEATHER_FIELDS.join(',');
const HOURLY_FIELDS = [...WEATHER_FIELDS, 'uv_index'].join(',');

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

export interface ForecastAt {
  weather: WeatherState;
  /** Local wall-clock hour actually used, e.g. "2026-07-06T08:00". */
  resolvedTime: string;
  /** Signed hours between the resolved slot and the requested time (0 = exact). */
  offsetHours: number;
}

/**
 * Fetch the hourly forecast (up to ~14 days out) and return conditions at the
 * hour nearest `targetLocalIso` — a local wall-clock time like
 * "2026-07-06T08:00". Returns null if the target is outside the forecast range
 * or unparseable. Not cached: forecast queries are one-off and time-specific.
 */
export async function fetchForecastAt(
  location: GeoLocation,
  targetLocalIso: string,
  signal?: AbortSignal,
): Promise<ForecastAt | null> {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    hourly: HOURLY_FIELDS,
    timezone: 'auto',
    wind_speed_unit: 'kmh',
    forecast_days: '14',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Forecast fetch failed (${res.status})`);

  const raw = (await res.json()) as RawForecast;
  const hourly = raw.hourly;
  if (!hourly?.time?.length) return null;

  const targetMs = Date.parse(
    targetLocalIso.length === 16 ? `${targetLocalIso}:00` : targetLocalIso,
  );
  if (Number.isNaN(targetMs)) return null;

  // Reject times outside the returned window (with a 1h margin) rather than
  // clamping to an endpoint — a request 60 days out is not a real forecast.
  const first = Date.parse(`${hourly.time[0]}:00`.slice(0, 19));
  const last = Date.parse(`${hourly.time[hourly.time.length - 1]}:00`.slice(0, 19));
  const hourMs = 3_600_000;
  if (targetMs < first - hourMs || targetMs > last + hourMs) return null;

  const index = nearestHourIndex(hourly.time, targetLocalIso);
  if (index == null) return null;

  const resolvedTime = hourly.time[index];
  const offsetHours = Math.round((Date.parse(`${resolvedTime}:00`.slice(0, 19)) - targetMs) / hourMs);

  return { weather: normalizeHourly(hourly, index, location), resolvedTime, offsetHours };
}

/**
 * Fetch the upcoming hours as a timeline, starting from the current local hour.
 * Returns `hoursAhead` points (default 13, i.e. now + 12 hours) for the
 * forecast strip. Empty array if hourly data is unavailable.
 */
export async function fetchTimeline(
  location: GeoLocation,
  hoursAhead = 13,
  signal?: AbortSignal,
): Promise<HourPoint[]> {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    // `current` is requested only to learn the location's current local hour.
    current: 'temperature_2m',
    hourly: HOURLY_FIELDS,
    timezone: 'auto',
    wind_speed_unit: 'kmh',
    forecast_days: '2',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Timeline fetch failed (${res.status})`);

  const raw = (await res.json()) as RawForecast & { current?: { time?: string } };
  const hourly = raw.hourly;
  if (!hourly?.time?.length) return [];

  // Match the current hour ("YYYY-MM-DDTHH") to find where "now" sits.
  const nowKey = raw.current?.time?.slice(0, 13);
  const start = nowKey ? Math.max(0, hourly.time.findIndex((t) => t.slice(0, 13) === nowKey)) : 0;

  const points: HourPoint[] = [];
  for (let i = start; i < hourly.time.length && points.length < hoursAhead; i++) {
    points.push({
      time: hourly.time[i],
      hour: Number(hourly.time[i].slice(11, 13)),
      weather: normalizeHourly(hourly, i, location),
    });
  }
  return points;
}
