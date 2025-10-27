import {
  createCustomSection,
  getCustomSectionKey,
  sectionDefinitions,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import { deriveSectionsFromResume, type ResumeCustomSection, type ResumeData } from '@entities/resume';
import { useCallback, useEffect, useRef } from 'react';

import { useResumeActions, useResumeState } from '@/stores/resume.store';

type ToggleHandler = (sectionKey: string, enabled: boolean) => void;
type ReorderHandler = (order: string[]) => void;
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
  const { activeSections, resume } = useResumeState();
  const { updateActiveSections, updateResume } = useResumeActions();
  const orderMemoryRef = useRef<Map<string, number>>(new Map());

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
      updateActiveSections(nextOrder);
    },
    [updateActiveSections],
  );

  const toggleSection: ToggleHandler = useCallback(
    (sectionKey, enabled) => {
      updateActiveSections((prev) => {
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
      });

      if (enabled && sectionOrder.includes(sectionKey as StandardSectionKey)) {
        updateResume((draft) => {
          ensureSectionInitialized(draft, sectionKey as StandardSectionKey);
        }, { markDirty: false, syncSections: false });
      }
    },
    [updateActiveSections, updateResume],
  );

  const addCustomSection = useCallback<AddCustomSectionHandler>((title) => {
    const newSection = createCustomSection(title || '自定义模块');
    updateResume((draft) => {
      if (!Array.isArray(draft.customSections)) {
        draft.customSections = [];
      }
      (draft.customSections).push(newSection);
    });
    const newKey = getCustomSectionKey(newSection.id);
    updateActiveSections((prev) => {
      const without = prev.filter((key) => key !== newKey);
      return [...without, newKey];
    });
  }, [updateResume, updateActiveSections]);

  const removeCustomSection = useCallback(
    (sectionId: string) => {
      const targetKey = getCustomSectionKey(sectionId);
      updateActiveSections((prev) => prev.filter((key) => key !== targetKey));
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
    ? (resume.customSections)
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
