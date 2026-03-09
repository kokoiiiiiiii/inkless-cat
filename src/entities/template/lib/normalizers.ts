import type { TemplateTheme } from '../types';

const THEME_KEYS: (keyof TemplateTheme)[] = [
  'accent',
  'background',
  'heading',
  'subheading',
  'text',
  'muted',
  'cardBackground',
  'cardBorder',
  'divider',
];

export const normalizeTemplateTheme = (theme: unknown): TemplateTheme | undefined => {
  if (!theme || typeof theme !== 'object') {
    return undefined;
  }

  const normalized: TemplateTheme = {};
  for (const key of THEME_KEYS) {
    const value = (theme as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      normalized[key] = value.trim();
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};
