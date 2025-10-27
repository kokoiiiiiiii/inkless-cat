import type { ResumeCustomField } from '@entities/resume';
import { createId } from '@shared/lib/id';

export const cleanListInput = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const ensureId = (prefix: string): string => createId(prefix);

export const createCustomField = (): ResumeCustomField => ({
  id: ensureId('custom-field'),
  label: '',
  value: '',
});
