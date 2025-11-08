import type { ResumeTemplate, TemplateTheme } from '@entities/template';
import { useI18n } from '@shared/i18n';
import { useMemo } from 'react';

import { activeCardClass, baseCardClass, DEFAULT_CUSTOM_THEME } from './constants';
import { CustomTemplateControls } from './CustomTemplateControls';
import { TemplateCardHeader } from './TemplateCardHeader';
import type { TemplateUpdatePayload } from './types';

type TemplateCardProps = {
  template: ResumeTemplate;
  activeId: string;
  onStyleChange: (template: ResumeTemplate) => void;
  onLoadSample: (template: ResumeTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
  isCustom: boolean;
};

const TemplateCard = ({
  template,
  activeId,
  onStyleChange,
  onLoadSample,
  onDeleteTemplate,
  onUpdateTemplate,
  isCustom,
}: TemplateCardProps) => {
  const { t } = useI18n();
  const isActive = template.id === activeId;
  const isCustomStyle = template.previewStyle === 'custom';
  const theme = useMemo<TemplateTheme>(() => {
    if (!template.theme) {
      return { ...DEFAULT_CUSTOM_THEME };
    }
    return { ...DEFAULT_CUSTOM_THEME, ...template.theme };
  }, [template.theme]);

  const handleThemeColorChange = (key: keyof TemplateTheme, value: string) => {
    if (!onUpdateTemplate) {
      return;
    }
    const nextTheme = { ...theme, [key]: value };
    onUpdateTemplate(template.id, { theme: nextTheme });
  };

  return (
    <article className={`${baseCardClass} ${isActive ? activeCardClass : ''}`}>
      <TemplateCardHeader
        template={template}
        isActive={isActive}
        isCustom={isCustom}
        onUpdateTemplate={onUpdateTemplate}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-slate-200/70 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          onClick={() => onStyleChange(template)}
        >
          {t('template.actions.useStyle')}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-brand-500/30 transition hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
          onClick={() => onLoadSample(template)}
        >
          {t('template.actions.loadSample')}
        </button>
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
      </div>
    </article>
  );
};

export default TemplateCard;
