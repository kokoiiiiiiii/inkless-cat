import {
  createDefaultWorkspace,
  ensureLegacyStorageMigration,
  RESUME_STORE_PERSIST_VERSION,
  sanitizePersistedResumeStoreState,
} from '@entities/workspace';
import { createStoreLogger } from '@shared/lib/logger';
import { RESUME_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { createBrowserStorage, withStoreErrorBoundary } from '@shared/lib/store';
import { useFeedbackStore } from '@shared/ui/feedback';
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
ensureLegacyStorageMigration();

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
                  ? sanitizeSections(state.activeSections, nextResume, { fallbackToDefaults: true })
                  : state.activeSections;
                return {
                  resume: nextResume,
                  activeSections: nextSections,
                  hasResumeChanges: markDirty ? true : state.hasResumeChanges,
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
                const next =
                  typeof input === 'function'
                    ? (input as (prevSections: ActiveSectionKey[]) => ActiveSectionKey[])(
                        state.activeSections,
                      )
                    : input;
                return {
                  activeSections: sanitizeSections(next, state.resume, {
                    fallbackToDefaults: !options?.allowEmpty,
                  }),
                };
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
              () => {
                const normalized = createNormalizedResume(nextResume);
                return {
                  resume: normalized,
                  activeSections: sanitizeSections(nextSections, normalized, {
                    fallbackToDefaults: true,
                  }),
                  hasResumeChanges: false,
                };
              },
              false,
              'resume/replaceState',
            ),
          ),
        resetState: (nextResume) =>
          withStoreErrorBoundary(logger, 'resetState', () =>
            set(
              () => {
                const normalized = createNormalizedResume(nextResume);
                return {
                  resume: normalized,
                  activeSections: deriveSectionsFromResume(normalized),
                  hasResumeChanges: false,
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
        storage: createJSONStorage(() => createBrowserStorage(logger, 'resume')),
        migrate: (persistedState) => sanitizePersistedResumeStoreState(persistedState),
        partialize: ({ resume, activeSections }) => ({
          resume,
          activeSections,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('Resume store rehydration failed', error);
            useFeedbackStore.getState().pushFeedback({
              tone: 'error',
              title: 'Storage Error',
              message: 'Failed to restore local resume data.',
              durationMs: 6000,
            });
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
