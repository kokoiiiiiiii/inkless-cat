import { templateThemeSchema } from '../schema/template';
import type { TemplateTheme } from '../types';

export const DEFAULT_TEMPLATE_THEME: Required<TemplateTheme> = {
  accent: '#2563eb',
  background: '#ffffff',
  heading: '#0f172a',
  subheading: '#2563eb',
  text: '#1f2937',
  muted: '#64748b',
  cardBackground: '#f8fafc',
  cardBorder: '#e2e8f0',
  divider: '#e2e8f0',
};

export const resolveCustomTemplateTheme = (theme: unknown): Required<TemplateTheme> => {
  const parsedTheme = templateThemeSchema.safeParse(theme);
  return {
    ...DEFAULT_TEMPLATE_THEME,
    ...(parsedTheme.success ? parsedTheme.data : {}),
  };
};
