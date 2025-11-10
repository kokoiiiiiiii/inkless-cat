import type { ResumeCustomSection, ResumeCustomSectionMode } from '@entities/resume';
import { createId } from '@shared/lib/id';

import type { SectionDefinition, SectionKey } from '../types';

export const CUSTOM_SECTION_PREFIX = 'custom:';

export const sectionOrder: SectionKey[] = [
  'socials',
  'experience',
  'education',
  'projects',
  'skills',
  'languages',
  'interests',
  'awards',
];

export type StandardSectionKey = SectionKey;
export type CustomSectionKey = `${typeof CUSTOM_SECTION_PREFIX}${string}`;
export type ActiveSectionKey = StandardSectionKey | CustomSectionKey;

export const sectionDefinitions: Record<SectionKey, SectionDefinition> = {
  socials: {
    titleKey: 'modules.sections.socials',
    createItem: () => ({ id: createId('social'), label: '', url: '' }),
  },
  experience: {
    titleKey: 'modules.sections.experience',
    createItem: () => ({
      id: createId('exp'),
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      highlights: [],
    }),
  },
  education: {
    titleKey: 'modules.sections.education',
    createItem: () => ({
      id: createId('edu'),
      school: '',
      degree: '',
      startDate: '',
      endDate: '',
      details: '',
    }),
  },
  projects: {
    titleKey: 'modules.sections.projects',
    createItem: () => ({
      id: createId('proj'),
      name: '',
      role: '',
      summary: '',
      link: '',
      highlights: [],
    }),
  },
  skills: {
    titleKey: 'modules.sections.skills',
    createItem: () => ({ id: createId('skill'), title: '', items: [] }),
  },
  languages: {
    titleKey: 'modules.sections.languages',
    createItem: () => ({ id: createId('lang'), name: '', level: '' }),
  },
  interests: {
    titleKey: 'modules.sections.interests',
    createItem: () => ({ id: createId('interest'), name: '' }),
  },
  awards: {
    titleKey: 'modules.sections.awards',
    createItem: () => ({ id: createId('award'), name: '', issuer: '', year: '' }),
  },
};

export function createCustomSection(
  title?: string,
  mode: ResumeCustomSectionMode = 'list',
): ResumeCustomSection {
  return {
    id: createId('custom'),
    title: title ?? '',
    mode,
    items: [],
    fields: [],
    text: '',
  };
}

export const getCustomSectionKey = (id: string): CustomSectionKey =>
  `${CUSTOM_SECTION_PREFIX}${id}`;

export const isCustomSectionKey = (key: string): key is CustomSectionKey =>
  key.startsWith(CUSTOM_SECTION_PREFIX);

export const extractCustomSectionId = (key: string): string | null =>
  isCustomSectionKey(key) ? key.slice(CUSTOM_SECTION_PREFIX.length) : null;
