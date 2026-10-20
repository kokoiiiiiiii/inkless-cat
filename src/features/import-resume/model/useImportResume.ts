import {
  type ActiveSectionKey,
  deriveSectionsFromResume,
  migrateResume,
  type ResumeData,
  useResumeStore,
} from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { useUIStore } from '@entities/ui';
import {
  migrateWorkspace,
  reportPersistenceIssue,
  RESUME_STORE_PERSIST_VERSION,
  UI_STORE_PERSIST_VERSION,
} from '@entities/workspace';
import { type AppError, createAppError } from '@shared/lib/errors';
import { MAX_IMPORT_JSON_BYTES } from '@shared/lib/limits';
import { err, isErr, ok, type Result } from '@shared/lib/result';
import {
  getLocalStorage,
  RESUME_STORE_PERSIST_KEY,
  StorageIssueError,
  UI_STORE_PERSIST_KEY,
} from '@shared/lib/storage';
import { useCallback } from 'react';

export type PreparedImport =
  | {
      kind: 'resume';
      resume: ResumeData;
      activeSections: ActiveSectionKey[];
    }
  | {
      kind: 'workspace';
      resume: ResumeData;
      activeSections: ActiveSectionKey[];
      theme: 'light' | 'dark';
      templateId: string;
      customTemplates: ResumeTemplate[];
    };

export type PreparedImportResult = Result<PreparedImport, AppError>;
export type ImportResult = Result<{ kind: PreparedImport['kind'] }, AppError>;

const isWorkspacePayload = (value: unknown): value is { resume: unknown } =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'resume' in value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
};

const persistedStateMatches = (
  storage: Storage,
  key: string,
  version: number,
  expectedState: unknown,
): boolean => {
  const raw = storage.getItem(key);
  if (!raw) return false;
  const parsed: unknown = JSON.parse(raw);
  return (
    isRecord(parsed) &&
    parsed.version === version &&
    JSON.stringify(canonicalize(parsed.state)) === JSON.stringify(canonicalize(expectedState))
  );
};

export const useImportResume = () => {
  const prepareImportFromObject = useCallback((payload: unknown): PreparedImportResult => {
    if (isWorkspacePayload(payload)) {
      const workspaceResult = migrateWorkspace(payload);
      if (isErr(workspaceResult)) return err(workspaceResult.error);

      return ok({
        kind: 'workspace',
        resume: workspaceResult.value.resume,
        activeSections: workspaceResult.value.activeSections,
        theme: workspaceResult.value.theme,
        templateId: workspaceResult.value.templateId,
        customTemplates: workspaceResult.value.customTemplates,
      });
    }

    const resumeResult = migrateResume(payload);
    if (isErr(resumeResult)) return err(resumeResult.error);

    return ok({
      kind: 'resume',
      resume: resumeResult.value,
      activeSections: deriveSectionsFromResume(resumeResult.value),
    });
  }, []);

  const prepareImportFromJson = useCallback(
    (content: string): PreparedImportResult => {
      const byteLength =
        content.length > MAX_IMPORT_JSON_BYTES
          ? MAX_IMPORT_JSON_BYTES + 1
          : new TextEncoder().encode(content).byteLength;
      if (byteLength > MAX_IMPORT_JSON_BYTES) {
        return err(
          createAppError('FILE_TOO_LARGE', 'The imported JSON exceeds the allowed size limit.'),
        );
      }
      try {
        const data = JSON.parse(content) as unknown;
        return prepareImportFromObject(data);
      } catch (error) {
        return err(
          createAppError('INVALID_JSON', 'Failed to parse imported JSON.', {
            cause: error,
          }),
        );
      }
    },
    [prepareImportFromObject],
  );

  const commitPreparedImport = useCallback((prepared: PreparedImport): ImportResult => {
    const previousResumeState = useResumeStore.getState();
    const previousUIState = useUIStore.getState();
    const durableStorage = getLocalStorage();
    const keysToVerify =
      prepared.kind === 'workspace'
        ? [RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY]
        : [RESUME_STORE_PERSIST_KEY];
    const previousPersistedValues = new Map<string, string | null>();

    if (durableStorage) {
      try {
        for (const key of keysToVerify)
          previousPersistedValues.set(key, durableStorage.getItem(key));
      } catch (error) {
        const issue = new StorageIssueError(
          'read',
          'Could not snapshot local data before import.',
          {
            cause: error,
          },
        );
        reportPersistenceIssue(issue);
        return err(
          createAppError(
            'IMPORT_FAILED',
            'Import was canceled because saved data could not be checked.',
            {
              cause: error,
            },
          ),
        );
      }
    }

    const restorePreviousState = () => {
      useResumeStore.setState({
        resume: previousResumeState.resume,
        activeSections: previousResumeState.activeSections,
        hasResumeChanges: previousResumeState.hasResumeChanges,
      });
      useUIStore.setState({
        theme: previousUIState.theme,
        templateId: previousUIState.templateId,
        customTemplates: previousUIState.customTemplates,
        templatePanelOpen: previousUIState.templatePanelOpen,
        modulePanelOpen: previousUIState.modulePanelOpen,
        mobileView: previousUIState.mobileView,
      });
      try {
        document.documentElement.classList.toggle('dark', previousUIState.theme === 'dark');
        document.documentElement.dataset.theme = previousUIState.theme;
      } catch {
        // State rollback is still complete if the document is unavailable.
      }
      if (!durableStorage) return;
      for (const [key, raw] of previousPersistedValues) {
        try {
          if (raw === null) durableStorage.removeItem(key);
          else durableStorage.setItem(key, raw);
        } catch (error) {
          reportPersistenceIssue(
            new StorageIssueError(
              'write',
              'Previous saved data could not be restored after import.',
              {
                cause: error,
              },
            ),
          );
        }
      }
    };

    try {
      useResumeStore.getState().replaceState(prepared.resume, prepared.activeSections);
      if (prepared.kind === 'workspace') {
        const ui = useUIStore.getState();
        ui.setTheme(prepared.theme);
        ui.setCustomTemplates(prepared.customTemplates);
        ui.setTemplateId(prepared.templateId);
        ui.resetPanels();
        ui.setMobileView('editor');
      }

      if (durableStorage) {
        const nextResume = useResumeStore.getState();
        const resumeMatches = persistedStateMatches(
          durableStorage,
          RESUME_STORE_PERSIST_KEY,
          RESUME_STORE_PERSIST_VERSION,
          { resume: nextResume.resume, activeSections: nextResume.activeSections },
        );
        const uiMatches =
          prepared.kind === 'resume' ||
          persistedStateMatches(durableStorage, UI_STORE_PERSIST_KEY, UI_STORE_PERSIST_VERSION, {
            theme: useUIStore.getState().theme,
            templateId: useUIStore.getState().templateId,
            customTemplates: useUIStore.getState().customTemplates,
          });
        if (!resumeMatches || !uiMatches) {
          throw new StorageIssueError(
            'write',
            'The imported data was not saved consistently across browser stores.',
          );
        }
      }
      return ok({ kind: prepared.kind });
    } catch (error) {
      restorePreviousState();
      if (error instanceof StorageIssueError) reportPersistenceIssue(error);
      return err(
        createAppError(
          'IMPORT_FAILED',
          'The import could not be committed. Previous data was restored.',
          {
            cause: error,
          },
        ),
      );
    }
  }, []);

  return { prepareImportFromObject, prepareImportFromJson, commitPreparedImport };
};
