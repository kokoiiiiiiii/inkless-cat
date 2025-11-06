import type { CSSProperties } from 'react';

export type VariantKey = 'modern' | 'classic' | 'creative' | 'custom';

export type VariantConfig = {
  article: string;
  heading: string;
  subheading: string;
  metaWrapper: string;
  metaLabel: string;
  metaValue: string;
  sectionHeading: string;
  divider: string;
  card: string;
  chip: string;
  link: string;
  accentBar: string;
  bullet: string;
  timelineBorder: string;
  timelineMeta: string;
};

const modernVariant: VariantConfig = {
  article: 'border border-slate-200/80 bg-white/90 text-slate-600 shadow-soft',
  heading: 'text-slate-900 dark:text-white',
  subheading: 'text-blue-600 dark:text-blue-300',
  metaWrapper: 'text-slate-500 dark:text-slate-400',
  metaLabel: 'text-slate-700 dark:text-slate-300',
  metaValue: 'text-slate-500 dark:text-slate-400',
  sectionHeading: 'text-slate-900 dark:text-white',
  divider: 'border-slate-200 dark:border-slate-800',
  card: 'border border-slate-200/80 bg-slate-50/70 dark:border-slate-800/70 dark:bg-slate-900/40',
  chip: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200',
  link: 'text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200',
  accentBar: 'bg-blue-500/80',
  bullet: 'bg-blue-500',
  timelineBorder: 'border-slate-200 dark:border-slate-700',
  timelineMeta: 'text-slate-400 dark:text-slate-500',
};

const customVariant: VariantConfig = {
  article: 'border border-slate-200/50 bg-white/95 shadow-soft',
  heading: '',
  subheading: '',
  metaWrapper: '',
  metaLabel: '',
  metaValue: '',
  sectionHeading: '',
  divider: 'border-slate-200/50',
  card: 'border border-slate-200/40 bg-white/80',
  chip: '',
  link: '',
  accentBar: 'bg-slate-400/40',
  bullet: 'bg-slate-400',
  timelineBorder: 'border-slate-200/40',
  timelineMeta: '',
};

const variantConfig: Record<VariantKey, VariantConfig> = {
  modern: modernVariant,
  classic: {
    article:
      'border border-slate-800 bg-slate-950 text-slate-200 shadow-[0_35px_70px_-40px_rgba(15,23,42,0.85)]',
    heading: 'text-slate-100',
    subheading: 'text-cyan-300',
    metaWrapper: 'text-slate-300/80',
    metaLabel: 'text-slate-200',
    metaValue: 'text-slate-300/80',
    sectionHeading: 'text-cyan-200',
    divider: 'border-slate-800',
    card: 'border border-slate-800 bg-slate-900/60',
    chip: 'bg-cyan-500/20 text-cyan-200',
    link: 'text-cyan-300 hover:text-cyan-200',
    accentBar: 'bg-cyan-400',
    bullet: 'bg-cyan-300',
    timelineBorder: 'border-slate-800',
    timelineMeta: 'text-cyan-200/60',
  },
  creative: {
    article:
      'border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-slate-100 text-slate-600 shadow-[0_35px_70px_-40px_rgba(236,72,153,0.55)]',
    heading: 'text-rose-600',
    subheading: 'text-amber-500',
    metaWrapper: 'text-rose-400',
    metaLabel: 'text-rose-500',
    metaValue: 'text-rose-400',
    sectionHeading: 'text-rose-600',
    divider: 'border-rose-100',
    card: 'border border-rose-100/80 bg-white/75',
    chip: 'bg-rose-100 text-rose-500',
    link: 'text-rose-500 hover:text-rose-400',
    accentBar: 'bg-rose-400/80',
    bullet: 'bg-rose-400',
    timelineBorder: 'border-rose-100',
    timelineMeta: 'text-rose-300',
  },
  custom: customVariant,
};

export const resolveVariant = (style: string): VariantConfig =>
  style in variantConfig ? variantConfig[style as VariantKey] : variantConfig.modern;

export type ThemeStyles = {
  article?: CSSProperties;
  heading?: CSSProperties;
  subheading?: CSSProperties;
  text?: CSSProperties;
  muted?: CSSProperties;
  card?: CSSProperties;
  divider?: CSSProperties;
  chip?: CSSProperties;
  link?: CSSProperties;
};
