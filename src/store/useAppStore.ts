import { create } from 'zustand';
import { buildTimeline, type ForecastSegment } from '@/domain/forecastTimeline';
import type { GeoLocation, WeatherState } from '@/domain/types';
import { fetchTimeline, fetchWeather } from '@/data/weatherService';
import { reverseGeocode, searchCities } from '@/data/geocode';
import { getCurrentPosition } from '@/data/geolocation';

export type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'error';

interface AppState {
  status: Status;
  weather: WeatherState | null;
  location: GeoLocation | null;
  error: string | null;

  /**
   * Segmented next-12h forecast (empty until hydrated). Index 0 is always the
   * "Now" anchor; 1+ are parts of day. Selecting one previews it in the scene.
   */
  timeline: ForecastSegment[];
  activeSegment: number;
  setActiveSegment: (index: number) => void;

  /** Fetch weather for an already-resolved location. */
  loadByLocation: (location: GeoLocation) => Promise<void>;
  /** Geocode a place name (first match) then fetch its weather. */
  loadByCity: (query: string) => Promise<void>;
  /**
   * Ask the browser for the current position, then fetch its weather. If
   * geolocation is denied/unavailable and a `fallbackCity` is given, quietly
   * load that instead of surfacing an error (used for the initial load).
   */
  loadMyLocation: (fallbackCity?: string) => Promise<void>;
  /** Fetch + segment the upcoming hours for the current weather/location. */
  hydrateTimeline: (location: GeoLocation, weather: WeatherState) => Promise<void>;
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

/**
 * The weather currently on screen. Segment 0 ("Now") always resolves to the
 * live `weather`, so a refresh or the dev cycler is reflected immediately;
 * only forecast segments (1+) read from the timeline snapshot.
 */
export function selectDisplayWeather(s: AppState): WeatherState | null {
  if (s.activeSegment > 0) return s.timeline[s.activeSegment]?.weather ?? s.weather;
  return s.weather;
}

export const useDisplayWeather = (): WeatherState | null => useAppStore(selectDisplayWeather);

export const useAppStore = create<AppState>((set, get) => ({
  status: 'idle',
  weather: null,
  location: null,
  error: null,
  timeline: [],
  activeSegment: 0,

  setActiveSegment: (index) => set({ activeSegment: index }),

  hydrateTimeline: async (location, weather) => {
    try {
      const hours = await fetchTimeline(location);
      // Skip the current hour: segment 0 ("Now") already covers it.
      const timeline = buildTimeline(weather, hours.slice(1));
      // Ignore if the user has since navigated elsewhere.
      if (get().location === location) set({ timeline });
    } catch {
      // Non-fatal: the app works fine showing only current weather.
    }
  },

  loadByLocation: async (location) => {
    set({ status: 'loading', error: null, location, timeline: [], activeSegment: 0 });
    try {
      const weather = await fetchWeather(location);
      set({ status: 'ready', weather });
      void get().hydrateTimeline(location, weather);
    } catch (e) {
      set({ status: 'error', error: toMessage(e) });
    }
  },

  loadByCity: async (query) => {
    set({ status: 'loading', error: null, timeline: [], activeSegment: 0 });
    try {
      const [match] = await searchCities(query, 1);
      if (!match) {
        set({ status: 'error', error: `No place found for "${query}".` });
        return;
      }
      const weather = await fetchWeather(match);
      set({ status: 'ready', weather, location: match });
      void get().hydrateTimeline(match, weather);
    } catch (e) {
      set({ status: 'error', error: toMessage(e) });
    }
  },

  loadMyLocation: async (fallbackCity?: string) => {
    set({ status: 'locating', error: null, timeline: [], activeSegment: 0 });
    try {
      const { lat, lon } = await getCurrentPosition();
      // Resolve a real, geocodable place name (falls back if reverse fails).
      const name = (await reverseGeocode(lat, lon)) ?? 'My location';
      const location: GeoLocation = { name, lat, lon };
      set({ status: 'loading', location });
      const weather = await fetchWeather(location);
      set({ status: 'ready', weather });
      void get().hydrateTimeline(location, weather);
    } catch (e) {
      // Geolocation denied/unavailable is a normal outcome, not an error: on
      // the initial load we fall back to a default city rather than a red state.
      if (fallbackCity) {
        await get().loadByCity(fallbackCity);
        return;
      }
      set({ status: 'error', error: toMessage(e) });
    }
  },
}));
