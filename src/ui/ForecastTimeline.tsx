import { type CSSProperties, useEffect, useRef } from 'react';
import { conditionEmoji } from '@/domain/forecastTimeline';
import { useAppStore } from '@/store/useAppStore';

/** "2026-07-03T16:00" → "4 PM" (for the segment tooltip). */
function clockLabel(iso?: string): string {
  if (!iso) return '';
  const h = Number(iso.slice(11, 13));
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12} ${suffix}`;
}

/** A warm→cool accent color for the little temperature bar under each segment. */
function tempColor(t: number): string {
  if (t <= 0) return '#7ab8ff';
  if (t <= 8) return '#8fd3e8';
  if (t <= 16) return '#8fe0b0';
  if (t <= 23) return '#ffd36b';
  if (t <= 29) return '#ffab5c';
  return '#ff7a5c';
}

/**
 * Horizontal strip that lets the user step through the next ~12 hours by part
 * of day. Selecting a segment previews its weather across the whole scene and
 * advice card. Hidden until the forecast timeline has hydrated.
 */
export const ForecastTimeline = () => {
  const timeline = useAppStore((s) => s.timeline);
  const active = useAppStore((s) => s.activeSegment);
  const setActive = useAppStore((s) => s.setActiveSegment);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the selected segment in view within the horizontal strip. `block:
  // 'nearest'` avoids nudging the page/drawer vertically.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  if (timeline.length <= 1) return null;

  return (
    <div className="timeline glass" role="tablist" aria-label="Forecast by time of day">
      {timeline.map((seg, i) => {
        const selected = i === active;
        const when = i === 0 ? 'Now' : clockLabel(seg.time);
        const temp = Math.round(seg.weather.tempC);
        return (
          <button
            key={seg.key}
            ref={selected ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`tl-seg${selected ? ' active' : ''}`}
            style={{ '--seg-accent': tempColor(temp) } as CSSProperties}
            title={i === 0 ? 'Current conditions' : `${seg.label} · ${when} forecast`}
            onClick={() => setActive(i)}
          >
            <span className="tl-when">{seg.label}</span>
            <span className="tl-main">
              <span className="tl-cond" aria-hidden>
                {conditionEmoji(seg.weather)}
              </span>
              <span className="tl-temp">{temp}°</span>
            </span>
            <span className="tl-bar" aria-hidden />
          </button>
        );
      })}
    </div>
  );
};
