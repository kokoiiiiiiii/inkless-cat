export const STORAGE_KEY = 'inkless-cat-data';
export const THEME_KEY = 'inkless-cat-theme';
export const TEMPLATE_KEY = 'inkless-cat-template';
export const SECTIONS_KEY = 'inkless-cat-sections';
export const CUSTOM_TEMPLATES_KEY = 'inkless-cat-custom-templates';

export const LEGACY_KEYS = {
  data: 'resume-studio-data',
  theme: 'resume-studio-theme',
  template: 'resume-studio-template',
  sections: 'resume-studio-sections',
  customTemplates: 'resume-studio-custom-templates',
} as const;

export const isBrowser = typeof globalThis !== 'undefined';

type LegacyValue = (typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS];

const readFromStorage = (key: string) => {
  if (!isBrowser) return null;
  return globalThis.localStorage.getItem(key);
};

export const getStoredValue = (key: string, legacyKey?: LegacyValue) => {
  const current = readFromStorage(key);
  if (current !== null) {
    return current;
  }
  return legacyKey ? readFromStorage(legacyKey) : null;
};

export const readStoredJson = <T>(key: string, legacyKey?: LegacyValue | null) => {
  const raw = getStoredValue(key, legacyKey ?? undefined);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeStoredString = (key: string, value: string) => {
  if (!isBrowser) return;
  globalThis.localStorage.setItem(key, value);
};

export const writeStoredJson = (key: string, value: unknown) => {
  if (!isBrowser) return;
  globalThis.localStorage.setItem(key, JSON.stringify(value));
};

export const removeStoredValue = (key: string) => {
  if (!isBrowser) return;
  globalThis.localStorage.removeItem(key);
};
