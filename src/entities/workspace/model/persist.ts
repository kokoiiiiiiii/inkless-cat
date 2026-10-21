import { resolveInitialLocale } from '@shared/i18n/config';
import { MAX_CUSTOM_TEMPLATES } from '@shared/lib/limits';
import {
  getLocalStorage,
  getPersistedValueSizeBytes,
  isBrowser,
  MAX_PERSISTED_ITEM_SIZE_BYTES,
  RESUME_STORE_PERSIST_KEY,
  StorageIssueError,
  UI_STORE_PERSIST_KEY,
} from '@shared/lib/storage';
import { useFeedbackStore } from '@shared/ui/feedback';

import { migrateResume } from '../../resume/migrations/resume';
import { type ActiveSectionKey, sanitizeSections } from '../../resume/selectors';
import { DEFAULT_TEMPLATE_ID } from '../../template/lib/constants';
import { migrateTemplate } from '../../template/migrations/template';
import type { ResumeTemplate } from '../../template/types';
import { createDefaultWorkspace } from './defaults';

type ThemeMode = 'light' | 'dark';

type PersistedEnvelope = {
  state: unknown;
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
let legacyStorageMigrationBlocked = false;
const lastFeedbackByKind = new Map<string, number>();

export const reportPersistenceIssue = (error: StorageIssueError) => {
  const dedupeKey = error.kind;
  const now = Date.now();
  if (now - (lastFeedbackByKind.get(dedupeKey) ?? 0) < 5000) return;
  lastFeedbackByKind.set(dedupeKey, now);

  const english = resolveInitialLocale() === 'en';
  const messages = {
    unavailable: english
      ? 'Browser storage is unavailable. Your latest edits are only in this session; export your resume before leaving.'
      : '浏览器存储不可用，最新修改只保留在当前会话中；离开前请先导出简历。',
    read: english
      ? 'Saved data could not be read. The original data was kept; export or recover it before refreshing.'
      : '本地保存数据读取失败，原始数据已保留；刷新前请先导出或恢复数据。',
    write: english
      ? 'The latest edits could not be saved locally. Export your resume and check available browser storage.'
      : '最新修改未能保存到本地；请导出简历并检查浏览器存储空间。',
    remove: english
      ? 'Old local data could not be removed. Your current data remains available.'
      : '旧版本地数据未能清理，当前数据仍可使用。',
    'too-large': english
      ? 'Saved data exceeded the local safety limit and was not written over existing data. Remove large images or templates, then export.'
      : '本地保存数据超过安全上限，已有数据未被覆盖。请减少图片或模板后导出。',
    corrupt: english
      ? 'Some saved data failed validation. The original copy was kept where possible; export your available data before continuing.'
      : '部分本地数据未通过校验，原始副本已尽可能保留；继续编辑前请先导出可用数据。',
  } satisfies Record<StorageIssueError['kind'], string>;

  useFeedbackStore.getState().pushFeedback({
    tone: 'error',
    title: english ? 'Local data issue' : '本地数据异常',
    message: messages[error.kind],
    durationMs: 8000,
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const corruptDataError = (message: string, cause?: unknown) =>
  new StorageIssueError('corrupt', message, { cause });

const readRequiredJson = (raw: string, label: string): unknown => {
  if (getPersistedValueSizeBytes(raw) > MAX_PERSISTED_ITEM_SIZE_BYTES) {
    throw new StorageIssueError('too-large', `${label} data exceeds its size limit.`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw corruptDataError(`${label} data is not valid JSON.`, error);
  }
};

const parsePersistedEnvelope = (raw: string | null, label: string): PersistedEnvelope | null => {
  if (raw === null) return null;
  const parsed = readRequiredJson(raw, label);
  if (!isRecord(parsed) || !('state' in parsed)) {
    throw corruptDataError(`${label} persisted envelope is invalid.`);
  }
  const version = typeof parsed.version === 'number' ? parsed.version : 0;
  if (!Number.isInteger(version) || version < 0) {
    throw corruptDataError(`${label} persisted version is invalid.`);
  }
  return { state: parsed.state, version };
};

const normalizeCustomTemplates = (
  value: unknown,
  onInvalidTemplate?: (error: StorageIssueError) => void,
): ResumeTemplate[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_CUSTOM_TEMPLATES) {
    throw corruptDataError('Stored custom templates are invalid or exceed the allowed count.');
  }

  const normalized: ResumeTemplate[] = [];
  for (const template of value) {
    const result = migrateTemplate(template);
    if (result.ok) {
      if (isRecord(template) && typeof template.name === 'string' && !template.name.trim()) {
        onInvalidTemplate?.(
          corruptDataError(
            'A stored custom template had a blank name and was restored with a fallback.',
          ),
        );
      }
      normalized.push(result.value);
    } else {
      onInvalidTemplate?.(corruptDataError('One stored custom template could not be restored.'));
    }
  }
  return normalized;
};

export const sanitizePersistedResumeStoreState = (value: unknown): PersistedResumeStoreState => {
  if (!isRecord(value) || !('resume' in value)) {
    throw corruptDataError('Stored resume state is missing its resume document.');
  }

  const resumeResult = migrateResume(value.resume);
  if (!resumeResult.ok) {
    throw corruptDataError('Stored resume data failed schema validation.', resumeResult.error);
  }

  const activeSections = value.activeSections;
  if (activeSections !== undefined && !Array.isArray(activeSections)) {
    throw corruptDataError('Stored active section list is invalid.');
  }

  return {
    resume: resumeResult.value,
    activeSections: sanitizeSections(activeSections, resumeResult.value, {
      fallbackToDefaults: activeSections === undefined || activeSections.length > 0,
    }),
  };
};

export const sanitizePersistedUIStoreState = (
  value: unknown,
  onInvalidTemplate?: (error: StorageIssueError) => void,
): PersistedUIStoreState => {
  if (!isRecord(value)) {
    throw corruptDataError('Stored UI state is invalid.');
  }

  const defaults = createDefaultWorkspace();
  const templateId = typeof value.templateId === 'string' ? value.templateId.trim() : '';
  return {
    theme: value.theme === 'dark' ? 'dark' : defaults.theme,
    templateId: templateId || DEFAULT_TEMPLATE_ID,
    customTemplates: normalizeCustomTemplates(value.customTemplates, onInvalidTemplate),
  };
};

const createPersistedEnvelope = <T>(state: T, version: number) => ({ state, version });

const readLegacyResume = (storage: Storage, defaults: PersistedResumeStoreState) => {
  const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_KEYS.data);
  const resume =
    raw === null
      ? defaults.resume
      : (() => {
          const resumeResult = migrateResume(readRequiredJson(raw, 'Legacy resume'));
          if (!resumeResult.ok) {
            throw corruptDataError(
              'Legacy resume data failed schema validation.',
              resumeResult.error,
            );
          }
          return resumeResult.value;
        })();

  const sectionsRaw = storage.getItem(SECTIONS_KEY) ?? storage.getItem(LEGACY_KEYS.sections);
  let sections: unknown[] | undefined;
  if (sectionsRaw !== null) {
    const parsedSections = readRequiredJson(sectionsRaw, 'Legacy active sections');
    if (!Array.isArray(parsedSections)) {
      throw corruptDataError('Legacy active section list is invalid.');
    }
    sections = parsedSections;
  }

  return {
    resume,
    activeSections: sanitizeSections(sections, resume, {
      fallbackToDefaults: sections === undefined || sections.length > 0,
    }),
  };
};

const readLegacyUi = (
  storage: Storage,
  defaults: PersistedUIStoreState,
  onInvalidTemplate: (error: StorageIssueError) => void,
) => {
  const rawTemplates =
    storage.getItem(CUSTOM_TEMPLATES_KEY) ?? storage.getItem(LEGACY_KEYS.customTemplates);
  const customTemplates =
    rawTemplates === null
      ? []
      : normalizeCustomTemplates(
          readRequiredJson(rawTemplates, 'Legacy custom templates'),
          onInvalidTemplate,
        );
  const rawTheme = storage.getItem(THEME_KEY) ?? storage.getItem(LEGACY_KEYS.theme);
  const rawTemplateId =
    storage.getItem(TEMPLATE_KEY) ?? storage.getItem(LEGACY_KEYS.template) ?? defaults.templateId;

  return {
    theme: rawTheme === 'dark' ? 'dark' : defaults.theme,
    templateId: rawTemplateId.trim() || DEFAULT_TEMPLATE_ID,
    customTemplates,
  } satisfies PersistedUIStoreState;
};

export const ensureLegacyStorageMigration = (
  onIssue: (error: StorageIssueError) => void = () => {},
): boolean => {
  if (!isBrowser) return true;
  if (legacyStorageMigrationComplete) return !legacyStorageMigrationBlocked;
  if (legacyStorageMigrationBlocked) return false;

  const storage = getLocalStorage();
  if (!storage) {
    legacyStorageMigrationBlocked = true;
    onIssue(new StorageIssueError('unavailable', 'Browser storage is unavailable.'));
    return false;
  }

  try {
    const hasLegacyData = LEGACY_STORAGE_KEYS.some((key) => storage.getItem(key) !== null);
    if (!hasLegacyData) {
      legacyStorageMigrationComplete = true;
      return true;
    }

    const defaults = createDefaultWorkspace();
    const currentResumeRaw = storage.getItem(RESUME_STORE_PERSIST_KEY);
    const currentUIRaw = storage.getItem(UI_STORE_PERSIST_KEY);
    const currentResumeEnvelope = parsePersistedEnvelope(currentResumeRaw, 'Resume store');
    const currentUIEnvelope = parsePersistedEnvelope(currentUIRaw, 'UI store');

    const resume = currentResumeEnvelope
      ? sanitizePersistedResumeStoreState(currentResumeEnvelope.state)
      : readLegacyResume(storage, {
          resume: defaults.resume,
          activeSections: defaults.activeSections,
        });

    let hadInvalidTemplate = false;
    const reportInvalidTemplate = (error: StorageIssueError) => {
      hadInvalidTemplate = true;
      onIssue(error);
    };
    const ui = currentUIEnvelope
      ? sanitizePersistedUIStoreState(currentUIEnvelope.state, reportInvalidTemplate)
      : readLegacyUi(
          storage,
          {
            theme: defaults.theme,
            templateId: defaults.templateId,
            customTemplates: defaults.customTemplates,
          },
          reportInvalidTemplate,
        );

    if (hadInvalidTemplate) {
      const source =
        currentUIRaw ??
        storage.getItem(CUSTOM_TEMPLATES_KEY) ??
        storage.getItem(LEGACY_KEYS.customTemplates);
      if (source !== null && storage.getItem(`${UI_STORE_PERSIST_KEY}/recovery`) === null) {
        storage.setItem(`${UI_STORE_PERSIST_KEY}/recovery`, source);
      }
    }

    storage.setItem(
      RESUME_STORE_PERSIST_KEY,
      JSON.stringify(createPersistedEnvelope(resume, RESUME_STORE_PERSIST_VERSION)),
    );
    storage.setItem(
      UI_STORE_PERSIST_KEY,
      JSON.stringify(createPersistedEnvelope(ui, UI_STORE_PERSIST_VERSION)),
    );
    for (const key of LEGACY_STORAGE_KEYS) {
      storage.removeItem(key);
    }

    legacyStorageMigrationComplete = true;
    return true;
  } catch (error) {
    legacyStorageMigrationBlocked = true;
    onIssue(
      error instanceof StorageIssueError
        ? error
        : new StorageIssueError('corrupt', 'Legacy storage migration failed.', { cause: error }),
    );
    return false;
  }
};

export const resetLegacyStorageMigrationForTests = () => {
  legacyStorageMigrationComplete = false;
  legacyStorageMigrationBlocked = false;
};
