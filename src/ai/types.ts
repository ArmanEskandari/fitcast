import type { Outfit, WeatherState } from '@/domain/types';

/** In-character narration produced by an LLM (or null when unavailable). */
export interface Narration {
  story: string;
  vibe: Outfit['vibe'];
  emoji: string;
}

export interface NarrateInput {
  weather: WeatherState;
  outfit: Outfit;
}

/**
 * Provider-agnostic narration source. The default implementation talks to a
 * serverless proxy (see api/narrate.ts) so the API key never reaches the
 * client. Swapping providers is a matter of changing the proxy, not this
 * interface. See docs/PLAN.md §11.
 */
export interface LLMProvider {
  /** Returns narration, or null to signal the caller should fall back. */
  narrate(input: NarrateInput, signal?: AbortSignal): Promise<Narration | null>;
}
