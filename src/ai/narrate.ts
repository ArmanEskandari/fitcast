import { createTtlCache } from '@/data/cache';
import type { NarrateInput, Narration } from './types';

/** Cache narration ~30 min per weather bucket to stay well within API limits. */
const cache = createTtlCache<Narration>(30 * 60 * 1000);

/** Coalesce concurrent identical requests (e.g. React StrictMode's double
 *  effect invocation) so they share a single fetch instead of duplicating it. */
const inflight = new Map<string, Promise<Narration | null>>();

/** Bucket key: same condition + feels-like band + day/night + language reuses. */
function bucketKey({ weather }: NarrateInput, language: string): string {
  const band = Math.round(weather.feelsLikeC / 3);
  return `${weather.condition}:${band}:${weather.isDay ? 'day' : 'night'}:${language}`;
}

/**
 * Fetch AI narration from the serverless proxy. Returns null on any failure —
 * no proxy (local dev returns HTML, not JSON), no API key, network error, or a
 * malformed response — so callers transparently fall back to the rule engine.
 */
export async function narrate(input: NarrateInput, language: string): Promise<Narration | null> {
  const key = bucketKey(input, language);

  const cached = cache.get(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = (async (): Promise<Narration | null> => {
    try {
      const res = await fetch('/api/narrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ weather: input.weather, outfit: input.outfit, language }),
      });
      if (!res.ok) return null;
      // In dev there is no proxy — the dev server returns index.html (HTML).
      if (!res.headers.get('content-type')?.includes('application/json')) return null;

      const data = (await res.json()) as Partial<Narration>;
      if (!data.story || !data.vibe || !data.emoji) return null;

      const narration: Narration = {
        story: data.story,
        vibe: data.vibe,
        emoji: data.emoji,
      };
      cache.set(key, narration);
      return narration;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
