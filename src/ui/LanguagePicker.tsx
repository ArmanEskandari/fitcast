import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/store/usePrefs';
import { LanguageList } from './LanguageList';

/**
 * Desktop language selector: a compact glass chip (globe + current code) that
 * opens the shared language popup. Hidden on mobile, where language lives in
 * the sidebar instead.
 */
export const LanguagePicker = () => {
  const language = usePrefs((s) => s.language);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="lang-btn glass"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Response language"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lang-globe" aria-hidden>
          🌐
        </span>
        <span className="lang-code">{language.toUpperCase()}</span>
      </button>

      {open && (
        <div className="menu-panel glass" role="menu">
          <LanguageList onSelect={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};
