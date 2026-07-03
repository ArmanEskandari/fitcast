import { LANGUAGES, type Language, usePrefs } from '@/store/usePrefs';

/**
 * The language options list (a labelled section + one row per language with a
 * checkmark on the active one). Shared by the desktop popup and the mobile
 * sidebar. `onSelect` lets the container close itself after a pick.
 */
export const LanguageList = ({ onSelect }: { onSelect?: () => void }) => {
  const language = usePrefs((s) => s.language);
  const setLanguage = usePrefs((s) => s.setLanguage);

  return (
    <div className="menu-group" role="group" aria-label="Language">
      <div className="menu-section">Language</div>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="menuitemradio"
          aria-checked={l.code === language}
          className={`menu-item${l.code === language ? ' active' : ''}`}
          onClick={() => {
            setLanguage(l.code as Language);
            onSelect?.();
          }}
        >
          <span>{l.label}</span>
          {l.code === language && <span aria-hidden>✓</span>}
        </button>
      ))}
    </div>
  );
};
