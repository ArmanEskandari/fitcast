import { useRef } from 'react';

const SWIPE = 24; // px of vertical travel past which a drag counts as a swipe
const TAP = 8; // px under which a release still counts as a tap

/**
 * Pointer gesture for the mobile drawer, which is anchored to the top of the
 * screen and grows downward. A vertical swipe sets the state directly (down →
 * expanded, up → collapsed); a tap toggles it. Spread the returned handlers onto
 * the grab handle. Keyboard activation (Enter/Space) still fires onClick.
 */
export function useDrawerGesture(
  setExpanded: (open: boolean) => void,
  toggle: () => void,
) {
  const startY = useRef<number | null>(null);
  const moved = useRef(false);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      startY.current = e.clientY;
      moved.current = false;
      // Capture so the drag keeps tracking even if the finger leaves the handle.
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (startY.current !== null && Math.abs(e.clientY - startY.current) > TAP) {
        moved.current = true;
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startY.current === null) return;
      const dy = e.clientY - startY.current; // downward swipe is positive
      startY.current = null;
      if (Math.abs(dy) >= SWIPE) setExpanded(dy > 0);
    },
    onClick: () => {
      // A drag synthesizes a trailing click — ignore it; honor taps + keyboard.
      if (moved.current) {
        moved.current = false;
        return;
      }
      toggle();
    },
  };
}
