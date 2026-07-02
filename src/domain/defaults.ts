import type { WeatherState } from './types';

/**
 * Neutral clear-day weather used to render a pleasant scene before any real
 * data has loaded (and as a safe fallback).
 */
export const FALLBACK_WEATHER: WeatherState = {
  tempC: 18,
  feelsLikeC: 18,
  condition: 'clear',
  isDay: true,
  windKph: 8,
  precipMm: 0,
  humidity: 60,
  uvIndex: 4,
  location: { name: '—', lat: 0, lon: 0 },
};
