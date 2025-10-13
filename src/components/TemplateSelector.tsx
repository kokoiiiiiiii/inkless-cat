import { type FormEvent, type ChangeEvent, useEffect, useMemo, useState } from 'react';
import type { ResumeTemplate, TemplateTheme } from '../types/resume';

const baseCard =
  'relative flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm transition hover:border-brand-400/60 hover:shadow-lg dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-brand-400/60 dark:hover:shadow-brand-500/20';

const activeCard =
  'border-brand-500/70 shadow-lg shadow-brand-500/20 ring-2 ring-brand-500/30 dark:ring-brand-400/30';

type StyleOption = {
  value: string;
  label: string;
};

const styleOptions: StyleOption[] = [
  { value: 'modern', label: '现代风格（Modern）' },
  { value: 'classic', label: '商务风格（Classic）' },
  { value: 'creative', label: '创意风格（Creative）' },
  { value: 'custom', label: '自定义风格（Custom）' },
];

const DEFAULT_CUSTOM_THEME: TemplateTheme = {
  accent: '#2563eb',
  background: '#ffffff',
  heading: '#0f172a',
  subheading: '#2563eb',
  text: '#1f2937',
  muted: '#64748b',
  cardBackground: '#f8fafc',
  cardBorder: '#e2e8f0',
  divider: '#e2e8f0',
};

