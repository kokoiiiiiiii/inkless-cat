export const STORAGE_KEY = 'inkless-cat-data';
export const THEME_KEY = 'inkless-cat-theme';
export const TEMPLATE_KEY = 'inkless-cat-template';
export const SECTIONS_KEY = 'inkless-cat-sections';
export const CUSTOM_TEMPLATES_KEY = 'inkless-cat-custom-templates';

export const RESUME_STORE_PERSIST_KEY = 'inkless-cat/resume-store';
export const UI_STORE_PERSIST_KEY = 'inkless-cat/ui-store';

export const LEGACY_KEYS = {
  data: 'resume-studio-data',
  theme: 'resume-studio-theme',
  template: 'resume-studio-template',
  sections: 'resume-studio-sections',
  customTemplates: 'resume-studio-custom-templates',
} as const;

export const isBrowser = Boolean(globalThis?.localStorage);

type LegacyValue = (typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS];

const memoryStorage = new Map<string, string>();

const readFromStorage = (key: string) => {
  if (!isBrowser) {
    return memoryStorage.get(key) ?? null;
  }
  return globalThis.localStorage.getItem(key);
};

const writeToStorage = (key: string, value: string) => {
  if (!isBrowser) {
    memoryStorage.set(key, value);
    return;
  }
  globalThis.localStorage.setItem(key, value);
};

const removeFromStorage = (key: string) => {
  if (!isBrowser) {
    memoryStorage.delete(key);
    return;
  }
  globalThis.localStorage.removeItem(key);
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
  writeToStorage(key, value);
};

export const writeStoredJson = (key: string, value: unknown) => {
  writeToStorage(key, JSON.stringify(value));
};

export const removeStoredValue = (key: string) => {
  removeFromStorage(key);
};
