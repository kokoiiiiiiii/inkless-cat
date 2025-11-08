import { sectionDefinitions, type StandardSectionKey } from '@entities/module';
import type { ResumeSectionItem } from '@features/edit-module';
import { useI18n } from '@shared/i18n';
import { memo, type ReactNode } from 'react';

import {
  cardClass,
  dangerButtonClass,
  emptyStateClass,
  inputClass,
  labelClass,
  labelMap,
  labelTextClass,
  subtleButtonClass,
  textareaClass,
} from './constants';
import type { FieldHelpers } from './sectionFieldRenderers';
import { renderSectionFields } from './sectionFieldRenderers';
import type { SectionFocusHandler } from './types';

type ResumeSectionProps = {
  sectionKey: StandardSectionKey;
  items: ResumeSectionItem[];
  onAddItem: (sectionKey: StandardSectionKey) => void;
  onRemoveItem: (sectionKey: StandardSectionKey, index: number) => void;
  onFieldChange: (
    sectionKey: StandardSectionKey,
    index: number,
    field: string,
    value: string,
  ) => void;
  onListChange: (
    sectionKey: StandardSectionKey,
    index: number,
    field: string,
    value: string,
  ) => void;
  notifyFocus: SectionFocusHandler;
  sectionRef?: (node: HTMLElement | null) => void;
};

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

type FieldHelperFactoryProps = {
  sectionKey: StandardSectionKey;
  item: ResumeSectionItem;
  index: number;
  itemId: string;
  defaultFocusId: string;
  notifyFocus: SectionFocusHandler;
  onFieldChange: ResumeSectionProps['onFieldChange'];
  onListChange: ResumeSectionProps['onListChange'];
  resolveLabel: (field: string) => string;
  placeholder: (field: string, fallback: string) => string;
};

const FieldLabel = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className={labelClass}>
    <span className={labelTextClass}>{label}</span>
    {children}
  </label>
);

const createFieldHelpers = ({
  sectionKey,
  item,
  index,
  itemId,
  defaultFocusId,
  notifyFocus,
  onFieldChange,
  onListChange,
  resolveLabel,
  placeholder,
}: FieldHelperFactoryProps): FieldHelpers => {
  const handleFocus = (focusId?: string) => () =>
    notifyFocus(sectionKey, focusId ?? defaultFocusId);

  const input: FieldHelpers['input'] = (field, options = {}) => (
    <FieldLabel label={resolveLabel(field)}>
      <input
        className={inputClass}
        type="text"
        value={toStringValue(item[field])}
        placeholder={options.placeholder ?? ''}
        onChange={(event) => onFieldChange(sectionKey, index, field, event.target.value)}
        onFocus={handleFocus(options.focusId)}
      />
    </FieldLabel>
  );

  const textarea: FieldHelpers['textarea'] = (field, options = {}) => (
    <FieldLabel label={resolveLabel(field)}>
      <textarea
        className={textareaClass}
        rows={options.rows ?? 3}
        value={toStringValue(item[field])}
        placeholder={options.placeholder ?? ''}
        onChange={(event) => onFieldChange(sectionKey, index, field, event.target.value)}
        onFocus={handleFocus(options.focusId)}
      />
    </FieldLabel>
  );

  const list: FieldHelpers['list'] = (field, options = {}) => (
    <FieldLabel label={resolveLabel(field)}>
      <textarea
        className={textareaClass}
        rows={options.rows ?? 4}
        value={
          Array.isArray(item[field]) ? (item[field] as string[]).filter(Boolean).join('\n') : ''
        }
        placeholder={options.placeholder ?? ''}
        onChange={(event) => onListChange(sectionKey, index, field, event.target.value)}
        onFocus={handleFocus(options.focusId)}
      />
    </FieldLabel>
  );

  return {
    input,
    textarea,
    list,
    placeholder,
    itemId,
  };
};

const ResumeSection = memo(
  ({
    sectionKey,
    items,
    onAddItem,
    onRemoveItem,
    onFieldChange,
    onListChange,
    notifyFocus,
    sectionRef,
  }: ResumeSectionProps) => {
    const { t } = useI18n();
    const resolveFocusId = (item: ResumeSectionItem, fallback: string): string => {
      return typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : fallback;
    };

    const resolveLabel = (field: string) => {
      const key = labelMap[field];
      if (!key) return field;
      const value = t(key);
      return value === key ? field : value;
    };

    const resolvePlaceholder = (section: string, field: string, fallback: string) => {
      const key = `modules.resume.placeholders.${section}.${field}`;
      const value = t(key);
      return value === key ? fallback : value;
    };

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {(() => {
            const titleKey = sectionDefinitions[sectionKey]?.titleKey;
            const titleValue = titleKey ? t(titleKey) : '';
            const resolvedTitle =
              titleKey && titleValue !== titleKey && titleValue.trim().length > 0
                ? titleValue
                : sectionKey;
            return (
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {resolvedTitle}
              </h3>
            );
          })()}
          <button type="button" className={subtleButtonClass} onClick={() => onAddItem(sectionKey)}>
            {t('modules.resume.add')}
          </button>
        </header>
        {items.length === 0 ? (
          <p className={emptyStateClass}>{t('modules.resume.empty')}</p>
        ) : (
          items.map((item, index) => {
            const itemId = resolveFocusId(item, `${sectionKey}-${index}`);
            const defaultFocusId = resolveFocusId(item, sectionKey);
            const placeholder = (field: string, fallback: string) =>
              resolvePlaceholder(sectionKey, field, fallback);
            const helpers = createFieldHelpers({
              sectionKey,
              item,
              index,
              itemId,
              defaultFocusId,
              notifyFocus,
              onFieldChange,
              onListChange,
              resolveLabel,
              placeholder,
            });
            const sectionFields = renderSectionFields(sectionKey, helpers);
            return (
              <div key={itemId} className={cardClass}>
                {sectionFields && <div className="grid gap-4">{sectionFields}</div>}
                <footer className="flex justify-end pt-2">
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => onRemoveItem(sectionKey, index)}
                  >
                    {t('modules.actions.delete')}
                  </button>
                </footer>
              </div>
            );
          })
        )}
      </section>
    );
  },
);

ResumeSection.displayName = 'ResumeSection';

export default ResumeSection;
