import type {
  ResumeCustomField,
  ResumeCustomSection,
  ResumeCustomSectionMode,
} from '@entities/resume';
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
import type { SectionFocusHandler } from './types';

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
    const mode: ResumeCustomSectionMode = section.mode ?? 'list';
    const itemsValue = Array.isArray(section.items) ? section.items.join('\n') : '';
    const fieldsValue = Array.isArray(section.fields) ? section.fields : [];
    const textValue = typeof section.text === 'string' ? section.text : '';

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {section.title || '自定义模块'}
          </h3>
          <button
            type="button"
            className={dangerButtonClass}
            onClick={() => {
              const shouldRemove =
                typeof globalThis === 'undefined' ||
                globalThis.confirm(`确定删除模块“${section.title || '未命名模块'}”吗？`);
              if (shouldRemove) {
                onRemove?.(section.id);
              }
            }}
          >
            删除模块
          </button>
        </header>
        <div className={cardClass}>
          <div className="space-y-4">
            <label className={labelClass}>
              <span className={labelTextClass}>模块名称</span>
              <input
                className={inputClass}
                type="text"
                value={section.title || ''}
                placeholder="自定义模块名称"
                onChange={(event) => onTitleChange(section.id, event.target.value)}
                onFocus={() => notifyFocus(sectionKey, section.id)}
              />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>内容类型</span>
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
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'list' && (
              <label className={labelClass}>
                <span className={labelTextClass}>内容条目</span>
                <textarea
                  className={textareaClass}
                  rows={4}
                  value={itemsValue}
                  placeholder="每行一个亮点或描述"
                  onChange={(event) => onItemsChange(section.id, event.target.value)}
                  onFocus={() => notifyFocus(sectionKey, section.id)}
                />
              </label>
            )}
            {mode === 'fields' && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className={labelTextClass}>键值对</span>
                  <button
                    type="button"
                    className={subtleButtonClass}
                    onClick={() => onFieldAdd(section.id)}
                  >
                    添加字段
                  </button>
                </div>
                {fieldsValue.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300/70 bg-white/60 px-3 py-4 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400">
                    目前没有字段，点击“添加字段”开始编辑。
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
                            <span className={labelTextClass}>字段名称</span>
                            <input
                              className={inputClass}
                              type="text"
                              value={field.label || ''}
                              placeholder="例如：职责"
                              onChange={(event) =>
                                onFieldChange(section.id, field.id, 'label', event.target.value)
                              }
                              onFocus={() => notifyFocus(sectionKey, `${field.id}-label`)}
                            />
                          </label>
                          <label className={`${labelClass} md:flex-1`}>
                            <span className={labelTextClass}>字段内容</span>
                            <input
                              className={inputClass}
                              type="text"
                              value={field.value || ''}
                              placeholder="例如：负责团队管理与项目规划"
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
                            删除字段
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
                <span className={labelTextClass}>自由文本</span>
                <textarea
                  className={textareaClass}
                  rows={5}
                  value={textValue}
                  placeholder="可粘贴多个段落，自由调整格式。"
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
