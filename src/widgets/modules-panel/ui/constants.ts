import type { ResumeCustomSectionMode } from '@entities/resume';

export const labelMap: Record<string, string> = {
  label: '名称',
  url: '链接',
  company: '公司',
  role: '职位',
  location: '地点',
  startDate: '起始时间',
  endDate: '结束时间',
  school: '学校',
  degree: '学历',
  details: '详情',
  name: '名称',
  summary: '概述',
  link: '链接',
  title: '标题',
  items: '条目',
  issuer: '颁发机构',
  year: '年份',
  level: '水平',
};

export const cardClass =
  'rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm shadow-slate-200/60 transition hover:border-brand-400/50 hover:shadow-lg hover:shadow-brand-500/10 dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-brand-400/60 sm:p-5';

export const labelClass =
  'flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300';

export const labelTextClass =
  'text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400';

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400';

export const textareaClass =
  'w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 py-3 text-sm leading-relaxed text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

export const subtleButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-slate-300/70 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-300';

export const dangerButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-full border border-transparent bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30';

export const emptyStateClass =
  'rounded-2xl border border-dashed border-slate-300/70 bg-white/60 px-4 py-6 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400';

export const toggleBaseClass =
  'inline-flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300';

export const toggleEnabledClass =
  'border-brand-500/60 bg-brand-500/10 text-brand-600 shadow-sm dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200';

export const toggleDisabledClass =
  'border-slate-300/70 bg-white/80 text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-brand-400 dark:hover:text-brand-200';

export const addCustomButtonClass =
  'inline-flex items-center gap-1 rounded-full border border-brand-500/60 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-brand-400/60 dark:bg-brand-400/20 dark:text-brand-200';

export const removeChipButtonClass =
  'inline-flex items-center justify-center rounded-full border border-transparent bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30';

export const dragItemClass =
  'relative flex cursor-grab select-none items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:border-brand-400 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/60 transition-transform duration-150 ease-out';

export const dragIndicatorClass =
  'pointer-events-none absolute left-4 right-4 h-1 rounded-full bg-brand-500';

export const customModeOptions: Array<{ value: ResumeCustomSectionMode; label: string }> = [
  { value: 'list', label: '列表条目' },
  { value: 'fields', label: '键值对' },
  { value: 'text', label: '自由文本' },
];
