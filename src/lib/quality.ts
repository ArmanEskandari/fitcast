/**
 * Coarse device performance tier, used to scale particle counts and pixel
 * ratio so mobile / low-power devices stay smooth.
 *
 * 1 = full desktop quality; 0.5 = reduced (touch or narrow viewport).
 */
export function getQualityScale(): number {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const small = window.innerWidth < 820;
  return coarse || small ? 0.5 : 1;
}

/** Max device pixel ratio to render at (uncapped retina is expensive). */
export const MAX_DPR = 1.75;
