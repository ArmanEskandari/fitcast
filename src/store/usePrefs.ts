import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'de' | 'fa' | 'fr' | 'tr';

/** Selectable response languages (label shown in its own script). */
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fa', label: 'فارسی' },
  { code: 'fr', label: 'Français' },
  { code: 'tr', label: 'Türkçe' },
];

interface PrefsState {
  /** Language the AI narration + assistant respond in. */
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * User preferences, persisted to localStorage so choices survive reloads.
 * Kept separate from useAppStore (which holds transient weather state we don't
 * want to persist).
 */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'fitcast-prefs' },
  ),
);
