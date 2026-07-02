import { describe, expect, it } from 'vitest';
import { recommendOutfit } from '@/domain/recommendOutfit';
import { makeWeather } from './fixtures';

describe('recommendOutfit — temperature bands', () => {
  it('freezing (<0°C): full winter kit', () => {
    const { garments, vibe } = recommendOutfit(makeWeather({ feelsLikeC: -5 }));
    expect(garments).toEqual(
      expect.arrayContaining(['heavyCoat', 'scarf', 'gloves', 'hat', 'boots']),
    );
    expect(vibe).toBe('freezing');
  });

  it('cold (0–10°C): coat + long sleeve', () => {
    const { garments } = recommendOutfit(makeWeather({ feelsLikeC: 5 }));
    expect(garments).toEqual(['coat', 'longSleeve', 'pants', 'boots']);
  });

  it('mild (10–18°C): long sleeve + sneakers', () => {
    const { garments } = recommendOutfit(makeWeather({ feelsLikeC: 14 }));
    expect(garments).toEqual(['longSleeve', 'pants', 'sneakers']);
  });

  it('warm (18–25°C): t-shirt + pants', () => {
    const { garments } = recommendOutfit(makeWeather({ feelsLikeC: 21 }));
    expect(garments).toEqual(['tshirt', 'pants', 'sneakers']);
  });

  it('hot (>25°C) sunny day: light kit with sun protection', () => {
    const { garments, vibe } = recommendOutfit(
      makeWeather({ feelsLikeC: 30, uvIndex: 9, condition: 'clear', isDay: true }),
    );
    expect(garments).toEqual(['tshirt', 'shorts', 'sunhat', 'sunglasses', 'sneakers']);
    expect(vibe).toBe('sunny');
  });
});

describe('recommendOutfit — condition modifiers', () => {
  it('rain: raincoat + umbrella, boots instead of sneakers', () => {
    const { garments, vibe } = recommendOutfit(
      makeWeather({ feelsLikeC: 12, condition: 'rain', precipMm: 3, windKph: 10 }),
    );
    expect(garments).toContain('raincoat');
    expect(garments).toContain('umbrella');
    expect(garments).toContain('boots');
    expect(garments).not.toContain('sneakers');
    expect(vibe).toBe('rainy');
  });

  it('rain + high wind: no umbrella, adds a windproof coat', () => {
    const { garments } = recommendOutfit(
      makeWeather({ feelsLikeC: 12, condition: 'rain', precipMm: 3, windKph: 45 }),
    );
    expect(garments).not.toContain('umbrella');
    expect(garments).toContain('coat');
  });

  it('snow: boots, gloves and hat regardless', () => {
    const { garments } = recommendOutfit(makeWeather({ feelsLikeC: -2, condition: 'snow' }));
    expect(garments).toEqual(expect.arrayContaining(['boots', 'gloves', 'hat']));
  });

  it('high UV only forces sun protection during the day', () => {
    const day = recommendOutfit(makeWeather({ feelsLikeC: 26, uvIndex: 8, isDay: true }));
    expect(day.garments).toEqual(expect.arrayContaining(['sunhat', 'sunglasses']));

    const night = recommendOutfit(makeWeather({ feelsLikeC: 26, uvIndex: 8, isDay: false }));
    expect(night.garments).not.toContain('sunhat');
    expect(night.garments).not.toContain('sunglasses');
  });
});

describe('recommendOutfit — output shape', () => {
  it('returns garments in canonical order (raincoat before longSleeve)', () => {
    const { garments } = recommendOutfit(
      makeWeather({ feelsLikeC: 12, condition: 'rain', precipMm: 3 }),
    );
    expect(garments.indexOf('raincoat')).toBeLessThan(garments.indexOf('longSleeve'));
  });

  it('story mentions the location and temperature', () => {
    const { story } = recommendOutfit(
      makeWeather({ feelsLikeC: 8, location: { name: 'Kyoto', lat: 35, lon: 135 } }),
    );
    expect(story).toContain('Kyoto');
    expect(story).toContain('8°C');
  });
});
