import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { createAppError } from '@shared/lib/errors';
import { MAX_RESUME_TEXT_LENGTH, MAX_SECTION_ITEMS } from '@shared/lib/limits';
import { useAppFeedback } from '@shared/ui/feedback';
import { useCallback, useMemo } from 'react';

import {
  cleanListInput,
  createCustomField,
  ensureCustomSections,
  ensureFieldsCollection,
  ensureSectionShape,
  prepareFieldsModeDefaults,
  prepareListModeDefaults,
  prepareTextModeDefaults,
  stringifyFields,
} from '../lib';
import type { CustomSectionHandlers } from './types';

type UpdateDraft = (mutator: (draft: ResumeData) => void) => void;
type MutateSection = (sectionId: string, mutator: (section: ResumeCustomSection) => void) => void;

const getAvailableSections = (
  customSections: ResumeData['customSections'],
): ResumeCustomSection[] => (Array.isArray(customSections) ? customSections : []);

const createCustomSectionHandlers = (
  mutate: MutateSection,
  resume: ResumeData,
  reportLimit: (limit: number) => void,
): Omit<CustomSectionHandlers, 'availableCustomSections'> => ({
  handleCustomTitleChange: (sectionId: string, value: string) => {
    if (value.length > MAX_RESUME_TEXT_LENGTH) {
      reportLimit(MAX_RESUME_TEXT_LENGTH);
      return;
    }
    mutate(sectionId, (section) => {
      section.title = value;
    });
  },
  handleCustomItemsChange: (sectionId: string, value: string) => {
    if (value.length > MAX_RESUME_TEXT_LENGTH * MAX_SECTION_ITEMS) {
      reportLimit(MAX_RESUME_TEXT_LENGTH * MAX_SECTION_ITEMS);
      return;
    }
    const items = cleanListInput(value);
    if (items.length > MAX_SECTION_ITEMS) {
      reportLimit(MAX_SECTION_ITEMS);
      return;
    }
    if (items.some((item) => item.length > MAX_RESUME_TEXT_LENGTH)) {
      reportLimit(MAX_RESUME_TEXT_LENGTH);
      return;
    }
    mutate(sectionId, (section) => {
      if (section.mode === 'list') {
        section.items = items;
      }
    });
  },
  handleCustomModeChange: (sectionId: string, mode: ResumeCustomSection['mode']) => {
    const current = resume.customSections.find((section) => section.id === sectionId);
    if (!current) return;
    if (mode === 'text') {
      const candidate = current.text.trim()
        ? current.text
        : current.items.length > 0
          ? current.items.join('\n')
          : stringifyFields(current.fields).join('\n');
      if (candidate.length > MAX_RESUME_TEXT_LENGTH) {
        reportLimit(MAX_RESUME_TEXT_LENGTH);
        return;
      }
    }
    if (mode === 'list' && current.items.length === 0) {
      const candidateItems = current.text.trim()
        ? cleanListInput(current.text)
        : stringifyFields(current.fields);
      if (candidateItems.length > MAX_SECTION_ITEMS) {
        reportLimit(MAX_SECTION_ITEMS);
        return;
      }
      if (candidateItems.some((item) => item.length > MAX_RESUME_TEXT_LENGTH)) {
        reportLimit(MAX_RESUME_TEXT_LENGTH);
        return;
      }
    }
    mutate(sectionId, (section) => {
      section.mode = mode;
      switch (mode) {
        case 'list': {
          prepareListModeDefaults(section);
          break;
        }
        case 'fields': {
          prepareFieldsModeDefaults(section);
          break;
        }
        case 'text': {
          prepareTextModeDefaults(section);
          break;
        }
        default: {
          break;
        }
      }
    });
  },
  handleCustomFieldChange: (
    sectionId: string,
    fieldId: string,
    key: keyof ResumeCustomSection['fields'][number],
    value: string,
  ) => {
    if (value.length > MAX_RESUME_TEXT_LENGTH) {
      reportLimit(MAX_RESUME_TEXT_LENGTH);
      return;
    }
    mutate(sectionId, (section) => {
      if (section.mode !== 'fields') {
        return;
      }
      const fields = ensureFieldsCollection(section);
      const targetField = fields.find((field) => field.id === fieldId);
      if (targetField) {
        targetField[key] = value;
      }
    });
  },
  handleCustomFieldAdd: (sectionId: string) => {
    const section = resume.customSections.find((item) => item.id === sectionId);
    if (section && section.fields.length >= MAX_SECTION_ITEMS) {
      reportLimit(MAX_SECTION_ITEMS);
      return;
    }
    mutate(sectionId, (section) => {
      const fields = ensureFieldsCollection(section);
      fields.push(createCustomField());
      section.mode = 'fields';
    });
  },
  handleCustomFieldRemove: (sectionId: string, fieldId: string) => {
    mutate(sectionId, (section) => {
      if (section.mode !== 'fields') {
        return;
      }
      const nextFields = ensureFieldsCollection(section).filter((field) => field.id !== fieldId);
      section.fields = nextFields;
    });
  },
  handleCustomTextChange: (sectionId: string, value: string) => {
    if (value.length > MAX_RESUME_TEXT_LENGTH) {
      reportLimit(MAX_RESUME_TEXT_LENGTH);
      return;
    }
    mutate(sectionId, (section) => {
      if (section.mode === 'text') {
        section.text = value;
      }
    });
  },
});

export const useCustomSectionsEditor = (
  resume: ResumeData,
  updateDraft: UpdateDraft,
): CustomSectionHandlers => {
  const { t } = useI18n();
  const { showError } = useAppFeedback();
  const availableCustomSections = useMemo(
    () => getAvailableSections(resume.customSections),
    [resume.customSections],
  );

  const mutateSection = useCallback<MutateSection>(
    (sectionId, mutator) => {
      updateDraft((draft) => {
        const sections = ensureCustomSections(draft);
        const target = sections.find((item) => item.id === sectionId);
        if (!target) {
          return;
        }
        ensureSectionShape(target);
        mutator(target);
      });
    },
    [updateDraft],
  );

  const reportLimit = useCallback(
    (limit: number) => {
      showError(createAppError('LIMIT_EXCEEDED', t('common.errors.limitExceeded', { limit })));
    },
    [showError, t],
  );

  const handlers = useMemo(
    () => createCustomSectionHandlers(mutateSection, resume, reportLimit),
    [mutateSection, reportLimit, resume],
  );

  return {
    availableCustomSections,
    ...handlers,
  };
};
