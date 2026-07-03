import { describe, expect, it } from 'vitest';
import {
  conditionFromWmo,
  nearestHourIndex,
  normalizeHourly,
  normalizeWeather,
  type RawForecast,
} from '@/domain/normalizeWeather';
import type { Condition } from '@/domain/types';

describe('conditionFromWmo', () => {
  const cases: Array<[number, Condition]> = [
    [0, 'clear'],
    [1, 'partlyCloudy'],
    [2, 'partlyCloudy'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'drizzle'],
    [57, 'drizzle'],
    [61, 'rain'],
    [65, 'rain'],
    [80, 'rain'],
    [82, 'rain'],
    [71, 'snow'],
    [77, 'snow'],
    [85, 'snow'],
    [86, 'snow'],
    [95, 'thunder'],
    [96, 'thunder'],
    [99, 'thunder'],
  ];

  it.each(cases)('maps WMO %i → %s', (code, expected) => {
    expect(conditionFromWmo(code)).toBe(expected);
  });

  it('falls back to cloudy for unknown codes', () => {
    expect(conditionFromWmo(1234)).toBe('cloudy');
  });
});

describe('normalizeWeather', () => {
  const location = { name: 'Oslo', lat: 59.9, lon: 10.7 };

  const raw: RawForecast = {
    current: {
      temperature_2m: 3.2,
      apparent_temperature: -1.4,
      is_day: 0,
      precipitation: 0.6,
      relative_humidity_2m: 82,
      weather_code: 71,
      wind_speed_10m: 22,
    },
    daily: { uv_index_max: [1.1] },
  };

  it('maps all fields and derives condition + isDay', () => {
    expect(normalizeWeather(raw, location)).toEqual({
      tempC: 3.2,
      feelsLikeC: -1.4,
      condition: 'snow',
      isDay: false,
      windKph: 22,
      precipMm: 0.6,
      humidity: 82,
      uvIndex: 1.1,
      location,
    });
  });

  it('defaults uvIndex to 0 when daily data is missing', () => {
    const noDaily: RawForecast = { current: { ...raw.current, is_day: 1 } };
    const result = normalizeWeather(noDaily, location);
    expect(result.uvIndex).toBe(0);
    expect(result.isDay).toBe(true);
  });
});

describe('nearestHourIndex', () => {
  const times = ['2026-07-06T06:00', '2026-07-06T07:00', '2026-07-06T08:00', '2026-07-06T09:00'];

  it('finds the exact hour', () => {
    expect(nearestHourIndex(times, '2026-07-06T08:00')).toBe(2);
  });

  it('rounds to the closest hour', () => {
    expect(nearestHourIndex(times, '2026-07-06T08:40')).toBe(3);
    expect(nearestHourIndex(times, '2026-07-06T08:20')).toBe(2);
  });

  it('clamps to the ends of the range', () => {
    expect(nearestHourIndex(times, '2026-07-01T00:00')).toBe(0);
    expect(nearestHourIndex(times, '2026-07-20T00:00')).toBe(3);
  });

  it('returns null for empty times or an unparseable target', () => {
    expect(nearestHourIndex([], '2026-07-06T08:00')).toBeNull();
    expect(nearestHourIndex(times, 'not-a-date')).toBeNull();
  });
});

describe('normalizeHourly', () => {
  const location = { name: 'Bournemouth', lat: 50.72, lon: -1.88 };
  const hourly = {
    time: ['2026-07-06T07:00', '2026-07-06T08:00'],
    temperature_2m: [14, 16],
    apparent_temperature: [13, 15],
    is_day: [1, 1],
    precipitation: [0, 0.2],
    relative_humidity_2m: [80, 78],
    weather_code: [3, 61],
    wind_speed_10m: [10, 12],
    uv_index: [1, 2],
  };

  it('builds a WeatherState from the given hour', () => {
    expect(normalizeHourly(hourly, 1, location)).toEqual({
      tempC: 16,
      feelsLikeC: 15,
      condition: 'rain',
      isDay: true,
      windKph: 12,
      precipMm: 0.2,
      humidity: 78,
      uvIndex: 2,
      location,
    });
  });

  it('defaults uvIndex to 0 when hourly uv_index is absent', () => {
    const { uv_index: _omit, ...noUv } = hourly;
    expect(normalizeHourly(noUv, 0, location).uvIndex).toBe(0);
  });
});
