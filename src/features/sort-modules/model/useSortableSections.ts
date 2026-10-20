import {
  type ActiveSectionKey,
  createCustomSection,
  getCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import {
  deriveSectionsFromResume,
  type ResumeCustomSection,
  type ResumeData,
} from '@entities/resume';
import { useResumeActions, useResumeState } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { createAppError } from '@shared/lib/errors';
import { MAX_CUSTOM_SECTIONS, MAX_RESUME_TEXT_LENGTH } from '@shared/lib/limits';
import { useAppFeedback } from '@shared/ui/feedback';
import { useCallback, useEffect, useRef } from 'react';

type ToggleHandler = (sectionKey: ActiveSectionKey, enabled: boolean) => void;
type ReorderHandler = (order: ActiveSectionKey[]) => void;
type AddCustomSectionHandler = (title?: string) => void;

const ensureSectionInitialized = (resume: ResumeData, sectionKey: StandardSectionKey) => {
  const current = resume[sectionKey];
  if (!Array.isArray(current)) {
    (resume as Record<StandardSectionKey, unknown[]>)[sectionKey] = [];
  }
  const items = resume[sectionKey] as unknown[];
  if (items.length === 0) {
    const factory = sectionDefinitions[sectionKey]?.createItem;
    if (typeof factory === 'function') {
      items.push(factory());
    }
  }
};

export const useSortableSections = () => {
  const { t } = useI18n();
  const { showError } = useAppFeedback();
  const { activeSections, resume } = useResumeState();
  const { updateActiveSections, updateResume } = useResumeActions();
  const orderMemoryRef = useRef<Map<ActiveSectionKey, number>>(new Map());

  useEffect(() => {
    const memory = orderMemoryRef.current;
    for (const [index, key] of activeSections.entries()) {
      memory.set(key, index);
    }
  }, [activeSections]);

  const reorderSections: ReorderHandler = useCallback(
    (nextOrder) => {
      if (!Array.isArray(nextOrder)) {
        return;
      }
      const memory = orderMemoryRef.current;
      memory.clear();
      for (const [index, key] of nextOrder.entries()) {
        memory.set(key, index);
      }
      updateActiveSections(() => [...nextOrder], { allowEmpty: true });
    },
    [updateActiveSections],
  );

  const toggleSection: ToggleHandler = useCallback(
    (sectionKey, enabled) => {
      updateActiveSections(
        (prev) => {
          const existingIndex = prev.indexOf(sectionKey);
          if (existingIndex === -1 && !enabled) {
            return prev;
          }
          const cleaned = prev.filter((key) => key !== sectionKey);
          if (!enabled) {
            return cleaned;
          }
          if (existingIndex !== -1) {
            return prev;
          }
          const savedIndex = orderMemoryRef.current.get(sectionKey);
          const next = [...cleaned];
          if (typeof savedIndex === 'number' && Number.isFinite(savedIndex)) {
            const clamped = Math.max(0, Math.min(savedIndex, next.length));
            next.splice(clamped, 0, sectionKey);
            return next;
          }
          next.push(sectionKey);
          return next;
        },
        { allowEmpty: true },
      );

      if (enabled && sectionOrder.includes(sectionKey as StandardSectionKey)) {
        updateResume(
          (draft) => {
            ensureSectionInitialized(draft, sectionKey as StandardSectionKey);
          },
          { markDirty: false, syncSections: false },
        );
      }
    },
    [updateActiveSections, updateResume],
  );

  const addCustomSection = useCallback<AddCustomSectionHandler>(
    (title) => {
      if (resume.customSections.length >= MAX_CUSTOM_SECTIONS) {
        showError(
          createAppError(
            'LIMIT_EXCEEDED',
            t('common.errors.limitExceeded', { limit: MAX_CUSTOM_SECTIONS }),
          ),
        );
        return;
      }
      if ((title?.length ?? 0) > MAX_RESUME_TEXT_LENGTH) {
        showError(
          createAppError(
            'LIMIT_EXCEEDED',
            t('common.errors.limitExceeded', { limit: MAX_RESUME_TEXT_LENGTH }),
          ),
        );
        return;
      }
      const fallback = t('modules.customSection.defaultTitle');
      const newSection = createCustomSection(title || fallback);
      updateResume((draft) => {
        if (!Array.isArray(draft.customSections)) {
          draft.customSections = [];
        }
        draft.customSections.push(newSection);
      });
      const newKey = getCustomSectionKey(newSection.id);
      updateActiveSections(
        (prev) => {
          const without = prev.filter((key) => key !== newKey);
          return [...without, newKey];
        },
        { allowEmpty: true },
      );
    },
    [resume.customSections.length, showError, t, updateResume, updateActiveSections],
  );

  const removeCustomSection = useCallback(
    (sectionId: string) => {
      const targetKey = getCustomSectionKey(sectionId);
      updateActiveSections((prev) => prev.filter((key) => key !== targetKey), { allowEmpty: true });
      updateResume((draft) => {
        if (!Array.isArray(draft.customSections)) {
          return;
        }
        draft.customSections = draft.customSections.filter((item) => item.id !== sectionId);
      });
    },
    [updateActiveSections, updateResume],
  );

  const availableCustomSections: ResumeCustomSection[] = Array.isArray(resume.customSections)
    ? resume.customSections
    : [];

  const resolvedActiveSections = deriveSectionsFromResume(resume);

  return {
    activeSections,
    resolvedActiveSections,
    customSections: availableCustomSections,
    toggleSection,
    reorderSections,
    addCustomSection,
    removeCustomSection,
  };
};
