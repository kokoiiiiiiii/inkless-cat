import { resolveCustomTemplateTheme, type ResumeTemplate } from '@entities/template';
import { useI18n } from '@shared/i18n';
import { useMemo } from 'react';

import { activeCardClass, baseCardClass } from './constants';
import { CustomTemplateControls } from './CustomTemplateControls';
import { TemplateCardHeader } from './TemplateCardHeader';
import { TemplateThumbnail } from './TemplateThumbnail';
import type { TemplateUpdatePayload } from './types';

type TemplateCardProps = {
  template: ResumeTemplate;
  activeId: string;
  radioGroupName: string;
  radioId: string;
  onStyleChange: (template: ResumeTemplate) => void;
  onLoadSample: (template: ResumeTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
  isCustom: boolean;
};

const TemplateCard = ({
  template,
  activeId,
  radioGroupName,
  radioId,
  onStyleChange,
  onLoadSample,
  onDeleteTemplate,
  onUpdateTemplate,
  isCustom,
}: TemplateCardProps) => {
  const { t } = useI18n();
  const isActive = template.id === activeId;
  const isCustomStyle = template.previewStyle === 'custom';
  const nameId = `${radioId}-name`;
  const descriptionId = `${radioId}-description`;
  const statusId = `${radioId}-status`;
  const theme = useMemo(() => resolveCustomTemplateTheme(template.theme), [template.theme]);

  const handleThemeColorChange = (key: keyof typeof theme, value: string) => {
    if (!onUpdateTemplate) {
      return;
    }
    onUpdateTemplate(template.id, { theme: { ...theme, [key]: value } });
  };

  return (
    <article
      className={`${baseCardClass} ${isActive ? activeCardClass : ''}`}
      data-template-id={template.id}
    >
      <div className="grid grid-cols-[auto_56px_minmax(0,1fr)] items-start gap-3 xl:grid-cols-[auto_56px_minmax(0,1fr)_auto]">
        <input
          id={radioId}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          type="radio"
          name={radioGroupName}
          value={template.id}
          checked={isActive}
          tabIndex={isActive ? 0 : -1}
          aria-labelledby={nameId}
          aria-describedby={isActive ? `${descriptionId} ${statusId}` : descriptionId}
          onChange={() => onStyleChange(template)}
        />
        <TemplateThumbnail
          previewStyle={template.previewStyle}
          accentColor={template.accentColor}
          theme={template.theme}
        />
        <TemplateCardHeader
          template={template}
          isActive={isActive}
          isCustom={isCustom}
          radioId={radioId}
          nameId={nameId}
          descriptionId={descriptionId}
          statusId={statusId}
        />
        <button
          type="button"
          className="col-span-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300/80 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-brand-400 hover:bg-brand-50/70 hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 motion-reduce:transition-none dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:bg-brand-400/10 dark:hover:text-brand-100 xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:w-auto xl:min-w-36 xl:self-center"
          onClick={() => onLoadSample(template)}
        >
          {t('template.actions.loadSample')}
        </button>
      </div>
      {isCustom && (
        <CustomTemplateControls
          template={template}
          theme={theme}
          isCustomStyle={isCustomStyle}
          onDeleteTemplate={onDeleteTemplate}
          onUpdateTemplate={onUpdateTemplate}
          onThemeChange={handleThemeColorChange}
        />
      )}
    </article>
  );
};

export default TemplateCard;
