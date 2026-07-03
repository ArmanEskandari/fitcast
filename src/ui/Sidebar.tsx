import { useEffect, useState } from 'react';
import { LanguageList } from './LanguageList';

/**
 * Mobile-only hamburger that opens a slide-in sidebar drawer. Houses the
 * language selector (and has room for more settings later). Hidden on desktop,
 * where the language chip lives in the top bar.
 */
export const Sidebar = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="top-menu">
      <button
        type="button"
        className="menu-btn glass"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden>☰</span>
      </button>

      {open && (
        <>
          <div className="sidebar-scrim" onClick={() => setOpen(false)} />
          <aside className="sidebar glass" role="dialog" aria-label="Menu" aria-modal="true">
            <div className="sidebar-head">
              <span className="sidebar-title">Menu</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <LanguageList onSelect={() => setOpen(false)} />
          </aside>
        </>
      )}
    </div>
  );
};
