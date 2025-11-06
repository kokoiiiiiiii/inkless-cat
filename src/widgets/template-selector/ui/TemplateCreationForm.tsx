import type { TemplateTheme } from '@entities/template';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_CUSTOM_THEME, styleOptions } from './constants';
import { TEMPLATE_THEME_FIELDS } from './themeFields';
import type { TemplateUpdatePayload } from './types';

type TemplateCreationFormProps = {
  onSaveTemplate: (payload: TemplateUpdatePayload) => void;
};

type TemplateCreationFormState = {
  templateName: string;
  templateDescription: string;
  accentColor: string;
  previewStyle: string;
  customTheme: TemplateTheme;
};

type TemplateCreationActions = {
  setTemplateName: (value: string) => void;
  setTemplateDescription: (value: string) => void;
  setAccentColor: (value: string) => void;
  setPreviewStyle: (value: string) => void;
  updateThemeField: (key: keyof TemplateTheme, value: string) => void;
  reset: () => void;
};

const useTemplateCreationState = (): [TemplateCreationFormState, TemplateCreationActions] => {
  const [formState, setFormState] = useState<TemplateCreationFormState>({
    templateName: '',
    templateDescription: '',
    accentColor: '#2563eb',
    previewStyle: 'modern',
    customTheme: { ...DEFAULT_CUSTOM_THEME },
  });

  const setTemplateName = useCallback(
    (value: string) => setFormState((prev) => ({ ...prev, templateName: value })),
    [],
  );
  const setTemplateDescription = useCallback(
    (value: string) => setFormState((prev) => ({ ...prev, templateDescription: value })),
    [],
  );
  const setAccentColor = useCallback(
    (value: string) => setFormState((prev) => ({ ...prev, accentColor: value })),
    [],
  );
  const setPreviewStyle = useCallback(
    (value: string) => setFormState((prev) => ({ ...prev, previewStyle: value })),
    [],
  );
  const updateThemeField = useCallback(
    (key: keyof TemplateTheme, value: string) =>
      setFormState((prev) => ({
        ...prev,
        customTheme: {
          ...prev.customTheme,
          [key]: value,
        },
      })),
    [],
  );
  const reset = useCallback(
    () =>
      setFormState({
        templateName: '',
        templateDescription: '',
        accentColor: '#2563eb',
        previewStyle: 'modern',
        customTheme: { ...DEFAULT_CUSTOM_THEME },
      }),
    [],
  );

  return [
    formState,
    {
      setTemplateName,
      setTemplateDescription,
      setAccentColor,
      setPreviewStyle,
      updateThemeField,
      reset,
    },
  ];
};

type TemplateBasicsFieldsProps = {
  templateName: string;
  templateDescription: string;
  previewStyle: string;
  accentColor: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onAccentChange: (value: string) => void;
};

const TemplateBasicsFields = ({
  templateName,
  templateDescription,
  previewStyle,
  accentColor,
  onNameChange,
  onDescriptionChange,
  onStyleChange,
  onAccentChange,
}: TemplateBasicsFieldsProps) => (
  <>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        模板名称
        <input
          className="h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
          type="text"
          value={templateName}
          placeholder="例如：深色商务模板"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        风格
        <select
          className="h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
          value={previewStyle}
          onChange={(event) => onStyleChange(event.target.value)}
        >
          {styleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
      模板描述（可选）
      <input
        className="h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
        type="text"
        value={templateDescription}
        placeholder="简要说明适用场景或亮点"
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
    </label>
    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
      品牌色
      <input
        className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
        type="color"
        value={accentColor}
        onChange={(event) => onAccentChange(event.target.value)}
      />
    </label>
  </>
);

const CustomThemeFieldGrid = ({
  theme,
  onChange,
}: {
  theme: TemplateTheme;
  onChange: (key: keyof TemplateTheme, value: string) => void;
}) => (
  <div className="grid gap-3 md:grid-cols-2">
    {TEMPLATE_THEME_FIELDS.map(({ key, label, fallback }) => (
      <label
        key={key}
        className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400"
      >
        {label}
        <input
          className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
          type="color"
          value={theme[key] ?? DEFAULT_CUSTOM_THEME[key] ?? fallback}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(key, event.target.value)}
        />
      </label>
    ))}
  </div>
);

const TemplateCreationForm = ({ onSaveTemplate }: TemplateCreationFormProps) => {
  const [formState, actions] = useTemplateCreationState();
  const {
    setTemplateName,
    setTemplateDescription,
    setAccentColor,
    setPreviewStyle,
    updateThemeField,
    reset,
  } = actions;
  const { templateName, templateDescription, accentColor, previewStyle, customTheme } = formState;
  const isCustomStyle = previewStyle === 'custom';

  useEffect(() => {
    if (isCustomStyle) {
      updateThemeField('accent', accentColor);
    }
  }, [accentColor, isCustomStyle, updateThemeField]);

  const resolvedTheme = useMemo(() => ({ ...DEFAULT_CUSTOM_THEME, ...customTheme }), [customTheme]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: TemplateUpdatePayload = {
      name: templateName.trim(),
      description: templateDescription.trim(),
      accentColor,
      previewStyle,
      theme: isCustomStyle
        ? {
            ...DEFAULT_CUSTOM_THEME,
            ...resolvedTheme,
            accent: accentColor,
          }
        : undefined,
    };
    onSaveTemplate(payload);
    reset();
  };

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
      onSubmit={handleSubmit}
    >
      <TemplateBasicsFields
        templateName={templateName}
        templateDescription={templateDescription}
        previewStyle={previewStyle}
        accentColor={accentColor}
        onNameChange={setTemplateName}
        onDescriptionChange={setTemplateDescription}
        onStyleChange={setPreviewStyle}
        onAccentChange={setAccentColor}
      />
      {isCustomStyle && <CustomThemeFieldGrid theme={resolvedTheme} onChange={updateThemeField} />}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        保存当前简历为模板
      </button>
    </form>
  );
};

export default TemplateCreationForm;
