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

export const sectionDefinitions: Record<SectionKey, SectionDefinition> = {
  socials: {
    title: '社交与链接',
    createItem: () => ({ id: createId('social'), label: '', url: '' }),
  },
  experience: {
    title: '工作经历',
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
    title: '教育背景',
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
    title: '项目经历',
    createItem: () => ({
      id: createId('proj'),
      name: '',
      role: '',
      summary: '',
      link: '',
    }),
  },
  skills: {
    title: '技能特长',
    createItem: () => ({ id: createId('skill'), title: '', items: [] }),
  },
  languages: {
    title: '语言能力',
    createItem: () => ({ id: createId('lang'), name: '', level: '' }),
  },
  interests: {
    title: '兴趣爱好',
    createItem: () => ({ id: createId('interest'), name: '' }),
  },
  awards: {
    title: '荣誉奖项',
    createItem: () => ({ id: createId('award'), name: '', issuer: '', year: '' }),
  },
};

export function createCustomSection(
  title?: string,
  mode: ResumeCustomSectionMode = 'list',
): ResumeCustomSection {
  return {
    id: createId('custom'),
    title: title ?? '自定义模块',
    mode,
    items: [],
    fields: [],
    text: '',
  };
}

export const getCustomSectionKey = (id: string): string => `${CUSTOM_SECTION_PREFIX}${id}`;

export const isCustomSectionKey = (key: string): boolean => key.startsWith(CUSTOM_SECTION_PREFIX);

export const extractCustomSectionId = (key: string): string | null =>
  isCustomSectionKey(key) ? key.slice(CUSTOM_SECTION_PREFIX.length) : null;
