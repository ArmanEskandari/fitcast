/**
 * Core domain types for Fitcast.
 *
 * Pure data — no React, no Three. Everything the visual and AI layers consume
 * flows through these shapes. See docs/PLAN.md §4.
 */

/** Normalized weather condition, derived from WMO codes. */
export type Condition =
  'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface WeatherState {
  tempC: number;
  /** Apparent temperature — drives clothing more than raw temp. */
  feelsLikeC: number;
  condition: Condition;
  isDay: boolean;
  windKph: number;
  precipMm: number;
  /** Relative humidity, %. */
  humidity: number;
  uvIndex: number;
  location: GeoLocation;
}

/** A wearable item; each maps to a toggleable mesh on the mascot. */
export type Garment =
  | 'tshirt'
  | 'longSleeve'
  | 'coat'
  | 'heavyCoat'
  | 'raincoat'
  | 'scarf'
  | 'gloves'
  | 'hat'
  | 'sunhat'
  | 'sunglasses'
  | 'umbrella'
  | 'shorts'
  | 'pants'
  | 'boots'
  | 'sneakers';

export type Vibe = 'cozy' | 'sunny' | 'rainy' | 'freezing' | 'stormy';

export interface Outfit {
  garments: Garment[];
  /** Storytelling advice copy (rule-generated now, AI-generated in M9). */
  story: string;
  vibe: Vibe;
}

export type Precipitation = 'none' | 'rain' | 'snow';

/**
 * Declarative description of the 3D scene for a given WeatherState.
 * Produced by the pure `mapToScene`; consumed by the R3F layer (M3+).
 * See docs/PLAN.md §6.
 */
export interface SceneDescriptor {
  /** Vertical sky gradient, [top, bottom] as hex colors. */
  skyColors: [string, string];
  /** Key light (sun/moon): hex color + intensity. */
  light: { color: string; intensity: number };
  /** Ambient/fill light intensity. */
  ambientIntensity: number;
  /** Volumetric cloud puff count (0 = clear sky). */
  cloudCount: number;
  /** Precipitation particle system; density is 0..1. */
  precip: { type: Precipitation; density: number };
  /** Scene fog density, 0..1 (0 = none). */
  fogDensity: number;
  /** Whether lightning flashes play (thunderstorms). */
  lightning: boolean;
  /** Idle camera sway amount, 0..1 (scaled by wind). */
  cameraSway: number;
}
