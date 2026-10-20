import type { ResumeTemplate } from '@entities/template';
import { useI18n } from '@shared/i18n';

type TemplateCardHeaderProps = {
  template: ResumeTemplate;
  isActive: boolean;
  isCustom: boolean;
  radioId: string;
  nameId: string;
  descriptionId: string;
  statusId: string;
};

export const TemplateCardHeader = ({
  template,
  isActive,
  isCustom,
  radioId,
  nameId,
  descriptionId,
  statusId,
}: TemplateCardHeaderProps) => {
  const { t } = useI18n();

  const getSystemCopy = (field: 'name' | 'description') => {
    const key = 'template.systems.' + template.id + '.' + field;
    const value = t(key);
    return value === key ? undefined : value;
  };

  const resolvedName = isCustom ? template.name : (getSystemCopy('name') ?? template.name);
  const resolvedDescription = isCustom
    ? template.description
    : (getSystemCopy('description') ?? template.description);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <label
          id={nameId}
          htmlFor={radioId}
          className="cursor-pointer break-words text-sm font-semibold text-slate-900 dark:text-white"
        >
          {resolvedName}
        </label>
        {isActive && (
          <span
            id={statusId}
            className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
          >
            {t('template.badges.current')}
          </span>
        )}
        {isCustom && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t('template.badges.custom')}
          </span>
        )}
      </div>
      <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
        {resolvedDescription || t('template.inputs.descriptionPlaceholder')}
      </p>
    </div>
  );
};
