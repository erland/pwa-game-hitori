export type ErrorHighlightMode = 'off' | 'on-demand' | 'live';

export interface Settings {
  /** Live error highlighting behaviour. */
  errorHighlightMode: ErrorHighlightMode;
}

const STORAGE_KEY = 'hitori-settings-v1';

const DEFAULT_SETTINGS: Settings = {
  errorHighlightMode: 'live',
};

export function loadSettings(): Settings {
  // During tests or SSR there might not be a real window.
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<Settings>;

    // Merge with defaults so new fields get sensible values.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    // Corrupt JSON or storage issues – fall back to defaults.
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(next: Settings): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors (private mode, quota exceeded, etc.)
  }
}
