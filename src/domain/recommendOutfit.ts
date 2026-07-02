import type { Garment, Outfit, Vibe, WeatherState } from './types';

/** Wind at/above this (km/h) is "blustery" enough to force an extra layer. */
const HIGH_WIND_KPH = 35;
/** UV at/above this warrants sun protection regardless of temperature. */
const HIGH_UV = 6;

/** Canonical output order so results are stable and easy to assert on. */
const GARMENT_ORDER: Garment[] = [
  'heavyCoat',
  'coat',
  'raincoat',
  'longSleeve',
  'tshirt',
  'pants',
  'shorts',
  'scarf',
  'gloves',
  'hat',
  'sunhat',
  'sunglasses',
  'umbrella',
  'boots',
  'sneakers',
];

function isWet(w: WeatherState): boolean {
  return w.condition === 'rain' || w.condition === 'drizzle' || w.condition === 'thunder';
}

/** Base layers driven purely by apparent temperature. */
function baseLayers(feelsLikeC: number): Garment[] {
  if (feelsLikeC < 0)
    return ['heavyCoat', 'longSleeve', 'pants', 'scarf', 'gloves', 'hat', 'boots'];
  if (feelsLikeC < 10) return ['coat', 'longSleeve', 'pants', 'boots'];
  if (feelsLikeC < 18) return ['longSleeve', 'pants', 'sneakers'];
  if (feelsLikeC < 25) return ['tshirt', 'pants', 'sneakers'];
  return ['tshirt', 'shorts', 'sneakers'];
}

function pickVibe(w: WeatherState): Vibe {
  if (w.condition === 'thunder') return 'stormy';
  if (w.condition === 'rain' || w.condition === 'drizzle') return 'rainy';
  if (w.feelsLikeC < 2) return 'freezing';
  if (
    w.feelsLikeC >= 24 &&
    (w.condition === 'clear' || w.condition === 'partlyCloudy') &&
    w.isDay
  ) {
    return 'sunny';
  }
  return 'cozy';
}

function conditionText(w: WeatherState): string {
  switch (w.condition) {
    case 'clear':
      return w.isDay ? 'clear skies' : 'a clear night';
    case 'partlyCloudy':
      return 'a few clouds';
    case 'cloudy':
      return 'overcast';
    case 'fog':
      return 'fog';
    case 'drizzle':
      return 'light drizzle';
    case 'rain':
      return 'rain';
    case 'snow':
      return 'snow';
    case 'thunder':
      return 'thunderstorms';
  }
}

function storyFor(w: WeatherState, vibe: Vibe): string {
  const temp = Math.round(w.feelsLikeC);
  const where = w.location.name;
  const cond = conditionText(w);
  const advice: Record<Vibe, string> = {
    freezing: 'bundle up head to toe and keep every bit of skin covered',
    cozy: 'layer up and you’ll be comfy out there',
    sunny: 'go light, but grab a hat and shades for the sun',
    rainy: 'take the umbrella and a raincoat — you’ll stay dry',
    stormy: 'stay covered and keep an umbrella handy if you head out',
  };
  return `Feels like ${temp}°C with ${cond} in ${where} — ${advice[vibe]}.`;
}

/**
 * Deterministic clothing recommendation from a WeatherState.
 * Pure and testable — no React, no I/O. See docs/PLAN.md §5.
 */
export function recommendOutfit(weather: WeatherState): Outfit {
  const items = new Set<Garment>(baseLayers(weather.feelsLikeC));

  // Wet weather: waterproofing + umbrella (umbrella is useless in high wind).
  if (isWet(weather)) {
    items.add('raincoat');
    items.add('boots');
    items.delete('sneakers');
    if (weather.windKph < HIGH_WIND_KPH) items.add('umbrella');
  }

  // Snow is cold and slippery regardless of the temperature band.
  if (weather.condition === 'snow') {
    items.add('boots');
    items.add('gloves');
    items.add('hat');
    items.delete('sneakers');
  }

  // Blustery: add a windproof layer if not already bundled up.
  if (weather.windKph >= HIGH_WIND_KPH && !items.has('heavyCoat')) {
    items.add('coat');
  }

  // Strong sun: force protection (only meaningful during the day).
  if (weather.uvIndex >= HIGH_UV && weather.isDay) {
    items.add('sunhat');
    items.add('sunglasses');
  }

  const vibe = pickVibe(weather);
  const garments = GARMENT_ORDER.filter((g) => items.has(g));

  return { garments, story: storyFor(weather, vibe), vibe };
}
