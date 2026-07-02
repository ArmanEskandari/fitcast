import { LANGUAGES, type Language, usePrefs } from '@/store/usePrefs';

/** Compact glass language selector; drives the language of AI responses. */
export const LanguagePicker = () => {
  const language = usePrefs((s) => s.language);
  const setLanguage = usePrefs((s) => s.setLanguage);

  return (
    <label className="lang glass" title="Response language">
      <span aria-hidden>🌐</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        aria-label="Response language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
};
