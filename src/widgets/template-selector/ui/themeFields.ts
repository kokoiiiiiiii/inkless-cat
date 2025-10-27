import type { TemplateTheme } from '@entities/template';

export type TemplateThemeFieldConfig = {
  key: keyof TemplateTheme;
  label: string;
  fallback: string;
};

export const TEMPLATE_THEME_FIELDS: TemplateThemeFieldConfig[] = [
  { key: 'background', label: '背景', fallback: '#ffffff' },
  { key: 'heading', label: '标题', fallback: '#0f172a' },
  { key: 'subheading', label: '副标题', fallback: '#2563eb' },
  { key: 'text', label: '正文', fallback: '#1f2937' },
  { key: 'muted', label: '次要信息', fallback: '#64748b' },
  { key: 'cardBackground', label: '卡片背景', fallback: '#f8fafc' },
  { key: 'cardBorder', label: '卡片边框', fallback: '#e2e8f0' },
  { key: 'divider', label: '分隔线', fallback: '#e2e8f0' },
];
