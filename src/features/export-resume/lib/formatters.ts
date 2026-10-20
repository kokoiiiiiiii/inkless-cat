import type { ResumeCustomField } from '@entities/resume';

export const escapeMarkdownText = (value: string): string =>
  value
    .split('\n')
    .map((line) => {
      const escaped = line.replaceAll(/([\\`*_{}\[\]])/gu, String.raw`\$1`);
      return escaped.replace(/^(\s*)(#{1,6}|>|[-+*]\s|\d+\.\s)/u, String.raw`$1\$2`);
    })
    .join('\n');

export const formatList = (items: string[] = []): string =>
  items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => `- ${escapeMarkdownText(item)}`)
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
