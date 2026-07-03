import { useEffect, useMemo, useState } from 'react';
import type { Condition, WeatherState } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';

interface Variant {
  label: string;
  weather: WeatherState;
}

const PRETTY: Record<Condition, string> = {
  clear: 'Clear',
  partlyCloudy: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  thunder: 'Thunder',
};

interface Spec {
  c: Condition;
  temp: number;
  wind: number;
  precip: number;
  humidity: number;
  uvDay: number;
}

const SPECS: Spec[] = [
  { c: 'clear', temp: 24, wind: 8, precip: 0, humidity: 45, uvDay: 9 },
  { c: 'partlyCloudy', temp: 20, wind: 12, precip: 0, humidity: 55, uvDay: 5 },
  { c: 'cloudy', temp: 15, wind: 14, precip: 0, humidity: 65, uvDay: 2 },
  { c: 'fog', temp: 8, wind: 5, precip: 0, humidity: 95, uvDay: 1 },
  { c: 'drizzle', temp: 12, wind: 10, precip: 0.6, humidity: 88, uvDay: 1 },
  { c: 'rain', temp: 11, wind: 20, precip: 6, humidity: 90, uvDay: 1 },
  { c: 'snow', temp: -3, wind: 12, precip: 3, humidity: 85, uvDay: 1 },
  { c: 'thunder', temp: 16, wind: 24, precip: 10, humidity: 88, uvDay: 2 },
];

function buildVariants(): Variant[] {
  const out: Variant[] = [];
  for (const s of SPECS) {
    for (const isDay of [true, false]) {
      const label = `${PRETTY[s.c]} · ${isDay ? 'Day' : 'Night'}`;
      out.push({
        label,
        weather: {
          tempC: s.temp,
          feelsLikeC: s.temp - (s.wind > 18 ? 3 : 1) - (isDay ? 0 : 1),
          condition: s.c,
          isDay,
          windKph: s.wind,
          precipMm: s.precip,
          humidity: s.humidity,
          uvIndex: isDay ? s.uvDay : 0,
          location: { name: label, lat: 0, lon: 0 },
        },
      });
    }
  }
  return out;
}

const INTERVAL_MS = 2800;

/**
 * Dev-only weather cycler: preview every condition × day/night variant and
 * auto-loop through them for local testing. Rendered only outside production.
 */
export const DevWeatherCycler = () => {
  const variants = useMemo(buildVariants, []);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);

  // Apply the selected variant only once the tool is activated (so it doesn't
  // hijack the normal auto-loaded weather on page load).
  useEffect(() => {
    if (!active) return;
    useAppStore.setState({
      status: 'ready',
      weather: variants[index].weather,
      timeline: [],
      activeSegment: 0,
    });
  }, [index, active, variants]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % variants.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, variants.length]);

  const go = (i: number) => {
    setActive(true);
    setIndex(((i % variants.length) + variants.length) % variants.length);
  };

  return (
    <div className="dev-cycler">
      <div className="dev-bar glass">
        <span className="dev-tag">TEST</span>
        <button className="icon-btn" aria-label="Previous" onClick={() => go(index - 1)}>
          ◀
        </button>
        <button
          className="icon-btn"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => {
            setActive(true);
            setPlaying((p) => !p);
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button className="icon-btn" aria-label="Next" onClick={() => go(index + 1)}>
          ▶
        </button>
        <button className="dev-label" onClick={() => setOpen((o) => !o)}>
          {active ? variants[index].label : 'Weather variants'} ▾
        </button>
      </div>

      {open && (
        <div className="dev-grid glass">
          {variants.map((v, i) => (
            <button
              key={v.label}
              className={`dev-item ${active && i === index ? 'active' : ''}`}
              onClick={() => {
                go(i);
                setOpen(false);
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
