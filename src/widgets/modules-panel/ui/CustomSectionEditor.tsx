import type {
  ResumeCustomField,
  ResumeCustomSection,
  ResumeCustomSectionMode,
} from '@entities/resume';
import type { SectionFocusHandler } from '@features/modules-panel';
import { useI18n } from '@shared/i18n';
import { memo } from 'react';

import {
  cardClass,
  customModeOptions,
  dangerButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  subtleButtonClass,
  textareaClass,
} from './constants';

type CustomSectionEditorProps = {
  sectionKey: string;
  section: ResumeCustomSection;
  onTitleChange: (sectionId: string, value: string) => void;
  onModeChange: (sectionId: string, mode: ResumeCustomSection['mode']) => void;
  onItemsChange: (sectionId: string, value: string) => void;
  onFieldChange: (
    sectionId: string,
    fieldId: string,
    key: keyof ResumeCustomField,
    value: string,
  ) => void;
  onFieldAdd: (sectionId: string) => void;
  onFieldRemove: (sectionId: string, fieldId: string) => void;
  onTextChange: (sectionId: string, value: string) => void;
  onRemove: (sectionId: string) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
};

const CustomSectionEditor = memo(
  ({
    sectionKey,
    section,
    onTitleChange,
    onModeChange,
    onItemsChange,
    onFieldChange,
    onFieldAdd,
    onFieldRemove,
    onTextChange,
    onRemove,
    notifyFocus,
    sectionRef,
  }: CustomSectionEditorProps) => {
    const { t } = useI18n();
    const mode: ResumeCustomSectionMode = section.mode ?? 'list';
    const itemsValue = Array.isArray(section.items) ? section.items.join('\n') : '';
    const fieldsValue = Array.isArray(section.fields) ? section.fields : [];
    const textValue = typeof section.text === 'string' ? section.text : '';
    const fallbackTitle = section.title || t('modules.customSection.defaultTitle');

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {fallbackTitle}
          </h3>
          <button
            type="button"
            className={dangerButtonClass}
            onClick={() => {
              const shouldRemove =
                typeof globalThis === 'undefined' ||
                globalThis.confirm(
                  t('modules.customSection.confirmDelete', {
                    name: section.title || t('modules.customSection.untitled'),
                  }),
                );
              if (shouldRemove) {
                onRemove?.(section.id);
              }
            }}
          >
            {t('modules.customSection.deleteModule')}
          </button>
        </header>
        <div className={cardClass}>
          <div className="space-y-4">
            <label className={labelClass}>
              <span className={labelTextClass}>{t('modules.customSection.nameLabel')}</span>
              <input
                className={inputClass}
                type="text"
                value={section.title || ''}
                placeholder={t('modules.customSection.namePlaceholder')}
                onChange={(event) => onTitleChange(section.id, event.target.value)}
                onFocus={() => notifyFocus(sectionKey, section.id)}
              />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{t('modules.customSection.modeLabel')}</span>
              <select
                className={inputClass}
                value={mode}
                onChange={(event) =>
                  onModeChange(section.id, event.target.value as ResumeCustomSectionMode)
                }
                onFocus={() => notifyFocus(sectionKey, `${section.id}-mode`)}
              >
                {customModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'list' && (
              <label className={labelClass}>
                <span className={labelTextClass}>{t('modules.customSection.listLabel')}</span>
                <textarea
                  className={textareaClass}
                  rows={4}
                  value={itemsValue}
                  placeholder={t('modules.customSection.listPlaceholder')}
                  onChange={(event) => onItemsChange(section.id, event.target.value)}
                  onFocus={() => notifyFocus(sectionKey, section.id)}
                />
              </label>
            )}
            {mode === 'fields' && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className={labelTextClass}>{t('modules.customSection.fieldsLabel')}</span>
                  <button
                    type="button"
                    className={subtleButtonClass}
                    onClick={() => onFieldAdd(section.id)}
                  >
                    {t('modules.customSection.addField')}
                  </button>
                </div>
                {fieldsValue.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300/70 bg-white/60 px-3 py-4 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400">
                    {t('modules.customSection.fieldsEmpty')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fieldsValue.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
                      >
                        <div className="flex flex-col gap-3 md:flex-row">
                          <label className={`${labelClass} md:flex-1`}>
                            <span className={labelTextClass}>
                              {t('modules.customSection.fieldNameLabel')}
                            </span>
                            <input
                              className={inputClass}
                              type="text"
                              value={field.label || ''}
                              placeholder={t('modules.customSection.fieldNamePlaceholder')}
                              onChange={(event) =>
                                onFieldChange(section.id, field.id, 'label', event.target.value)
                              }
                              onFocus={() => notifyFocus(sectionKey, `${field.id}-label`)}
                            />
                          </label>
                          <label className={`${labelClass} md:flex-1`}>
                            <span className={labelTextClass}>
                              {t('modules.customSection.fieldValueLabel')}
                            </span>
                            <input
                              className={inputClass}
                              type="text"
                              value={field.value || ''}
                              placeholder={t('modules.customSection.fieldValuePlaceholder')}
                              onChange={(event) =>
                                onFieldChange(section.id, field.id, 'value', event.target.value)
                              }
                              onFocus={() => notifyFocus(sectionKey, `${field.id}-value`)}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            className={dangerButtonClass}
                            onClick={() => onFieldRemove(section.id, field.id)}
                          >
                            {t('modules.customSection.removeField')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {mode === 'text' && (
              <label className={labelClass}>
                <span className={labelTextClass}>{t('modules.customSection.textLabel')}</span>
                <textarea
                  className={textareaClass}
                  rows={5}
                  value={textValue}
                  placeholder={t('modules.customSection.textPlaceholder')}
                  onChange={(event) => onTextChange(section.id, event.target.value)}
                  onFocus={() => notifyFocus(sectionKey, `${section.id}-text`)}
                />
              </label>
            )}
          </div>
        </div>
      </section>
    );
  },
);

CustomSectionEditor.displayName = 'CustomSectionEditor';

export default CustomSectionEditor;
