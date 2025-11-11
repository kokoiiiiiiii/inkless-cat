import { createCustomSection } from '@entities/module';
import { clone, createId } from '@shared/lib';

import type { ResumeCustomField, ResumeCustomSection, ResumeData } from '../types';

export type NormalizeOptions = {
  clone?: boolean;
};

export const normalizeCustomField = (
  field?: Partial<ResumeCustomField> | null,
): ResumeCustomField => ({
  id: field?.id || createId('custom-field'),
  label: typeof field?.label === 'string' ? field.label : '',
  value: typeof field?.value === 'string' ? field.value : '',
});

export const normalizeCustomSection = (
  section: Partial<ResumeCustomSection> | null | undefined,
): ResumeCustomSection => {
  if (!section) return createCustomSection();
  const normalized: ResumeCustomSection = {
    id: section.id || createId('custom'),
    title: typeof section.title === 'string' ? section.title : '',
    mode: ['list', 'fields', 'text'].includes(section.mode as string) ? section.mode : 'list',
    items: Array.isArray(section.items)
      ? section.items
          .map((item) => (typeof item === 'string' ? item : ''))
          .filter((item): item is string => item !== undefined)
      : [],
    fields: Array.isArray(section.fields)
      ? section.fields.map((field) => ({
          id: field?.id || createId('custom-field'),
          label: typeof field?.label === 'string' ? field.label : '',
          value: typeof field?.value === 'string' ? field.value : '',
        }))
      : [],
    text: typeof section.text === 'string' ? section.text : '',
  };
  if (normalized.mode === 'fields' && normalized.fields.length === 0) {
    normalized.fields = [
      {
        id: createId('custom-field'),
        label: '',
        value: '',
      },
    ];
  }
  return normalized;
};

export const normalizeResumeDraft = (draft: ResumeData): void => {
  if (!Array.isArray(draft.customSections)) {
    draft.customSections = [];
  }
  draft.customSections = draft.customSections.map((section) => normalizeCustomSection(section));
};

export const normalizeResumeSchema = (
  data: ResumeData,
  options: NormalizeOptions = {},
): ResumeData => {
  const resume = options.clone ? clone(data) : data;
  normalizeResumeDraft(resume);
  return resume;
};
