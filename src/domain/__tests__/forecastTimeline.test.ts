import { describe, expect, it } from 'vitest';
import { buildTimeline, conditionEmoji, type HourPoint } from '@/domain/forecastTimeline';
import type { Condition, WeatherState } from '@/domain/types';

const location = { name: 'Bournemouth', lat: 50.72, lon: -1.88 };

function weather(overrides: Partial<WeatherState> = {}): WeatherState {
  return {
    tempC: 18,
    feelsLikeC: 17,
    condition: 'clear',
    isDay: true,
    windKph: 8,
    precipMm: 0,
    humidity: 60,
    uvIndex: 3,
    location,
    ...overrides,
  };
}

/** Build a run of hourly points from a start hour with per-hour temps. */
function hours(startHour: number, temps: number[], cond: Condition = 'clear'): HourPoint[] {
  return temps.map((t, i) => {
    const hour = (startHour + i) % 24;
    const hh = String(hour).padStart(2, '0');
    return {
      time: `2026-07-06T${hh}:00`,
      hour,
      weather: weather({ tempC: t, condition: cond }),
    };
  });
}

describe('buildTimeline', () => {
  it('always starts with a Now anchor holding the live weather', () => {
    const now = weather({ tempC: 22 });
    const [first] = buildTimeline(now, []);
    expect(first.key).toBe('now');
    expect(first.label).toBe('Now');
    expect(first.weather).toBe(now);
  });

  it('segments a 2pm→2am window into afternoon, evening, night', () => {
    // Future hours 15:00..02:00 (afternoon 15-17, evening 18-21, night 22-02).
    const future = hours(15, [21, 20, 19, 18, 17, 16, 15, 15, 14, 14, 13, 13]);
    const segments = buildTimeline(weather({ tempC: 22 }), future);
    expect(segments.map((s) => s.label)).toEqual(['Now', 'Afternoon', 'Evening', 'Night']);
  });

  it('picks the hour nearest each part center as the representative', () => {
    // Afternoon center is 16:00; the 16:00 slot (temp 30) should represent it.
    const future = hours(15, [21, 30, 19, 18]); // 15,16,17 afternoon; 18 evening
    const [, afternoon] = buildTimeline(weather(), future);
    expect(afternoon.label).toBe('Afternoon');
    expect(afternoon.range).toEqual([15, 17]);
    expect(afternoon.time).toBe('2026-07-06T16:00');
    expect(afternoon.weather.tempC).toBe(30);
  });

  it('groups night hours across the midnight wrap into one segment', () => {
    const future = hours(22, [12, 11, 10, 9, 8]); // 22,23,00,01,02 all night
    const segments = buildTimeline(weather(), future);
    expect(segments.map((s) => s.label)).toEqual(['Now', 'Night']);
    expect(segments[1].range).toEqual([22, 2]);
  });
});

describe('conditionEmoji', () => {
  it('shows the moon for a clear night', () => {
    expect(conditionEmoji(weather({ condition: 'clear', isDay: false }))).toBe('🌙');
  });

  it('shows the sun for a clear day', () => {
    expect(conditionEmoji(weather({ condition: 'clear', isDay: true }))).toBe('☀️');
  });

  it('maps rain regardless of day/night', () => {
    expect(conditionEmoji(weather({ condition: 'rain', isDay: false }))).toBe('🌧️');
  });
});
