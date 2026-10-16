import { sectionDefinitions, type StandardSectionKey } from '@entities/module';
import type { ResumeData } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { createAppError } from '@shared/lib/errors';
import { MAX_RESUME_TEXT_LENGTH, MAX_SECTION_ITEMS } from '@shared/lib/limits';
import { useAppFeedback } from '@shared/ui/feedback';
import { useCallback } from 'react';

import { cleanListInput } from '../lib';
import type { ResumeSectionItem, StandardSectionHandlers } from './types';

type UpdateDraft = (mutator: (draft: ResumeData) => void) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const ensureSectionList = (draft: ResumeData, section: StandardSectionKey): ResumeSectionItem[] => {
  const current = draft[section];
  if (Array.isArray(current)) {
    return current;
  }
  const next: ResumeSectionItem[] = [];
  (draft as Record<StandardSectionKey, ResumeSectionItem[]>)[section] = next;
  return next;
};

export const useStandardSectionEditor = (
  resume: ResumeData,
  updateDraft: UpdateDraft,
): StandardSectionHandlers => {
  const { t } = useI18n();
  const { showError } = useAppFeedback();
  const reportLimitExceeded = useCallback(
    (limit: number) =>
      showError(createAppError('LIMIT_EXCEEDED', t('common.errors.limitExceeded', { limit }))),
    [showError, t],
  );

  const handleArrayFieldChange = useCallback<StandardSectionHandlers['handleArrayFieldChange']>(
    (section, index, field, value) => {
      if (value.length > MAX_RESUME_TEXT_LENGTH) {
        reportLimitExceeded(MAX_RESUME_TEXT_LENGTH);
        return;
      }
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        const target = sectionList[index];
        if (isRecord(target)) {
          target[field] = value;
        }
      });
    },
    [reportLimitExceeded, updateDraft],
  );

  const handleArrayListChange = useCallback<StandardSectionHandlers['handleArrayListChange']>(
    (section, index, field, rawValue) => {
      if (rawValue.length > MAX_RESUME_TEXT_LENGTH * MAX_SECTION_ITEMS) {
        reportLimitExceeded(MAX_RESUME_TEXT_LENGTH * MAX_SECTION_ITEMS);
        return;
      }
      const values = cleanListInput(rawValue);
      if (values.length > MAX_SECTION_ITEMS) {
        reportLimitExceeded(MAX_SECTION_ITEMS);
        return;
      }
      if (values.some((value) => value.length > MAX_RESUME_TEXT_LENGTH)) {
        reportLimitExceeded(MAX_RESUME_TEXT_LENGTH);
        return;
      }
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        const target = sectionList[index];
        if (isRecord(target)) {
          target[field] = values;
        }
      });
    },
    [reportLimitExceeded, updateDraft],
  );

  const handleAddSectionItem = useCallback<StandardSectionHandlers['handleAddSectionItem']>(
    (section) => {
      if ((resume[section]?.length ?? 0) >= MAX_SECTION_ITEMS) {
        reportLimitExceeded(MAX_SECTION_ITEMS);
        return;
      }
      updateDraft((draft) => {
        const sectionList = ensureSectionList(draft, section);
        const factory = sectionDefinitions[section]?.createItem;
        if (typeof factory === 'function') {
          sectionList.push(factory());
        }
      });
    },
    [reportLimitExceeded, resume, updateDraft],
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
