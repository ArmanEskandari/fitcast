import { useEffect, useMemo, useState } from 'react';
import { recommendOutfit } from '@/domain/recommendOutfit';
import type { Garment, WeatherState } from '@/domain/types';
import { usePrefs } from '@/store/usePrefs';
import { narrate } from './narrate';

interface NarrationResult {
  story: string;
  garments: Garment[];
  /** True once AI narration has replaced the rule-engine fallback. */
  aiGenerated: boolean;
}

/**
 * Outfit + story for a weather state. The rule-engine story shows immediately;
 * if the AI proxy responds, its narration replaces it. Garments always come
 * from the deterministic engine.
 */
export function useNarration(weather: WeatherState): NarrationResult {
  const outfit = useMemo(() => recommendOutfit(weather), [weather]);
  const language = usePrefs((s) => s.language);
  const [story, setStory] = useState(outfit.story);
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    setStory(outfit.story);
    setAiGenerated(false);

    let cancelled = false;
    narrate({ weather, outfit }, language).then((narration) => {
      if (!cancelled && narration) {
        setStory(narration.story);
        setAiGenerated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [weather, outfit, language]);

  return { story, garments: outfit.garments, aiGenerated };
}
