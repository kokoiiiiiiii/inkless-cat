import { useI18n } from '@shared/i18n';
import { useEffect } from 'react';

import TemplateCard from './TemplateCard';
import TemplateCreationForm from './TemplateCreationForm';
import type { TemplateSelectorProps } from './types';

const TemplateSelector = ({
  builtInTemplates = [],
  customTemplates = [],
  activeId,
  onStyleChange,
  onLoadSample,
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
  onReady,
}: TemplateSelectorProps) => {
  const { t } = useI18n();
  useEffect(() => {
    if (typeof onReady === 'function') {
      onReady();
    }
  }, [onReady]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('template.panelTitle')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('template.panelDescription')}
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t('template.systemTemplates')}
        </h4>
        <div className="space-y-3">
          {builtInTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              activeId={activeId}
              onStyleChange={onStyleChange}
              onLoadSample={onLoadSample}
              onDeleteTemplate={onDeleteTemplate}
              onUpdateTemplate={onUpdateTemplate}
              isCustom={false}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t('template.customTemplates')}
          </h4>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {t('template.customTemplatesHint')}
          </span>
        </div>
        {customTemplates.length > 0 ? (
          <div className="space-y-3">
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                activeId={activeId}
                onStyleChange={onStyleChange}
                onLoadSample={onLoadSample}
                onDeleteTemplate={onDeleteTemplate}
                onUpdateTemplate={onUpdateTemplate}
                isCustom
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('template.emptyCustomTip')}
          </p>
        )}

        {typeof onSaveTemplate === 'function' && (
          <TemplateCreationForm onSaveTemplate={onSaveTemplate} />
        )}
      </div>
    </section>
  );
};

export default TemplateSelector;
