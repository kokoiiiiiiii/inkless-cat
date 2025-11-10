import type { ResumeTemplate } from '@entities/template';
import { useI18n } from '@shared/i18n';
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
  const { t } = useI18n();
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateTemplate?.(template.id, { name: event.target.value });
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateTemplate?.(template.id, { description: event.target.value });
  };

  const getSystemCopy = (field: 'name' | 'description') => {
    const key = `template.systems.${template.id}.${field}`;
    const value = t(key);
    return value === key ? undefined : value;
  };

  const resolvedName = isCustom ? template.name : (getSystemCopy('name') ?? template.name);
  const resolvedDescription = isCustom
    ? template.description
    : (getSystemCopy('description') ?? template.description);

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <input
              className="rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
              type="text"
              value={template.name}
              placeholder={t('template.inputs.namePlaceholder')}
              onChange={handleNameChange}
            />
          ) : (
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {resolvedName}
            </span>
          )}
          {isActive && (
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-400/20 dark:text-brand-200">
              {t('template.badges.current')}
            </span>
          )}
          {isCustom && (
            <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {t('template.badges.custom')}
            </span>
          )}
        </div>
        {isCustom ? (
          <input
            className="mt-1 w-full rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-xs text-slate-600 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:focus:border-brand-400"
            type="text"
            value={template.description || ''}
            placeholder={t('template.inputs.descriptionPlaceholder')}
            onChange={handleDescriptionChange}
          />
        ) : (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resolvedDescription}</p>
        )}
      </div>
      <span
        className="h-10 w-10 rounded-xl shadow-inner shadow-slate-200/60 dark:shadow-slate-900/40"
        style={{ background: template.accentColor }}
      />
    </div>
  );
};
