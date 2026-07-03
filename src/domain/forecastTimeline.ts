import type { Condition, WeatherState } from './types';

/** One hour of forecast: its local time, local hour (0-23), and weather. */
export interface HourPoint {
  /** Local wall-clock, e.g. "2026-07-03T16:00". */
  time: string;
  /** Local hour 0-23. */
  hour: number;
  weather: WeatherState;
}

/** A selectable slice of the timeline: "Now" plus each part-of-day it spans. */
export interface ForecastSegment {
  /** Stable, unique key (part id + start time, or 'now'). */
  key: string;
  label: string;
  emoji: string;
  /** Weather that drives the scene/advice when this segment is selected. */
  weather: WeatherState;
  /** Local hour range covered by the part, [startHour, endHour]. Absent for 'now'. */
  range?: [number, number];
  /** Representative local time, e.g. "2026-07-03T16:00". Absent for 'now'. */
  time?: string;
}

interface PartDef {
  id: string;
  label: string;
  emoji: string;
  /** Local-hour window [start, end); `night` wraps past midnight. */
  start: number;
  end: number;
  /** Hour used to choose the part's representative slot. */
  center: number;
}

/** Parts of day, coarse by design — the next 12h usually spans 3-4 of them. */
const PARTS: PartDef[] = [
  { id: 'morning', label: 'Morning', emoji: '🌅', start: 5, end: 11, center: 8 },
  { id: 'midday', label: 'Midday', emoji: '☀️', start: 11, end: 14, center: 12 },
  { id: 'afternoon', label: 'Afternoon', emoji: '🌤️', start: 14, end: 18, center: 16 },
  { id: 'evening', label: 'Evening', emoji: '🌆', start: 18, end: 22, center: 20 },
  { id: 'night', label: 'Night', emoji: '🌙', start: 22, end: 5, center: 1 },
];

/** Which part a local hour falls into (night is the wrap-around fallback). */
function partFor(hour: number): PartDef {
  for (const p of PARTS) {
    if (p.id !== 'night' && hour >= p.start && hour < p.end) return p;
  }
  return PARTS[PARTS.length - 1];
}

/** Circular hour distance, so night (center 1) sees 23:00 as 2h away, not 22h. */
function hourDistance(hour: number, center: number): number {
  const d = Math.abs(hour - center);
  return Math.min(d, 24 - d);
}

/** The hour in a part-run closest to that part's center. */
function representative(group: HourPoint[], part: PartDef): HourPoint {
  let best = group[0];
  let bestDist = Infinity;
  for (const point of group) {
    const dist = hourDistance(point.hour, part.center);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }
  return best;
}

const CONDITION_EMOJI: Record<Condition, string> = {
  clear: '☀️',
  partlyCloudy: '⛅',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '❄️',
  thunder: '⛈️',
};

/** Weather-condition glyph (clear falls back to the moon at night). */
export function conditionEmoji(w: WeatherState): string {
  if (w.condition === 'clear' && !w.isDay) return '🌙';
  return CONDITION_EMOJI[w.condition];
}

/**
 * Build the segmented timeline: a "Now" anchor (live weather) followed by each
 * part-of-day the upcoming `hours` span, each represented by its central hour.
 * Pure — no I/O. `hours` should already be the future hours (excluding now).
 */
export function buildTimeline(now: WeatherState, hours: HourPoint[]): ForecastSegment[] {
  const segments: ForecastSegment[] = [
    { key: 'now', label: 'Now', emoji: conditionEmoji(now), weather: now },
  ];

  let i = 0;
  while (i < hours.length) {
    const part = partFor(hours[i].hour);
    const group: HourPoint[] = [];
    while (i < hours.length && partFor(hours[i].hour).id === part.id) {
      group.push(hours[i]);
      i += 1;
    }
    const rep = representative(group, part);
    segments.push({
      key: `${part.id}@${group[0].time}`,
      label: part.label,
      emoji: part.emoji,
      weather: rep.weather,
      range: [group[0].hour, group[group.length - 1].hour],
      time: rep.time,
    });
  }

  return segments;
}
