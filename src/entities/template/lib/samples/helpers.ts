import type { ResumeData } from '@entities/resume';
import { createEmptyResume } from '@entities/resume';

export const buildResume = (overrides: Partial<ResumeData>): ResumeData =>
  ({
    ...createEmptyResume(),
    ...overrides,
  }) as ResumeData;
