/** Default smoothing speed for scene transitions (higher = snappier). */
export const TRANSITION_SPEED = 3;

/**
 * Frame-rate-independent interpolation factor. Move a value toward its target
 * with `current += (target - current) * dampAlpha(delta)` each frame and the
 * result is stable regardless of frame rate.
 */
export function dampAlpha(delta: number, speed = TRANSITION_SPEED): number {
  return 1 - Math.exp(-speed * delta);
}
