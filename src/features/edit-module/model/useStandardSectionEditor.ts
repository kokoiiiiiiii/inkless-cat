import { sectionDefinitions, type StandardSectionKey } from '@entities/module';
import type { ResumeData } from '@entities/resume';
import { useCallback } from 'react';

import { cleanListInput } from '../lib';
import type { ResumeSectionItem, StandardSectionHandlers } from './types';

type UpdateDraft = (mutator: (draft: ResumeData) => void) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const ensureSectionList = (draft: ResumeData, section: StandardSectionKey): ResumeSectionItem[] => {
  const current = draft[section];
  if (Array.isArray(current)) {
    return current as ResumeSectionItem[];
  }
  const next: ResumeSectionItem[] = [];
  (draft as Record<StandardSectionKey, ResumeSectionItem[]>)[section] = next;
  return next;
};

export const useStandardSectionEditor = (updateDraft: UpdateDraft): StandardSectionHandlers => {
  const handleArrayFieldChange = useCallback<StandardSectionHandlers['handleArrayFieldChange']>(
    (section, index, field, value) => {
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        const target = sectionList[index];
        if (isRecord(target)) {
          target[field] = value;
        }
      });
    },
    [updateDraft],
  );

  const handleArrayListChange = useCallback<StandardSectionHandlers['handleArrayListChange']>(
    (section, index, field, rawValue) => {
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        const target = sectionList[index];
        if (isRecord(target)) {
          target[field] = cleanListInput(rawValue);
        }
      });
    },
    [updateDraft],
  );

  const handleAddSectionItem = useCallback<StandardSectionHandlers['handleAddSectionItem']>(
    (section) => {
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        const factory = sectionDefinitions[section]?.createItem;
        if (typeof factory === 'function') {
          sectionList.push(factory() as ResumeSectionItem);
        }
      });
    },
    [updateDraft],
  );

  const handleRemoveSectionItem = useCallback<StandardSectionHandlers['handleRemoveSectionItem']>(
    (section, index) => {
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        if (index >= 0 && index < sectionList.length) {
          sectionList.splice(index, 1);
        }
      });
    },
    [updateDraft],
  );

  return {
    handleArrayFieldChange,
    handleArrayListChange,
    handleAddSectionItem,
    handleRemoveSectionItem,
  };
};
