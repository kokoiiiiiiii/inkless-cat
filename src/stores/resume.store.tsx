import {
  type ActiveSectionKey,
  createEmptyResume,
  deriveSectionsFromResume,
  normalizeResumeDraft,
  normalizeResumeSchema,
  type ResumeData,
  sanitizeSections,
} from '@entities/resume';
import { produce } from 'immer';
import { createContext, type Dispatch, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

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

type ActiveSectionsInput =
  | ActiveSectionKey[]
  | ((prev: ActiveSectionKey[]) => ActiveSectionKey[]);

type UpdateActiveSectionsOptions = {
  allowEmpty?: boolean;
};

type ResumeStoreContextValue = ResumeStoreState & {
  updateResume: (updater: UpdateResumeInput, options?: UpdateResumeOptions) => void;
  updateActiveSections: (input: ActiveSectionsInput, options?: UpdateActiveSectionsOptions) => void;
  setHasResumeChanges: Dispatch<boolean>;
  resetState: (nextResume?: ResumeData) => void;
};

const ResumeStoreContext = createContext<ResumeStoreContextValue | undefined>(undefined);

const createNormalizedResume = (value?: ResumeData): ResumeData =>
  normalizeResumeSchema(value ?? createEmptyResume(), { clone: true });

type ResumeStoreProviderProps = {
  children: ReactNode;
  initialResume?: ResumeData;
  initialSections?: ActiveSectionKey[];
};

export const ResumeStoreProvider = ({
  children,
  initialResume,
  initialSections,
}: ResumeStoreProviderProps) => {
  const [resume, setResume] = useState<ResumeData>(() => createNormalizedResume(initialResume));
  const [activeSections, setActiveSections] = useState<ActiveSectionKey[]>(() => {
    if (Array.isArray(initialSections) && initialSections.length > 0) {
      return sanitizeSections(initialSections, createNormalizedResume(initialResume), {
        fallbackToDefaults: true,
      });
    }
    return deriveSectionsFromResume(createNormalizedResume(initialResume));
  });
  const [hasResumeChanges, setHasResumeChanges] = useState<boolean>(false);

  const updateActiveSections = useCallback(
    (input: ActiveSectionsInput, options?: UpdateActiveSectionsOptions) => {
      setActiveSections((prev) => {
        const next =
          typeof input === 'function'
            ? (input as (prevSections: ActiveSectionKey[]) => ActiveSectionKey[])(prev)
            : input;
        return sanitizeSections(next, resume, {
          fallbackToDefaults: !(options?.allowEmpty),
        });
      });
    },
    [resume],
  );

  const resetState = useCallback((nextResume?: ResumeData) => {
    const normalized = createNormalizedResume(nextResume);
    setResume(normalized);
    setActiveSections(deriveSectionsFromResume(normalized));
    setHasResumeChanges(false);
  }, []);

  const updateResume = useCallback(
    (updater: UpdateResumeInput, options: UpdateResumeOptions = {}) => {
      const { markDirty = true, syncSections = true } = options;
      setResume((prev) => {
        const next =
          typeof updater === 'function'
            ? produce(prev, (draft: ResumeData) => {
                (updater)(draft);
                normalizeResumeDraft(draft);
              })
            : normalizeResumeSchema(updater, { clone: true });
        if (syncSections) {
          setActiveSections((current) =>
            sanitizeSections(current, next, { fallbackToDefaults: true }),
          );
        }
        return next;
      });
      if (markDirty) {
        setHasResumeChanges(true);
      }
    },
    [],
  );

  const contextValue = useMemo<ResumeStoreContextValue>(
    () => ({
      resume,
      activeSections,
      hasResumeChanges,
      updateResume,
      updateActiveSections,
      setHasResumeChanges,
      resetState,
    }),
    [resume, activeSections, hasResumeChanges, updateResume, updateActiveSections],
  );

  return <ResumeStoreContext.Provider value={contextValue}>{children}</ResumeStoreContext.Provider>;
};

const useResumeStoreContext = (): ResumeStoreContextValue => {
  const context = useContext(ResumeStoreContext);
  if (!context) {
    throw new Error('useResumeStore 必须在 ResumeStoreProvider 内部使用');
  }
  return context;
};

export const useResumeState = () => {
  const { resume, activeSections, hasResumeChanges } = useResumeStoreContext();
  return { resume, activeSections, hasResumeChanges };
};

export const useResumeActions = () => {
  const { updateResume, updateActiveSections, setHasResumeChanges, resetState } =
    useResumeStoreContext();
  return { updateResume, updateActiveSections, setHasResumeChanges, resetState };
};

export const useResumeSelector = <T,>(selector: (state: ResumeStoreState) => T): T => {
  const { resume, activeSections, hasResumeChanges } = useResumeStoreContext();
  return selector({ resume, activeSections, hasResumeChanges });
};
