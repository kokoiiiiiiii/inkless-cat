import type { ResumeTemplate, TemplateTheme } from '@entities/template';
import { useI18n } from '@shared/i18n';
import { MAX_TEMPLATE_NAME_LENGTH } from '@shared/lib/limits';
import { type ChangeEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { DEFAULT_CUSTOM_THEME, styleOptions } from './constants';
import { TEMPLATE_THEME_FIELDS } from './themeFields';
import type { TemplateUpdatePayload } from './types';

type CustomTemplateControlsProps = {
  template: ResumeTemplate;
  theme: Required<TemplateTheme>;
  isCustomStyle: boolean;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
  onThemeChange: (key: keyof TemplateTheme, value: string) => void;
};

type ControlButtonProps = {
  children: string;
  tone?: 'default' | 'danger';
  dataTemplateDelete?: boolean;
  onClick: () => void;
};

const ControlButton = ({
  children,
  tone = 'default',
  dataTemplateDelete = false,
  onClick,
}: ControlButtonProps) => {
  const baseClass =
    'inline-flex min-h-10 items-center justify-center rounded-full border border-transparent px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 motion-reduce:transition-none';
  const toneClass =
    tone === 'danger'
      ? 'bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/30'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
  return (
    <button
      type="button"
      className={`${baseClass} ${toneClass}`}
      data-template-delete={dataTemplateDelete || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const StyleSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) => {
  const { t } = useI18n();
  return (
    <label className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
      {t('template.controls.styleLabel')}
      <select
        className="min-h-10 rounded-lg border border-slate-300/70 bg-white px-2 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        value={value}
        onChange={onChange}
      >
        {styleOptions.map((option) => {
          const label = t(option.labelKey);
          return (
            <option key={option.value} value={option.value}>
              {label === option.labelKey ? option.value : label}
            </option>
          );
        })}
      </select>
    </label>
  );
};

const AccentColorPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { t } = useI18n();
  return (
    <label className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
      {t('template.controls.accentLabel')}
      <input
        className="h-9 w-11 cursor-pointer rounded-md border border-slate-300 bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900"
        type="color"
        value={value}
        onChange={onChange}
      />
    </label>
  );
};

const ThemeColorPickers = ({
  theme,
  onChange,
}: {
  theme: Required<TemplateTheme>;
  onChange: (key: keyof TemplateTheme, value: string) => void;
}) => {
  const { t } = useI18n();
  return (
    <>
      {TEMPLATE_THEME_FIELDS.map(({ key, labelKey, fallback }) => (
        <label
          key={key}
          className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          {t(labelKey)}
          <input
            className="h-9 w-11 cursor-pointer rounded-md border border-slate-300 bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900"
            type="color"
            value={theme[key] ?? DEFAULT_CUSTOM_THEME[key] ?? fallback}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(key, event.target.value)}
          />
        </label>
      ))}
    </>
  );
};

export const CustomTemplateControls = ({
  template,
  theme,
  isCustomStyle,
  onDeleteTemplate,
  onUpdateTemplate,
  onThemeChange,
}: CustomTemplateControlsProps) => {
  const { t } = useI18n();
  const nameInputId = useId();
  const nameErrorId = `${nameInputId}-error`;
  const [nameDraft, setNameDraft] = useState(template.name);
  const [nameError, setNameError] = useState('');
  const isNameComposing = useRef(false);

  useEffect(() => {
    setNameDraft(template.name);
    setNameError('');
  }, [template.id, template.name]);

  if (!onUpdateTemplate) {
    return <></>;
  }

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNameDraft(event.target.value);
    setNameError('');
  };

  const handleNameBlur = () => {
    const name = nameDraft.trim();
    if (!name) {
      setNameError(t('template.validation.nameRequired'));
      setNameDraft(template.name);
      return;
    }
    if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
      setNameError(t('template.validation.nameTooLong', { limit: MAX_TEMPLATE_NAME_LENGTH }));
      setNameDraft(template.name);
      return;
    }

    setNameError('');
    setNameDraft(name);
    if (name !== template.name) {
      onUpdateTemplate(template.id, { name });
    }
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      isNameComposing.current ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setNameDraft(template.name);
      setNameError('');
    }
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateTemplate(template.id, { description: event.target.value });
  };

  const handleStyleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onUpdateTemplate(template.id, { previewStyle: event.target.value });
  };

  const handleAccentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const payload: TemplateUpdatePayload = { accentColor: value };
    if (isCustomStyle) {
      payload.theme = { ...theme, accent: value };
    }
    onUpdateTemplate(template.id, payload);
  };

  const handleUpdateExample = () => {
    onUpdateTemplate(template.id, { sample: '__CURRENT__' });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <label htmlFor={nameInputId}>
            {t('template.creation.nameLabel')}
            <input
              id={nameInputId}
              className="min-h-10 w-full rounded-lg border border-slate-300/70 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              type="text"
              value={nameDraft}
              placeholder={t('template.inputs.namePlaceholder')}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? nameErrorId : undefined}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onCompositionStart={() => {
                isNameComposing.current = true;
              }}
              onCompositionEnd={() => {
                isNameComposing.current = false;
              }}
              onKeyDown={handleNameKeyDown}
            />
          </label>
          {nameError && (
            <p
              id={nameErrorId}
              role="alert"
              className="text-xs font-normal text-red-600 dark:text-red-300"
            >
              {nameError}
            </p>
          )}
        </div>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('template.creation.descriptionLabel')}
          <input
            className="min-h-10 w-full rounded-lg border border-slate-300/70 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            type="text"
            value={template.description || ''}
            placeholder={t('template.inputs.descriptionPlaceholder')}
            onChange={handleDescriptionChange}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
        <StyleSelector value={template.previewStyle || 'modern'} onChange={handleStyleChange} />
        <AccentColorPicker
          value={template.accentColor || '#2563eb'}
          onChange={handleAccentChange}
        />
        {isCustomStyle && <ThemeColorPickers theme={theme} onChange={onThemeChange} />}
        <ControlButton onClick={handleUpdateExample}>
          {t('template.actions.updateSample')}
        </ControlButton>
        <ControlButton
          tone="danger"
          dataTemplateDelete
          onClick={() => onDeleteTemplate?.(template.id)}
        >
          {t('template.actions.delete')}
        </ControlButton>
      </div>
    </div>
  );
};
