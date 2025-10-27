import type { ResumeTemplate, TemplateTheme } from '@entities/template';
import type { ChangeEvent } from 'react';

import { DEFAULT_CUSTOM_THEME, styleOptions } from './constants';
import { TEMPLATE_THEME_FIELDS } from './themeFields';
import type { TemplateUpdatePayload } from './types';

type CustomTemplateControlsProps = {
  template: ResumeTemplate;
  theme: TemplateTheme;
  isCustomStyle: boolean;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
  onThemeChange: (key: keyof TemplateTheme, value: string) => void;
};

type ControlButtonProps = {
  children: string;
  tone?: 'default' | 'danger';
  onClick: () => void;
};

const ControlButton = ({ children, tone = 'default', onClick }: ControlButtonProps) => {
  const baseClass =
    'inline-flex items-center justify-center rounded-full border border-transparent px-3 py-1.5 text-xs font-medium transition';
  const toneClass =
    tone === 'danger'
      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30'
      : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300/80 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/60';
  return (
    <button type="button" className={`${baseClass} ${toneClass}`} onClick={onClick}>
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
}) => (
  <label className="inline-flex items-center gap-1">
    风格
    <select
      className="rounded border border-slate-300/70 bg-white/70 px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900/70"
      value={value}
      onChange={onChange}
    >
      {styleOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const AccentColorPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => (
  <label className="inline-flex items-center gap-1">
    品牌色
    <input type="color" value={value} onChange={onChange} />
  </label>
);

const ThemeColorPickers = ({
  theme,
  onChange,
}: {
  theme: TemplateTheme;
  onChange: (key: keyof TemplateTheme, value: string) => void;
}) => (
  <>
    {TEMPLATE_THEME_FIELDS.map(({ key, label, fallback }) => (
      <label key={key} className="inline-flex items-center gap-1">
        {label}
        <input
          type="color"
          value={theme[key] ?? DEFAULT_CUSTOM_THEME[key] ?? fallback}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(key, event.target.value)}
        />
      </label>
    ))}
  </>
);

export const CustomTemplateControls = ({
  template,
  theme,
  isCustomStyle,
  onDeleteTemplate,
  onUpdateTemplate,
  onThemeChange,
}: CustomTemplateControlsProps) => {
  if (!onUpdateTemplate) {
    return <></>;
  }

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
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
      <StyleSelector value={template.previewStyle || 'modern'} onChange={handleStyleChange} />
      <AccentColorPicker value={template.accentColor || '#2563eb'} onChange={handleAccentChange} />
      {isCustomStyle && <ThemeColorPickers theme={theme} onChange={onThemeChange} />}
      <ControlButton onClick={handleUpdateExample}>更新示例</ControlButton>
      <ControlButton tone="danger" onClick={() => onDeleteTemplate?.(template.id)}>
        删除
      </ControlButton>
    </div>
  );
};
