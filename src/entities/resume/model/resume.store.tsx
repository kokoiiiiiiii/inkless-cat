import {
  createDefaultWorkspace,
  ensureLegacyStorageMigration,
  reportPersistenceIssue,
  RESUME_STORE_PERSIST_VERSION,
  sanitizePersistedResumeStoreState,
} from '@entities/workspace';
import { createStoreLogger } from '@shared/lib/logger';
import { RESUME_STORE_PERSIST_KEY, StorageIssueError } from '@shared/lib/storage';
import { createBrowserStorage, withStoreErrorBoundary } from '@shared/lib/store';
import { produce } from 'immer';
import type { ReactNode } from 'react';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { normalizeResumeDraft, normalizeResumeSchema } from '../lib/normalizers';
import type { ActiveSectionKey } from '../selectors';
import { deriveSectionsFromResume, sanitizeSections } from '../selectors';
import type { ResumeData } from '../types';

type ResumeUpdater = (draft: ResumeData) => void;

type UpdateResumeInput = ResumeData | ResumeUpdater;

type UpdateResumeOptions = {
  markDirty?: boolean;
  syncSections?: boolean;
};

type ResumeStoreState = {
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  hasResumeChanges: boolean;
  /** In-memory epoch for whole-workspace replacements; intentionally excluded from persistence. */
  workspaceGeneration: number;
  /** In-memory revision for resume and section edits; intentionally excluded from persistence. */
  workspaceRevision: number;
};

type ActiveSectionsInput = ActiveSectionKey[] | ((prev: ActiveSectionKey[]) => ActiveSectionKey[]);

type UpdateActiveSectionsOptions = {
  allowEmpty?: boolean;
};

type ResumeStore = ResumeStoreState & {
  updateResume: (updater: UpdateResumeInput, options?: UpdateResumeOptions) => void;
  updateActiveSections: (input: ActiveSectionsInput, options?: UpdateActiveSectionsOptions) => void;
  setHasResumeChanges: (value: boolean) => void;
  replaceState: (nextResume: ResumeData, nextSections?: ActiveSectionKey[]) => void;
  resetState: (nextResume?: ResumeData) => void;
};

const logger = createStoreLogger('resume');
const reportResumeStorageIssue = (error: StorageIssueError) => reportPersistenceIssue(error);
const legacyMigrationSucceeded = ensureLegacyStorageMigration(reportResumeStorageIssue);
const resumeStorage = createBrowserStorage(
  logger,
  'resume',
  reportResumeStorageIssue,
  () => legacyMigrationSucceeded,
);

const createNormalizedResume = (value?: ResumeData): ResumeData =>
  normalizeResumeSchema(value ?? createDefaultWorkspace().resume, { clone: true });

const createInitialState = (): ResumeStoreState => {
  const defaults = createDefaultWorkspace();
  const normalized = createNormalizedResume(defaults.resume);

  return {
    resume: normalized,
    activeSections: sanitizeSections(defaults.activeSections, normalized, {
      fallbackToDefaults: true,
    }),
    hasResumeChanges: false,
    workspaceGeneration: 0,
    workspaceRevision: 0,
  };
};

