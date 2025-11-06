import type { ResumeCustomField, ResumeCustomSection, ResumeData } from '@entities/resume';

import { cleanListInput, createCustomField } from './utils';

export const ensureCustomSections = (draft: ResumeData): ResumeCustomSection[] => {
  const sections = draft.customSections;
  if (Array.isArray(sections)) {
    return sections;
  }
  const next: ResumeCustomSection[] = [];
  draft.customSections = next;
  return next;
};

export const ensureSectionShape = (section: ResumeCustomSection): void => {
  if (!section.mode) {
    section.mode = 'list';
  }
  if (!Array.isArray(section.items)) {
    section.items = [];
  }
  if (!Array.isArray(section.fields)) {
    section.fields = [];
  }
  if (typeof section.text !== 'string') {
    section.text = '';
  }
};

export const ensureFieldsCollection = (section: ResumeCustomSection): ResumeCustomField[] => {
  if (!Array.isArray(section.fields)) {
    section.fields = [];
  }
  return section.fields;
};

export const ensureItemsCollection = (section: ResumeCustomSection): string[] => {
  if (!Array.isArray(section.items)) {
    section.items = [];
  }
  return section.items;
};

export const stringifyFields = (fields: ResumeCustomField[]): string[] =>
  fields
    .map((field) => [field.label, field.value].filter(Boolean).join('：'))
    .filter((entry) => entry.length > 0);

const fallbackItemsFromText = (section: ResumeCustomSection): string[] => {
  if (typeof section.text === 'string' && section.text.trim()) {
    return cleanListInput(section.text);
  }
  return [];
};

const fallbackItemsFromFields = (section: ResumeCustomSection): string[] => {
  if (!Array.isArray(section.fields) || section.fields.length === 0) {
    return [];
  }
  return stringifyFields(section.fields);
};

export const prepareListModeDefaults = (section: ResumeCustomSection): void => {
  const items = ensureItemsCollection(section);
  if (items.length > 0) {
    return;
  }
  const fromText = fallbackItemsFromText(section);
  if (fromText.length > 0) {
    items.splice(0, items.length, ...fromText);
    return;
  }
  const fromFields = fallbackItemsFromFields(section);
  if (fromFields.length > 0) {
    items.splice(0, items.length, ...fromFields);
  }
};

export const prepareFieldsModeDefaults = (section: ResumeCustomSection): void => {
  const fields = ensureFieldsCollection(section);
  if (fields.length === 0) {
    fields.push(createCustomField());
  }
};

export const prepareTextModeDefaults = (section: ResumeCustomSection): void => {
  if (typeof section.text === 'string' && section.text.trim()) {
    return;
  }
  if (Array.isArray(section.items) && section.items.length > 0) {
    section.text = section.items.join('\n');
    return;
  }
  if (Array.isArray(section.fields) && section.fields.length > 0) {
    section.text = stringifyFields(section.fields).join('\n');
    return;
  }
  section.text = '';
};