type TemplateUpdatePayload = Partial<Omit<ResumeTemplate, 'sample'>> & {
  sample?: ResumeTemplate | '__CURRENT__';
};

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
  const isCustomStyle = template.previewStyle === 'custom';
  const theme = useMemo(
    () => ({ ...DEFAULT_CUSTOM_THEME, ...(template.theme ?? {}) }),
    [template.theme],
  );

  const handleThemeColorChange = (key: keyof TemplateTheme, value: string) => {
    if (!onUpdateTemplate) return;
    const nextTheme = { ...theme, [key]: value };
    onUpdateTemplate(template.id, { theme: nextTheme });
  };

  return (
  <article
    key={template.id}
    className={`${baseCard} ${template.id === activeId ? activeCard : ''}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <input
              className="rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
              type="text"
              value={template.name}
              placeholder="自定义模板"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onUpdateTemplate?.(template.id, { name: event.target.value })
              }
            />
          ) : (
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {template.name}
            </span>
          )}
          {template.id === activeId && (
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-400/20 dark:text-brand-200">
              当前
            </span>
          )}
          {isCustom && (
            <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              自定义
            </span>
          )}
        </div>
        {isCustom ? (
          <input
            className="mt-1 w-full rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-xs text-slate-600 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:focus:border-brand-400"
            type="text"
            value={template.description || ''}
            placeholder="模板用途说明"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onUpdateTemplate?.(template.id, { description: event.target.value })
            }
          />
        ) : (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {template.description}
          </p>
        )}
      </div>
      <span
        className="h-10 w-10 rounded-xl shadow-inner shadow-slate-200/60 dark:shadow-slate-900/40"
        style={{ background: template.accentColor }}
      />
    </div>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-slate-200/70 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
        onClick={() => onStyleChange(template)}
      >
        使用样式
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-brand-500/30 transition hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
        onClick={() => onLoadSample(template)}
      >
        填充示例
      </button>
      {isCustom && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <label className="inline-flex items-center gap-1">
            风格
            <select
              className="rounded border border-slate-300/70 bg-white/70 px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900/70"
              value={template.previewStyle || 'modern'}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onUpdateTemplate?.(template.id, { previewStyle: event.target.value })
              }
            >
              {styleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1">
            品牌色
            <input
              type="color"
              value={template.accentColor || '#2563eb'}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                if (!onUpdateTemplate) return;
                const payload: TemplateUpdatePayload = { accentColor: value };
                if (isCustomStyle) {
                  payload.theme = { ...theme, accent: value };
                }
                onUpdateTemplate(template.id, payload);
              }}
            />
          </label>
          {isCustomStyle && (
            <>
              <label className="inline-flex items-center gap-1">
                背景
                <input
                  type="color"
                  value={theme.background ?? DEFAULT_CUSTOM_THEME.background ?? '#ffffff'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('background', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                标题
                <input
                  type="color"
                  value={theme.heading ?? DEFAULT_CUSTOM_THEME.heading ?? '#0f172a'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('heading', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                副标题
                <input
                  type="color"
                  value={theme.subheading ?? DEFAULT_CUSTOM_THEME.subheading ?? '#2563eb'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('subheading', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                正文
                <input
                  type="color"
                  value={theme.text ?? DEFAULT_CUSTOM_THEME.text ?? '#1f2937'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('text', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                次要信息
                <input
                  type="color"
                  value={theme.muted ?? DEFAULT_CUSTOM_THEME.muted ?? '#64748b'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('muted', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                卡片背景
                <input
                  type="color"
                  value={theme.cardBackground ?? DEFAULT_CUSTOM_THEME.cardBackground ?? '#f8fafc'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('cardBackground', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                卡片边框
                <input
                  type="color"
                  value={theme.cardBorder ?? DEFAULT_CUSTOM_THEME.cardBorder ?? '#e2e8f0'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('cardBorder', event.target.value)
                  }
                />
              </label>
              <label className="inline-flex items-center gap-1">
                分隔线
                <input
                  type="color"
                  value={theme.divider ?? DEFAULT_CUSTOM_THEME.divider ?? '#e2e8f0'}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleThemeColorChange('divider', event.target.value)
                  }
                />
              </label>
            </>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-slate-200/70 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-300/80 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/60"
            onClick={() => onUpdateTemplate?.(template.id, { sample: '__CURRENT__' })}
          >
            更新示例
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
            onClick={() => onDeleteTemplate?.(template.id)}
          >
            删除
          </button>
        </div>
      )}
    </div>
  </article>
  );
};

type TemplateSelectorProps = {
  builtInTemplates?: ResumeTemplate[];
  customTemplates?: ResumeTemplate[];
  activeId: string;
  onStyleChange: (template: ResumeTemplate) => void;
  onLoadSample: (template: ResumeTemplate) => void;
  onSaveTemplate?: (template: TemplateUpdatePayload) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
};

const TemplateSelector = ({
  builtInTemplates = [],
  customTemplates = [],
  activeId,
  onStyleChange,
  onLoadSample,
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
}: TemplateSelectorProps) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [previewStyle, setPreviewStyle] = useState('modern');
  const [customTheme, setCustomTheme] = useState<TemplateTheme>(() => ({
    ...DEFAULT_CUSTOM_THEME,
  }));

  const isCustomStyle = previewStyle === 'custom';

  const handleThemeFieldChange = (key: keyof TemplateTheme, value: string) => {
    setCustomTheme((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (isCustomStyle) {
      setCustomTheme((previous) => ({
        ...previous,
        accent: accentColor,
      }));
    }
  }, [isCustomStyle, accentColor]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (typeof onSaveTemplate === 'function') {
      onSaveTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        accentColor,
        previewStyle,
        theme: isCustomStyle
          ? {
              ...DEFAULT_CUSTOM_THEME,
              ...customTheme,
              accent: accentColor,
            }
          : undefined,
      });
      setTemplateName('');
      setTemplateDescription('');
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">模板与样式</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            选择不同模板快速切换配色与排版，也可创建属于自己的模板。
          </p>
        </div>
      </header>
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">系统模板</h4>
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
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">自定义模板</h4>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            保存当前简历为模板，随时快速切换
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
            还没有自定义模板，填写下方表单即可保存当前简历。
          </p>
        )}
        {typeof onSaveTemplate === 'function' && (
          <form
            className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                模板名称
                <input
                  className="h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                  type="text"
                  value={templateName}
                  placeholder="例如：深色商务模板"
                  onChange={(event) => setTemplateName(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                风格
                <select
                  className="h-11 w-full rounded-xl border border-slate-300/60 bg-white/80 px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                  value={previewStyle}
                  onChange={(event) => setPreviewStyle(event.target.value)}
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
                placeholder="简要介绍模板用途"
                onChange={(event) => setTemplateDescription(event.target.value)}
              />
            </label>
            <div className="flex items-center gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                品牌色
                <input
                  className="h-11 w-20 cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                  type="color"
                  value={accentColor}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAccentColor(value);
                    if (isCustomStyle) {
                      handleThemeFieldChange('accent', value);
                    }
                  }}
                />
              </label>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                当前颜色：<span className="font-medium text-slate-700 dark:text-slate-200">{accentColor}</span>
              </div>
            </div>
            {isCustomStyle && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  背景
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.background ?? DEFAULT_CUSTOM_THEME.background ?? '#ffffff'}
                    onChange={(event) => handleThemeFieldChange('background', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  标题
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.heading ?? DEFAULT_CUSTOM_THEME.heading ?? '#0f172a'}
                    onChange={(event) => handleThemeFieldChange('heading', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  副标题
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.subheading ?? DEFAULT_CUSTOM_THEME.subheading ?? '#2563eb'}
                    onChange={(event) => handleThemeFieldChange('subheading', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  正文
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.text ?? DEFAULT_CUSTOM_THEME.text ?? '#1f2937'}
                    onChange={(event) => handleThemeFieldChange('text', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  次要信息
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.muted ?? DEFAULT_CUSTOM_THEME.muted ?? '#64748b'}
                    onChange={(event) => handleThemeFieldChange('muted', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  卡片背景
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.cardBackground ?? DEFAULT_CUSTOM_THEME.cardBackground ?? '#f8fafc'}
                    onChange={(event) => handleThemeFieldChange('cardBackground', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  卡片边框
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.cardBorder ?? DEFAULT_CUSTOM_THEME.cardBorder ?? '#e2e8f0'}
                    onChange={(event) => handleThemeFieldChange('cardBorder', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  分隔线
                  <input
                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-300/60 bg-white/80 px-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-brand-400"
                    type="color"
                    value={customTheme.divider ?? DEFAULT_CUSTOM_THEME.divider ?? '#e2e8f0'}
                    onChange={(event) => handleThemeFieldChange('divider', event.target.value)}
                  />
                </label>
              </div>
            )}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              保存当前简历为模板
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default TemplateSelector;
