import type { Condition, SceneDescriptor, WeatherState } from './types';

/** Wind speed (km/h) that maps to maximum camera sway. */
const MAX_SWAY_WIND = 60;

/** Sky gradient [top, bottom] per condition, split by day/night. */
const SKY: Record<Condition, { day: [string, string]; night: [string, string] }> = {
  clear: { day: ['#2f7fd6', '#a9d6f5'], night: ['#0a1026', '#1d2a4a'] },
  partlyCloudy: { day: ['#4a86c4', '#bcd6ea'], night: ['#111a30', '#26314e'] },
  cloudy: { day: ['#7d8a99', '#c1cad3'], night: ['#1a2130', '#2c3546'] },
  fog: { day: ['#aab2ba', '#d9dee2'], night: ['#232a33', '#3a424c'] },
  drizzle: { day: ['#5b6874', '#95a1ac'], night: ['#141b25', '#2a333e'] },
  rain: { day: ['#4a5560', '#7c8792'], night: ['#0f151d', '#232c36'] },
  snow: { day: ['#9fb0c0', '#e2ebf2'], night: ['#1c2530', '#38434f'] },
  thunder: { day: ['#2a3140', '#4a5262'], night: ['#0a0e16', '#1c2230'] },
};

/** Rough cloud puff counts per condition. */
const CLOUD_COUNT: Record<Condition, number> = {
  clear: 0,
  partlyCloudy: 3,
  cloudy: 8,
  fog: 4,
  drizzle: 9,
  rain: 11,
  snow: 8,
  thunder: 13,
};

/** Precipitation intensity ramps with measured precip (mm), capped at 1. */
function precipDensity(precipMm: number): number {
  return Math.min(precipMm / 5, 1);
}

/**
 * Map a WeatherState to a declarative SceneDescriptor the 3D layer renders.
 * Pure and testable — no React, no Three. See docs/PLAN.md §6.
 */
export function mapToScene(weather: WeatherState): SceneDescriptor {
  const { condition, isDay } = weather;
  const skyColors = isDay ? SKY[condition].day : SKY[condition].night;

  // Key light: bright warm sun by day, dim cool moon by night, dimmed further
  // as the sky thickens with cloud/precip.
  const overcast =
    condition === 'cloudy' ||
    condition === 'rain' ||
    condition === 'drizzle' ||
    condition === 'thunder' ||
    condition === 'fog';
  const baseIntensity = isDay ? 2.4 : 0.6;
  const light = {
    color: isDay ? '#fff4e0' : '#aec4e8',
    intensity: overcast ? baseIntensity * 0.45 : baseIntensity,
  };
  const ambientIntensity = isDay ? (overcast ? 0.5 : 0.35) : 0.15;

  const precipType =
    condition === 'rain' || condition === 'drizzle' || condition === 'thunder'
      ? 'rain'
      : condition === 'snow'
        ? 'snow'
        : 'none';
  // Drizzle reads as light rain even when the measured mm is ~0.
  const density =
    precipType === 'none'
      ? 0
      : condition === 'drizzle'
        ? Math.max(precipDensity(weather.precipMm), 0.25)
        : Math.max(precipDensity(weather.precipMm), 0.4);

  const fogDensity = condition === 'fog' ? 0.9 : condition === 'rain' ? 0.15 : 0;

  return {
    skyColors,
    light,
    ambientIntensity,
    cloudCount: CLOUD_COUNT[condition],
    precip: { type: precipType, density },
    fogDensity,
    lightning: condition === 'thunder',
    cameraSway: Math.min(weather.windKph / MAX_SWAY_WIND, 1),
  };
}
