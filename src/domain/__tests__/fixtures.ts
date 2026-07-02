import type { WeatherState } from '@/domain/types';

/** Build a WeatherState with sensible defaults; override just what a test needs. */
export function makeWeather(overrides: Partial<WeatherState> = {}): WeatherState {
  return {
    tempC: 15,
    feelsLikeC: 15,
    condition: 'clear',
    isDay: true,
    windKph: 5,
    precipMm: 0,
    humidity: 55,
    uvIndex: 2,
    location: { name: 'Testville', lat: 0, lon: 0 },
    ...overrides,
  };
}
