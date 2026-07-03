import './ui.css';
import { useEffect, useRef, useState } from 'react';
import { useAppStore, useDisplayWeather } from '@/store/useAppStore';
import { LocationBar } from './LocationBar';
import { LanguagePicker } from './LanguagePicker';
import { Sidebar } from './Sidebar';
import { WeatherReadout } from './WeatherReadout';
import { ForecastTimeline } from './ForecastTimeline';
import { AdviceCard } from './AdviceCard';
import { Assistant } from './Assistant';
import { DevWeatherCycler } from './DevWeatherCycler';
import { useDrawerGesture } from './useDrawerGesture';
import { useKeyboardInset } from './useKeyboardInset';

const DEV = process.env.NODE_ENV !== 'production';

/**
 * DOM overlay layered above the 3D canvas: location search + current
 * temperature up top, and the storytelling advice card at the bottom.
 * Falls back to loading / error status when there's no weather yet.
 */
export const OverlayUI = () => {
  const { status, weather, error } = useAppStore();
  // Children render whatever segment is selected (live weather, or a forecast).
  const display = useDisplayWeather();
  // Mobile only: the bottom card opens as a compact peek (temp + garment chips)
  // and expands to full detail — swipe up/down or tap the handle — so it never
  // buries the scene. Ignored on desktop, where `.dock` is display:contents and
  // everything shows at once.
  const [expanded, setExpanded] = useState(false);
  const drag = useDrawerGesture(setExpanded, () => setExpanded((v) => !v));
  const dockRef = useRef<HTMLDivElement>(null);
  useKeyboardInset();

  // Collapse the expanded card when tapping anywhere outside it (mobile). The
  // effect only runs while expanded, which only happens on mobile (the handle
  // is hidden on desktop, where the card always shows everything).
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [expanded]);

  return (
    <div className="ui-root">
      <div className="topbar">
        <LocationBar />
        {/* Language chip on desktop; folded into the sidebar on mobile. */}
        <LanguagePicker />
        <Sidebar />
      </div>

      {/* Readout + advice. On desktop `.dock` is display:contents so each child
          stays corner-anchored; on mobile it's one card docked to the top. */}
      <div ref={dockRef} className={`dock${expanded ? ' dock-open' : ''}`}>
        {weather && (
          <button
            type="button"
            className="dock-handle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide forecast details' : 'Show forecast details'}
            {...drag}
          >
            <span className="dock-grip" aria-hidden />
          </button>
        )}

        {display && <WeatherReadout weather={display} />}

        <ForecastTimeline />

        {display ? (
          <AdviceCard weather={display} />
        ) : status === 'error' ? (
          <div className="status glass err">{error}</div>
        ) : status === 'loading' || status === 'locating' ? (
          <div className="status glass">
            <span className="spinner" />
            {status === 'locating' ? 'Finding you…' : 'Loading weather…'}
          </div>
        ) : null}
      </div>

      <Assistant />
      {DEV && <DevWeatherCycler />}
    </div>
  );
};
