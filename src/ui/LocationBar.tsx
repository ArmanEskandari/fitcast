import { useEffect, useState } from 'react';
import { searchCities } from '@/data/geocode';
import type { GeoLocation } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';

/**
 * Glass search bar with live typeahead: as you type, matching places appear in
 * a dropdown (debounced Open-Meteo geocoding). Pick one to load its weather, or
 * hit the compass to use your location.
 */
export const LocationBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { status, location, loadByLocation, loadByCity, loadMyLocation } = useAppStore();
  const busy = status === 'loading' || status === 'locating';

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const matches = await searchCities(q, 6, controller.signal);
        setResults(matches);
        setOpen(matches.length > 0);
        setActive(-1);
      } catch {
        /* aborted or failed — ignore */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (loc: GeoLocation) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setActive(-1);
    void loadByLocation(loc);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && results[active]) return choose(results[active]);
    if (results[0]) return choose(results[0]);
    const q = query.trim();
    if (q) {
      setQuery('');
      setOpen(false);
      void loadByCity(q);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="location glass">
      <span className="pin" aria-hidden>
        📍
      </span>
      <form onSubmit={onSubmit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={location?.name ?? 'Search a city'}
          aria-label="Search a city"
          autoComplete="off"
        />
      </form>
      <button
        className="icon-btn"
        title="Use my location"
        aria-label="Use my location"
        onClick={() => void loadMyLocation()}
        disabled={busy}
      >
        {status === 'locating' ? <span className="spinner" /> : '🧭'}
      </button>

      {open && (
        <ul className="location-menu glass">
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lon}`}
              className={`location-item ${i === active ? 'active' : ''}`}
              // onMouseDown (not onClick) fires before input blur closes the menu.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span aria-hidden>📍</span> {r.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
