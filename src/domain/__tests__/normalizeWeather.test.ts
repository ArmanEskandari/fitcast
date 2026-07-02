import { describe, expect, it } from 'vitest';
import { conditionFromWmo, normalizeWeather, type RawForecast } from '@/domain/normalizeWeather';
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
