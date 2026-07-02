import type { GeoLocation } from '@/domain/types';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Raw geocoding result fields we consume. */
interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/** Build a human-friendly label like "London, England, United Kingdom". */
function labelFor(r: GeocodeResult): string {
  return [r.name, r.admin1, r.country].filter(Boolean).join(', ');
}

/**
 * Search places by name via Open-Meteo geocoding (no API key).
 * Returns up to `count` matches; empty array when the query is blank or unmatched.
 */
export async function searchCities(
  query: string,
  count = 5,
  signal?: AbortSignal,
): Promise<GeoLocation[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    name: q,
    count: String(count),
    language: 'en',
    format: 'json',
  });

  const res = await fetch(`${GEOCODE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

  const data = (await res.json()) as { results?: GeocodeResult[] };
  return (data.results ?? []).map((r) => ({
    name: labelFor(r),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/**
 * Reverse-geocode coordinates to a human-friendly place name (no API key,
 * CORS-enabled). Used so browser geolocation yields a real, geocodable name
 * instead of the literal "My location". Returns null on any failure.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      localityLanguage: 'en',
    });
    const res = await fetch(`${REVERSE_URL}?${params}`, { signal });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const place = d.city || d.locality || d.principalSubdivision;
    const name = [place, d.countryName].filter(Boolean).join(', ');
    return name || null;
  } catch {
    return null;
  }
}
