import { useNarration } from '@/ai/useNarration';
import type { WeatherState } from '@/domain/types';
import { GARMENT_DISPLAY } from './garmentDisplay';

/**
 * Storytelling advice card: the recommendation copy + garment chips. The story
 * comes from the rule engine and is upgraded to AI narration when the proxy is
 * available (see src/ai). Garments always come from the deterministic engine.
 */
export const AdviceCard = ({ weather }: { weather: WeatherState }) => {
  const { story, garments, aiGenerated } = useNarration(weather);

  return (
    <div className="advice glass">
      {/* The prose collapses away in the mobile peek (see .collapsible). */}
      <div className="collapsible">
        <div className="collapsible-body">
          <p className="story" dir="auto">
            {story}
            {aiGenerated && (
              <span className="ai-badge" title="Written by AI">
                ✦
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="chips">
        {garments.map((g) => {
          const d = GARMENT_DISPLAY[g];
          return (
            <span className="chip" key={g}>
              <span className="e" aria-hidden>
                {d.emoji}
              </span>
              {d.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
