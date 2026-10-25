import type { ResumeData } from '@entities/resume';
import { createEmptyResume } from '@entities/resume-factory';

export const buildResume = (overrides: Partial<ResumeData>): ResumeData => ({
  ...createEmptyResume(),
  ...overrides,
});
