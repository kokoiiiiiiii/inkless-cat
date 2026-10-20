import { DEFAULT_TEMPLATE_THEME } from '@entities/template';

export const baseCardClass =
  'relative flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-300/80 focus-within:ring-offset-2 motion-reduce:transition-none dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-slate-600 dark:focus-within:ring-brand-400/40 dark:focus-within:ring-offset-slate-900';

export const activeCardClass =
  'border-brand-500/70 bg-brand-50/50 ring-2 ring-brand-500/20 dark:border-brand-400/70 dark:bg-brand-400/5 dark:ring-brand-400/25';

export const DEFAULT_CUSTOM_THEME = DEFAULT_TEMPLATE_THEME;

export type StyleOption = {
  value: string;
  labelKey: string;
};

export const styleOptions: StyleOption[] = [
  { value: 'modern', labelKey: 'template.styleOptions.modern' },
  { value: 'classic', labelKey: 'template.styleOptions.classic' },
  { value: 'creative', labelKey: 'template.styleOptions.creative' },
  { value: 'custom', labelKey: 'template.styleOptions.custom' },
];
