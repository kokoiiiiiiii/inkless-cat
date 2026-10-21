import type { ResumeData } from '@entities/resume';

import type { AIEnhancementFieldValue, AIEnhancementTarget } from '../model/types';

export type TargetResolution =
  | { status: 'found'; value: AIEnhancementFieldValue }
  | { status: 'missing' };

export const readEnhancementTarget = (
  resume: ResumeData,
  target: AIEnhancementTarget,
): TargetResolution => {
  switch (target.kind) {
    case 'personal-summary': {
      return {
        status: 'found',
        value: typeof resume.personal.summary === 'string' ? resume.personal.summary : '',
      };
    }
    case 'experience-highlights': {
      const matches = resume.experience.filter((item) => item.id === target.itemId);
      if (matches.length !== 1) return { status: 'missing' };
      return {
        status: 'found',
        value: Array.isArray(matches[0]?.highlights) ? [...matches[0].highlights] : [],
      };
    }
    case 'project-summary': {
      const matches = resume.projects.filter((item) => item.id === target.itemId);
      if (matches.length !== 1) return { status: 'missing' };
      return {
        status: 'found',
        value: typeof matches[0]?.summary === 'string' ? matches[0].summary : '',
      };
    }
  }
};

export const areEnhancementValuesEqual = (
  left: AIEnhancementFieldValue,
  right: AIEnhancementFieldValue,
): boolean => {
  if (typeof left === 'string' || typeof right === 'string') return left === right;
  return left.length === right.length && left.every((item, index) => item === right[index]);
};

export const displayEnhancementValue = (value: AIEnhancementFieldValue): string =>
  Array.isArray(value) ? value.join('\n') : value;

export const writeEnhancementTarget = (
  resume: ResumeData,
  target: AIEnhancementTarget,
  value: AIEnhancementFieldValue,
): boolean => {
  switch (target.kind) {
    case 'personal-summary': {
      if (typeof value !== 'string') return false;
      resume.personal.summary = value;
      return true;
    }
    case 'experience-highlights': {
      if (!Array.isArray(value)) return false;
      const matches = resume.experience.filter((item) => item.id === target.itemId);
      if (matches.length !== 1 || !matches[0]) return false;
      matches[0].highlights = [...value];
      return true;
    }
    case 'project-summary': {
      if (typeof value !== 'string') return false;
      const matches = resume.projects.filter((item) => item.id === target.itemId);
      if (matches.length !== 1 || !matches[0]) return false;
      matches[0].summary = value;
      return true;
    }
  }
};

export const targetFieldKey = (target: AIEnhancementTarget): string => {
  switch (target.kind) {
    case 'personal-summary': {
      return 'personal.summary';
    }
    case 'experience-highlights': {
      return `experience.${target.itemId}.highlights`;
    }
    case 'project-summary': {
      return `projects.${target.itemId}.summary`;
    }
  }
};
