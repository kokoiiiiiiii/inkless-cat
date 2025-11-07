import { createSampleResume, normalizeResumeSchema, type ResumeData } from '@entities/resume';

import { getStoredValue, isBrowser, LEGACY_KEYS, STORAGE_KEY } from './storage';

export const loadInitialResume = (): ResumeData => {
  if (!isBrowser) {
    return normalizeResumeSchema(createSampleResume(), { clone: true });
  }
  const cached = getStoredValue(STORAGE_KEY, LEGACY_KEYS.data);
  if (cached) {
    try {
      return normalizeResumeSchema(JSON.parse(cached) as ResumeData, { clone: true });
    } catch {
      // ignore parse errors and fall back to defaults
    }
  }
  return normalizeResumeSchema(createSampleResume(), { clone: true });
};
