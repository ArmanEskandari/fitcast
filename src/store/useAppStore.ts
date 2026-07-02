import { create } from 'zustand';
import type { GeoLocation, WeatherState } from '@/domain/types';
import { fetchWeather } from '@/data/weatherService';
import { reverseGeocode, searchCities } from '@/data/geocode';
import { getCurrentPosition } from '@/data/geolocation';

export type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'error';

interface AppState {
  status: Status;
  weather: WeatherState | null;
  location: GeoLocation | null;
  error: string | null;

  /** Fetch weather for an already-resolved location. */
  loadByLocation: (location: GeoLocation) => Promise<void>;
  /** Geocode a place name (first match) then fetch its weather. */
  loadByCity: (query: string) => Promise<void>;
  /** Ask the browser for the current position, then fetch its weather. */
  loadMyLocation: () => Promise<void>;
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  weather: null,
  location: null,
  error: null,

  loadByLocation: async (location) => {
    set({ status: 'loading', error: null, location });
    try {
      const weather = await fetchWeather(location);
      set({ status: 'ready', weather });
    } catch (e) {
      set({ status: 'error', error: toMessage(e) });
    }
  },

  loadByCity: async (query) => {
    set({ status: 'loading', error: null });
    try {
      const [match] = await searchCities(query, 1);
      if (!match) {
        set({ status: 'error', error: `No place found for "${query}".` });
        return;
      }
      const weather = await fetchWeather(match);
      set({ status: 'ready', weather, location: match });
    } catch (e) {
      set({ status: 'error', error: toMessage(e) });
    }
  },

  loadMyLocation: async () => {
    set({ status: 'locating', error: null });
    try {
      const { lat, lon } = await getCurrentPosition();
      // Resolve a real, geocodable place name (falls back if reverse fails).
      const name = (await reverseGeocode(lat, lon)) ?? 'My location';
      const location: GeoLocation = { name, lat, lon };
      set({ status: 'loading', location });
      const weather = await fetchWeather(location);
      set({ status: 'ready', weather });
    } catch (e) {
      set({ status: 'error', error: toMessage(e) });
    }
  },
}));
