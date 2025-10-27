import type { TemplateTheme } from '@entities/template';

export const baseCardClass =
  'relative flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm transition hover:border-brand-400/60 hover:shadow-lg dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-brand-400/60 dark:hover:shadow-brand-500/20';

export const activeCardClass =
  'border-brand-500/70 shadow-lg shadow-brand-500/20 ring-2 ring-brand-500/30 dark:ring-brand-400/30';

export const DEFAULT_CUSTOM_THEME: TemplateTheme = {
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

export type StyleOption = {
  value: string;
  label: string;
};

export const styleOptions: StyleOption[] = [
  { value: 'modern', label: '现代风格（Modern）' },
  { value: 'classic', label: '商务风格（Classic）' },
  { value: 'creative', label: '创意风格（Creative）' },
  { value: 'custom', label: '自定义风格（Custom）' },
];
