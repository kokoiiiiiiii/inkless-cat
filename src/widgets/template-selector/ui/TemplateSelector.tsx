import type { ResumeTemplate } from '@entities/template';
import { useI18n } from '@shared/i18n';
import { useCallback, useEffect, useId, useRef } from 'react';

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
  const groupId = useId();
  const fieldsetRef = useRef<HTMLFieldSetElement | null>(null);

  useEffect(() => {
    if (typeof onReady === 'function') {
      onReady();
    }
  }, [onReady]);

  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      if (!onDeleteTemplate) return;
      const templates = [...builtInTemplates, ...customTemplates];
      const previousIndex = templates.findIndex((template) => template.id === templateId);
      const wasActive = activeId === templateId;
      onDeleteTemplate(templateId);

      globalThis.setTimeout(() => {
        const fieldset = fieldsetRef.current;
        if (!fieldset) return;
        const deletedCardRemains = [
          ...fieldset.querySelectorAll<HTMLElement>('[data-template-id]'),
        ].some((card) => card.dataset.templateId === templateId);
        if (deletedCardRemains) return;

        const radios = [...fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
        if (wasActive) {
          const selectedRadio = radios.find((radio) => radio.checked);
          const nearestRadio = radios[Math.min(previousIndex, radios.length - 1)];
          (selectedRadio ?? nearestRadio)?.focus({ preventScroll: true });
          return;
        }

        const customIndex = customTemplates.findIndex((template) => template.id === templateId);
        const remainingCustomTemplates = customTemplates.filter(
          (template) => template.id !== templateId,
        );
        const neighborIndex = Math.min(customIndex, remainingCustomTemplates.length - 1);
        const neighborId = remainingCustomTemplates[neighborIndex]?.id;
        const neighborCard = neighborId
          ? [...fieldset.querySelectorAll<HTMLElement>('[data-template-id]')].find(
              (card) => card.dataset.templateId === neighborId,
            )
          : undefined;
        const deleteButton = neighborCard?.querySelector<HTMLButtonElement>(
          'button[data-template-delete]',
        );
        const createNameInput = fieldset.querySelector<HTMLInputElement>('form input[type="text"]');
        const selectedRadio = radios.find((radio) => radio.checked);
        (deleteButton ?? createNameInput ?? selectedRadio)?.focus({ preventScroll: true });
      }, 0);
    },
    [activeId, builtInTemplates, customTemplates, onDeleteTemplate],
  );

  const renderCard = (template: ResumeTemplate, index: number, isCustom: boolean) => {
    const absoluteIndex = isCustom ? builtInTemplates.length + index : index;
    const radioId = `${groupId}-${absoluteIndex}-radio`;

    return (
      <TemplateCard
        key={template.id}
        template={template}
        activeId={activeId}
        radioGroupName={groupId}
        radioId={radioId}
        onStyleChange={onStyleChange}
        onLoadSample={onLoadSample}
        onDeleteTemplate={handleDeleteTemplate}
        onUpdateTemplate={onUpdateTemplate}
        isCustom={isCustom}
      />
    );
  };

  return (
    <section className="space-y-5">
      <header>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('template.panelTitle')}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
          {t('template.panelDescription')}
        </p>
      </header>

      <fieldset ref={fieldsetRef} className="min-w-0 space-y-5">
        <legend className="sr-only">{t('template.selectionLegend')}</legend>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('template.systemTemplates')}
          </h4>
          <div className="space-y-3">
            {builtInTemplates.map((template, index) => renderCard(template, index, false))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('template.customTemplates')}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('template.customTemplatesHint')}
            </span>
          </div>
          {customTemplates.length > 0 ? (
            <div className="space-y-3">
              {customTemplates.map((template, index) => renderCard(template, index, true))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('template.emptyCustomTip')}
            </p>
          )}

          {typeof onSaveTemplate === 'function' && (
            <TemplateCreationForm onSaveTemplate={onSaveTemplate} />
          )}
        </div>
      </fieldset>
    </section>
  );
};

export default TemplateSelector;
