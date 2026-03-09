import { isBrowser, RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';

import { migrateResume } from '../../resume/migrations/resume';
import { type ActiveSectionKey, sanitizeSections } from '../../resume/selectors';
import { DEFAULT_TEMPLATE_ID } from '../../template/lib/templates';
import { migrateTemplate } from '../../template/migrations/template';
import type { ResumeTemplate } from '../../template/types';
import { createDefaultWorkspace } from './defaults';

type ThemeMode = 'light' | 'dark';

type PersistedEnvelope<T> = {
  state: T;
  version: number;
};

const STORAGE_KEY = 'inkless-cat-data';
const THEME_KEY = 'inkless-cat-theme';
const TEMPLATE_KEY = 'inkless-cat-template';
const SECTIONS_KEY = 'inkless-cat-sections';
const CUSTOM_TEMPLATES_KEY = 'inkless-cat-custom-templates';

const LEGACY_KEYS = {
  data: 'resume-studio-data',
  theme: 'resume-studio-theme',
  template: 'resume-studio-template',
  sections: 'resume-studio-sections',
  customTemplates: 'resume-studio-custom-templates',
} as const;

export type PersistedResumeStoreState = {
  resume: ReturnType<typeof createDefaultWorkspace>['resume'];
  activeSections: ActiveSectionKey[];
};

export type PersistedUIStoreState = {
  theme: ThemeMode;
  templateId: string;
  customTemplates: ResumeTemplate[];
};

export const RESUME_STORE_PERSIST_VERSION = 1;
export const UI_STORE_PERSIST_VERSION = 1;

const LEGACY_STORAGE_KEYS = [
  STORAGE_KEY,
  THEME_KEY,
  TEMPLATE_KEY,
  SECTIONS_KEY,
  CUSTOM_TEMPLATES_KEY,
  LEGACY_KEYS.data,
  LEGACY_KEYS.theme,
  LEGACY_KEYS.template,
  LEGACY_KEYS.sections,
  LEGACY_KEYS.customTemplates,
] as const;

let legacyStorageMigrationComplete = false;
const migrationStorage = new Map<string, string>();

const readMigrationStorage = (key: string) => {
  if (!isBrowser) {
    return migrationStorage.get(key) ?? null;
  }

  return globalThis.localStorage.getItem(key);
};

const writeMigrationStorage = (key: string, value: string) => {
  if (!isBrowser) {
    migrationStorage.set(key, value);
    return;
  }

  globalThis.localStorage.setItem(key, value);
};

const clearMigrationStorage = (keys: readonly string[]) => {
  for (const key of keys) {
    if (!isBrowser) {
      migrationStorage.delete(key);
      continue;
    }

    globalThis.localStorage.removeItem(key);
  }
};

const parsePersistedEnvelope = <T>(raw: string | null): PersistedEnvelope<T> | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedEnvelope<T>;
    if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const parseJsonValue = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const sanitizeCustomTemplates = (value: unknown): ResumeTemplate[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: ResumeTemplate[] = [];
  for (const template of value) {
    const result = migrateTemplate(template);
    if (result.ok) {
      normalized.push(result.value);
    }
  }
  return normalized;
};

const parseLegacySections = (raw: string, fallback: ActiveSectionKey[]): ActiveSectionKey[] => {
  const parsed = parseJsonValue(raw);
  return Array.isArray(parsed) ? (parsed as ActiveSectionKey[]) : fallback;
};

export const sanitizePersistedResumeStoreState = (value: unknown): PersistedResumeStoreState => {
  const defaults = createDefaultWorkspace();
  const candidate =
    value && typeof value === 'object' ? (value as Partial<PersistedResumeStoreState>) : {};
  const resumeResult = migrateResume(candidate.resume);
  const resume = resumeResult.ok ? resumeResult.value : defaults.resume;

  return {
    resume,
    activeSections: sanitizeSections(candidate.activeSections, resume, {
      fallbackToDefaults: true,
    }),
  };
};

export const sanitizePersistedUIStoreState = (value: unknown): PersistedUIStoreState => {
  const defaults = createDefaultWorkspace();
  const candidate =
    value && typeof value === 'object' ? (value as Partial<PersistedUIStoreState>) : {};

  return {
    theme: candidate.theme === 'dark' ? 'dark' : defaults.theme,
    templateId: candidate.templateId?.trim() || defaults.templateId,
    customTemplates: sanitizeCustomTemplates(candidate.customTemplates),
  };
};

const createPersistedEnvelope = <T>(state: T, version: number): PersistedEnvelope<T> => ({
  state,
  version,
});

export const ensureLegacyStorageMigration = () => {
  if (!isBrowser || legacyStorageMigrationComplete) {
    return;
  }

  legacyStorageMigrationComplete = true;

  const hasLegacyData = LEGACY_STORAGE_KEYS.some((key) => readMigrationStorage(key) !== null);
  if (!hasLegacyData) {
    return;
  }

  const currentResumeEnvelope = parsePersistedEnvelope<PersistedResumeStoreState>(
    readMigrationStorage(RESUME_STORE_PERSIST_KEY),
  );
  const currentUiEnvelope = parsePersistedEnvelope<PersistedUIStoreState>(
    readMigrationStorage(UI_STORE_PERSIST_KEY),
  );

  const defaults = createDefaultWorkspace();

  const legacyResumeResult = migrateResume(
    (() => {
      const raw = readMigrationStorage(STORAGE_KEY) ?? readMigrationStorage(LEGACY_KEYS.data);
      if (!raw) {
        return defaults.resume;
      }
      return parseJsonValue(raw) ?? defaults.resume;
    })(),
  );

  const resume = currentResumeEnvelope?.state
    ? sanitizePersistedResumeStoreState(currentResumeEnvelope.state)
    : {
        resume: legacyResumeResult.ok ? legacyResumeResult.value : defaults.resume,
        activeSections: sanitizeSections(
          (() => {
            const raw =
              readMigrationStorage(SECTIONS_KEY) ?? readMigrationStorage(LEGACY_KEYS.sections);
            if (!raw) {
              return defaults.activeSections;
            }
            return parseLegacySections(raw, defaults.activeSections);
          })(),
          legacyResumeResult.ok ? legacyResumeResult.value : defaults.resume,
          { fallbackToDefaults: true },
        ),
      };

  const ui = currentUiEnvelope?.state
    ? sanitizePersistedUIStoreState(currentUiEnvelope.state)
    : {
        theme:
          (readMigrationStorage(THEME_KEY) ?? readMigrationStorage(LEGACY_KEYS.theme)) === 'dark'
            ? 'dark'
            : defaults.theme,
        templateId:
          (
            readMigrationStorage(TEMPLATE_KEY) ??
            readMigrationStorage(LEGACY_KEYS.template) ??
            defaults.templateId
          ).trim?.() || DEFAULT_TEMPLATE_ID,
        customTemplates: sanitizeCustomTemplates(
          (() => {
            const raw =
              readMigrationStorage(CUSTOM_TEMPLATES_KEY) ??
              readMigrationStorage(LEGACY_KEYS.customTemplates);
            if (!raw) {
              return [];
            }
            return parseJsonValue(raw) ?? [];
          })(),
        ),
      };

  writeMigrationStorage(
    RESUME_STORE_PERSIST_KEY,
    JSON.stringify(createPersistedEnvelope(resume, RESUME_STORE_PERSIST_VERSION)),
  );
  writeMigrationStorage(
    UI_STORE_PERSIST_KEY,
    JSON.stringify(createPersistedEnvelope(ui, UI_STORE_PERSIST_VERSION)),
  );
  clearMigrationStorage(LEGACY_STORAGE_KEYS);
};

export const resetLegacyStorageMigrationForTests = () => {
  legacyStorageMigrationComplete = false;
};
