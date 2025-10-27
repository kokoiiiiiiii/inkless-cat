import type { ResumeTemplate } from '@entities/template';
import { type ChangeEvent } from 'react';

import type { TemplateUpdatePayload } from './types';

type TemplateCardHeaderProps = {
  template: ResumeTemplate;
  isActive: boolean;
  isCustom: boolean;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
};

export const TemplateCardHeader = ({
  template,
  isActive,
  isCustom,
  onUpdateTemplate,
}: TemplateCardHeaderProps) => {
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateTemplate?.(template.id, { name: event.target.value });
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateTemplate?.(template.id, { description: event.target.value });
  };

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <input
              className="rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
              type="text"
              value={template.name}
              placeholder="自定义模板"
              onChange={handleNameChange}
            />
          ) : (
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {template.name}
            </span>
          )}
          {isActive && (
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-400/20 dark:text-brand-200">
              当前
            </span>
          )}
          {isCustom && (
            <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              自定义
            </span>
          )}
        </div>
        {isCustom ? (
          <input
            className="mt-1 w-full rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-xs text-slate-600 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:focus:border-brand-400"
            type="text"
            value={template.description || ''}
            placeholder="模板用途说明"
            onChange={handleDescriptionChange}
          />
        ) : (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
        )}
      </div>
      <span
        className="h-10 w-10 rounded-xl shadow-inner shadow-slate-200/60 dark:shadow-slate-900/40"
        style={{ background: template.accentColor }}
      />
    </div>
  );
};
