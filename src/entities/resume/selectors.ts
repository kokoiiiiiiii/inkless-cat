import {
  extractCustomSectionId,
  getCustomSectionKey,
  isCustomSectionKey,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';

import type { ResumeCustomSection, ResumeData } from './types';

export type ActiveSectionKey = StandardSectionKey | string;

export const getDefaultSections = (): StandardSectionKey[] => [...sectionOrder];

const hasContent = (sectionKey: StandardSectionKey, resume: ResumeData): boolean => {
  const value = resume[sectionKey];
  return Array.isArray(value) ? value.length > 0 : false;
};

export const deriveSectionsFromResume = (resume: ResumeData | null | undefined): ActiveSectionKey[] => {
  if (!resume) return getDefaultSections();
  const baseKeys = sectionOrder.filter((key) => hasContent(key, resume));
  const customKeys = Array.isArray(resume.customSections)
    ? resume.customSections.map((section) => getCustomSectionKey(section.id))
    : [];
  const combined = [...baseKeys, ...customKeys];
  return combined.length > 0 ? combined : getDefaultSections();
};

type SanitizeOptions = {
  fallbackToDefaults?: boolean;
};

export const sanitizeSections = (
  sections: string[] | null | undefined,
  resume: ResumeData,
  options: SanitizeOptions = {},
): ActiveSectionKey[] => {
  const { fallbackToDefaults = false } = options;
  if (!Array.isArray(sections)) return deriveSectionsFromResume(resume);
  const availableCustomIds = new Set(
    (resume?.customSections || []).map((section: ResumeCustomSection) => section.id),
  );
  const seen = new Set<string>();
  const filtered = sections.filter((key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    if (sectionOrder.includes(key as StandardSectionKey)) return true;
    if (isCustomSectionKey(key)) {
      const id = extractCustomSectionId(key);
      return Boolean(id && availableCustomIds.has(id));
    }
    return false;
  });
  if (filtered.length === 0 && fallbackToDefaults) {
    return deriveSectionsFromResume(resume);
  }
  return filtered;
};