export const useResumeStore = createWithEqualityFn<ResumeStore>()(
  devtools(
    persist(
      (set) => ({
        ...createInitialState(),
        updateResume: (updater, options: UpdateResumeOptions = {}) =>
          withStoreErrorBoundary(logger, 'updateResume', () => {
            const { markDirty = true, syncSections = true } = options;
            set(
              (state) => {
                const nextResume =
                  typeof updater === 'function'
                    ? produce(state.resume, (draft: ResumeData) => {
                        updater(draft);
                        normalizeResumeDraft(draft);
                      })
                    : normalizeResumeSchema(updater, { clone: true });
                const nextSections = syncSections
                  ? sanitizeSections(state.activeSections, nextResume)
                  : state.activeSections;
                const sectionsChanged =
                  nextSections.length !== state.activeSections.length ||
                  nextSections.some((section, index) => section !== state.activeSections[index]);
                return {
                  resume: nextResume,
                  activeSections: nextSections,
                  hasResumeChanges: markDirty ? true : state.hasResumeChanges,
                  workspaceRevision:
                    state.workspaceRevision +
                    Number(nextResume !== state.resume || sectionsChanged),
                };
              },
              false,
              'resume/updateResume',
            );
          }),
        updateActiveSections: (input, options?: UpdateActiveSectionsOptions) =>
          withStoreErrorBoundary(logger, 'updateActiveSections', () =>
            set(
              (state) => {
                const next = typeof input === 'function' ? input(state.activeSections) : input;
                const activeSections = sanitizeSections(next, state.resume, {
                  fallbackToDefaults: !options?.allowEmpty,
                });
                const changed =
                  activeSections.length !== state.activeSections.length ||
                  activeSections.some((section, index) => section !== state.activeSections[index]);
                return changed
                  ? {
                      activeSections,
                      workspaceRevision: state.workspaceRevision + 1,
                    }
                  : state;
              },
              false,
              'resume/updateActiveSections',
            ),
          ),
        setHasResumeChanges: (value) =>
          withStoreErrorBoundary(logger, 'setHasResumeChanges', () =>
            set({ hasResumeChanges: value }, false, 'resume/setHasResumeChanges'),
          ),
        replaceState: (nextResume, nextSections) =>
          withStoreErrorBoundary(logger, 'replaceState', () =>
            set(
              (state) => {
                const normalized = createNormalizedResume(nextResume);
                return {
                  resume: normalized,
                  activeSections: sanitizeSections(nextSections, normalized, {
                    fallbackToDefaults: nextSections === undefined || nextSections.length > 0,
                  }),
                  hasResumeChanges: false,
                  workspaceGeneration: state.workspaceGeneration + 1,
                  workspaceRevision: state.workspaceRevision + 1,
                };
              },
              false,
              'resume/replaceState',
            ),
          ),
        resetState: (nextResume) =>
          withStoreErrorBoundary(logger, 'resetState', () =>
            set(
              (state) => {
                const normalized = createNormalizedResume(nextResume);
                return {
                  resume: normalized,
                  activeSections: deriveSectionsFromResume(normalized),
                  hasResumeChanges: false,
                  workspaceGeneration: state.workspaceGeneration + 1,
                  workspaceRevision: state.workspaceRevision + 1,
                };
              },
              false,
              'resume/resetState',
            ),
          ),
      }),
      {
        name: RESUME_STORE_PERSIST_KEY,
        version: RESUME_STORE_PERSIST_VERSION,
        storage: createJSONStorage(() => resumeStorage),
        migrate: (persistedState) => sanitizePersistedResumeStoreState(persistedState),
        merge: (persistedState, currentState) => {
          if (persistedState === undefined) return currentState;
          try {
            return { ...currentState, ...sanitizePersistedResumeStoreState(persistedState) };
          } catch (error) {
            resumeStorage.blockWrites();
            throw error;
          }
        },
        partialize: ({ resume, activeSections }) => ({
          resume,
          activeSections,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('Resume store rehydration failed', error);
            resumeStorage.blockWrites();
            reportResumeStorageIssue(
              error instanceof StorageIssueError
                ? error
                : new StorageIssueError('corrupt', 'Resume store rehydration failed.', {
                    cause: error,
                  }),
            );
            return;
          }
          logger.info('Resume store rehydrated');
        },
      },
    ),
    { name: 'resume-store' },
  ),
);

export const useResumeState = () =>
  useResumeStore(
    (state) => ({
      resume: state.resume,
      activeSections: state.activeSections,
      hasResumeChanges: state.hasResumeChanges,
    }),
    shallow,
  );

export const useResumeActions = () =>
  useResumeStore(
    (state) => ({
      updateResume: state.updateResume,
      updateActiveSections: state.updateActiveSections,
      setHasResumeChanges: state.setHasResumeChanges,
      replaceState: state.replaceState,
      resetState: state.resetState,
    }),
    shallow,
  );

export const useResumeSelector = <T,>(selector: (state: ResumeStoreState) => T): T =>
  useResumeStore(selector);

type ResumeStoreProviderProps = {
  children: ReactNode;
};

export const ResumeStoreProvider = ({ children }: ResumeStoreProviderProps) => children;
