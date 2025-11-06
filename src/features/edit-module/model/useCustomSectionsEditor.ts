import type { ResumeCustomSection, ResumeData } from '@entities/resume';
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
} from '../lib';
import type { CustomSectionHandlers } from './types';

type UpdateDraft = (mutator: (draft: ResumeData) => void) => void;
type MutateSection = (sectionId: string, mutator: (section: ResumeCustomSection) => void) => void;

const getAvailableSections = (
  customSections: ResumeData['customSections'],
): ResumeCustomSection[] => (Array.isArray(customSections) ? customSections : []);

const createCustomSectionHandlers = (
  mutate: MutateSection,
): Omit<CustomSectionHandlers, 'availableCustomSections'> => ({
  handleCustomTitleChange: (sectionId: string, value: string) => {
    mutate(sectionId, (section) => {
      section.title = value;
    });
  },
  handleCustomItemsChange: (sectionId: string, value: string) => {
    mutate(sectionId, (section) => {
      if (section.mode === 'list') {
        section.items = cleanListInput(value);
      }
    });
  },
  handleCustomModeChange: (sectionId: string, mode: ResumeCustomSection['mode']) => {
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

  const handlers = useMemo(() => createCustomSectionHandlers(mutateSection), [mutateSection]);

  return {
    availableCustomSections,
    ...handlers,
  };
};
