import { useEffect } from 'react';

/**
 * Tracks the on-screen keyboard height via the VisualViewport API and writes it
 * to the `--kb` CSS variable on the document root. Bottom-anchored controls (the
 * mobile search row, the assistant sheet) add it to their offset so they lift
 * above the keyboard instead of hiding behind it. No-op where VisualViewport is
 * unavailable (older browsers, most desktops) — the variable falls back to 0.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    const update = () => {
      // Height of the viewport hidden by the keyboard at the bottom.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb', `${Math.round(inset)}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--kb');
    };
  }, []);
}
