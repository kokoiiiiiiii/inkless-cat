import type { TemplateTheme } from '@entities/template';

export type TemplateThemeFieldConfig = {
  key: keyof TemplateTheme;
  labelKey: string;
  fallback: string;
};

export const TEMPLATE_THEME_FIELDS: TemplateThemeFieldConfig[] = [
  { key: 'background', labelKey: 'template.themeFields.background', fallback: '#ffffff' },
  { key: 'heading', labelKey: 'template.themeFields.heading', fallback: '#0f172a' },
  { key: 'subheading', labelKey: 'template.themeFields.subheading', fallback: '#2563eb' },
  { key: 'text', labelKey: 'template.themeFields.text', fallback: '#1f2937' },
  { key: 'muted', labelKey: 'template.themeFields.muted', fallback: '#64748b' },
  { key: 'cardBackground', labelKey: 'template.themeFields.cardBackground', fallback: '#f8fafc' },
  { key: 'cardBorder', labelKey: 'template.themeFields.cardBorder', fallback: '#e2e8f0' },
  { key: 'divider', labelKey: 'template.themeFields.divider', fallback: '#e2e8f0' },
];
