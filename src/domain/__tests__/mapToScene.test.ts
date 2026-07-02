import { describe, expect, it } from 'vitest';
import { mapToScene } from '@/domain/mapToScene';
import { makeWeather } from './fixtures';

describe('mapToScene — sky & light', () => {
  it('uses a day palette by day and a night palette by night', () => {
    const day = mapToScene(makeWeather({ condition: 'clear', isDay: true }));
    const night = mapToScene(makeWeather({ condition: 'clear', isDay: false }));
    expect(day.skyColors).not.toEqual(night.skyColors);
    // Night key light is dimmer than day.
    expect(night.light.intensity).toBeLessThan(day.light.intensity);
  });

  it('dims the key light under overcast conditions', () => {
    const clear = mapToScene(makeWeather({ condition: 'clear', isDay: true }));
    const cloudy = mapToScene(makeWeather({ condition: 'cloudy', isDay: true }));
    expect(cloudy.light.intensity).toBeLessThan(clear.light.intensity);
  });
});

describe('mapToScene — precipitation', () => {
  it('clear: no precipitation, no clouds, no lightning', () => {
    const s = mapToScene(makeWeather({ condition: 'clear' }));
    expect(s.precip).toEqual({ type: 'none', density: 0 });
    expect(s.cloudCount).toBe(0);
    expect(s.lightning).toBe(false);
  });

  it('rain: rain particles with density scaling on precip mm', () => {
    const light = mapToScene(makeWeather({ condition: 'rain', precipMm: 1 }));
    const heavy = mapToScene(makeWeather({ condition: 'rain', precipMm: 20 }));
    expect(light.precip.type).toBe('rain');
    expect(heavy.precip.density).toBe(1); // capped
    expect(heavy.precip.density).toBeGreaterThan(light.precip.density);
    expect(light.precip.density).toBeGreaterThanOrEqual(0.4); // rain floor
  });

  it('drizzle: light rain even at ~0 mm', () => {
    const s = mapToScene(makeWeather({ condition: 'drizzle', precipMm: 0 }));
    expect(s.precip.type).toBe('rain');
    expect(s.precip.density).toBeGreaterThanOrEqual(0.25);
  });

  it('snow: snow particles', () => {
    expect(mapToScene(makeWeather({ condition: 'snow' })).precip.type).toBe('snow');
  });

  it('fog: high fog density', () => {
    expect(mapToScene(makeWeather({ condition: 'fog' })).fogDensity).toBeGreaterThan(0.5);
  });

  it('thunder: lightning on, rain particles', () => {
    const s = mapToScene(makeWeather({ condition: 'thunder', precipMm: 5 }));
    expect(s.lightning).toBe(true);
    expect(s.precip.type).toBe('rain');
  });
});

describe('mapToScene — camera sway', () => {
  it('scales with wind and caps at 1', () => {
    expect(mapToScene(makeWeather({ windKph: 0 })).cameraSway).toBe(0);
    expect(mapToScene(makeWeather({ windKph: 30 })).cameraSway).toBeCloseTo(0.5);
    expect(mapToScene(makeWeather({ windKph: 120 })).cameraSway).toBe(1);
  });
});
