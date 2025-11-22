import { createStoreLogger } from '@shared/lib/logger';
import {
  LEGACY_KEYS,
  readStoredJson,
  RESUME_STORE_PERSIST_KEY,
  SECTIONS_KEY,
  STORAGE_KEY,
} from '@shared/lib/storage';
import { createBrowserStorage, withStoreErrorBoundary } from '@shared/lib/store';
import { produce } from 'immer';
import type { ReactNode } from 'react';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

import { createEmptyResume } from '../lib/factory';
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
  resetState: (nextResume?: ResumeData) => void;
};

const logger = createStoreLogger('resume');

const createNormalizedResume = (value?: ResumeData): ResumeData =>
  normalizeResumeSchema(value ?? createEmptyResume(), { clone: true });

const resolveInitialActiveSections = (resume: ResumeData): ActiveSectionKey[] => {
  const storedSections = readStoredJson<ActiveSectionKey[]>(SECTIONS_KEY, LEGACY_KEYS.sections);
  if (Array.isArray(storedSections) && storedSections.length > 0) {
    return sanitizeSections(storedSections, resume, { fallbackToDefaults: true });
  }
  return deriveSectionsFromResume(resume);
};

const createInitialState = (): ResumeStoreState => {
  const storedResume = readStoredJson<ResumeData>(STORAGE_KEY, LEGACY_KEYS.data);
  const normalized = createNormalizedResume(storedResume ?? undefined);

  return {
    resume: normalized,
    activeSections: resolveInitialActiveSections(normalized),
    hasResumeChanges: false,
  };
};

export const useResumeStore = create<ResumeStore>()(
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
        storage: createJSONStorage(() => createBrowserStorage(logger, 'resume')),
        partialize: ({ resume, activeSections, hasResumeChanges }) => ({
          resume,
          activeSections,
          hasResumeChanges,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            logger.error('Resume store rehydration failed', error);
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
