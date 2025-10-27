import type { ResumeCustomField } from '@entities/resume';

export const formatList = (items: string[] = []): string =>
  items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join('\n');

export const formatDateRange = (start?: string, end?: string): string => {
  if (!start && !end) return '';
  if (start && end) return `${start} — ${end}`;
  return start || end || '';
};

export const normalizeField = (
  field: ResumeCustomField | null | undefined,
): { label: string; value: string } => ({
  label: typeof field?.label === 'string' ? field.label.trim() : '',
  value: typeof field?.value === 'string' ? field.value.trim() : '',
});
