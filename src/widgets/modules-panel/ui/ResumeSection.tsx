import { sectionDefinitions, type StandardSectionKey } from '@entities/module';
import type { ResumeSectionItem } from '@features/edit-module';
import { memo } from 'react';

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
    const resolveFocusId = (item: ResumeSectionItem, fallback: string): string => {
      return typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : fallback;
    };

    const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

    const renderInput = (
      item: ResumeSectionItem,
      index: number,
      field: string,
      placeholder = '',
      focusId = resolveFocusId(item, sectionKey),
    ) => (
      <label className={labelClass}>
        <span className={labelTextClass}>{labelMap[field] || field}</span>
        <input
          className={inputClass}
          type="text"
          value={typeof item[field] === 'string' ? item[field] : ''}
          placeholder={placeholder}
          onChange={(event) => onFieldChange(sectionKey, index, field, event.target.value)}
          onFocus={() => notifyFocus(sectionKey, focusId)}
        />
      </label>
    );

    const renderListTextarea = (
      item: ResumeSectionItem,
      index: number,
      field: string,
      placeholder: string,
      focusId = resolveFocusId(item, sectionKey),
    ) => (
      <label className={labelClass}>
        <span className={labelTextClass}>{labelMap[field] || field}</span>
        <textarea
          className={textareaClass}
          rows={4}
          value={
            Array.isArray(item[field]) ? (item[field] as string[]).filter(Boolean).join('\n') : ''
          }
          placeholder={placeholder}
          onChange={(event) => onListChange(sectionKey, index, field, event.target.value)}
          onFocus={() => notifyFocus(sectionKey, focusId)}
        />
      </label>
    );

    return (
      <section ref={sectionRef} className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {sectionDefinitions[sectionKey]?.title || sectionKey}
          </h3>
          <button type="button" className={subtleButtonClass} onClick={() => onAddItem(sectionKey)}>
            添加
          </button>
        </header>
        {items.length === 0 ? (
          <p className={emptyStateClass}>暂无内容，点击“添加”开始编辑。</p>
        ) : (
          items.map((item, index) => {
            const itemId = resolveFocusId(item, `${sectionKey}-${index}`);
            return (
              <div key={itemId} className={cardClass}>
                <div className="grid gap-4">
                  {sectionKey === 'socials' && (
                    <>
                      {renderInput(item, index, 'label', 'GitHub / 个人网站')}
                      {renderInput(item, index, 'url', 'https://example.com')}
                    </>
                  )}
                  {sectionKey === 'experience' && (
                    <>
                      {renderInput(item, index, 'company', '公司或团队名称')}
                      {renderInput(item, index, 'role', '职位 / 角色')}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {renderInput(item, index, 'location', '所在城市')}
                        {renderInput(item, index, 'startDate', '2019-06')}
                        {renderInput(item, index, 'endDate', '至今 / 2023-08')}
                      </div>
                      {renderListTextarea(item, index, 'highlights', '每行一个成果或职责')}
                    </>
                  )}
                  {sectionKey === 'education' && (
                    <>
                      {renderInput(item, index, 'school', '学校')}
                      {renderInput(item, index, 'degree', '学历 / 专业')}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {renderInput(item, index, 'startDate', '2014')}
                        {renderInput(item, index, 'endDate', '2018')}
                      </div>
                      <label className={labelClass}>
                        <span className={labelTextClass}>详情</span>
                        <textarea
                          className={textareaClass}
                          rows={3}
                          value={toStringValue(item.details)}
                          placeholder="校内成绩、荣誉或主修课程"
                          onChange={(event) =>
                            onFieldChange(sectionKey, index, 'details', event.target.value)
                          }
                          onFocus={() => notifyFocus(sectionKey, itemId)}
                        />
                      </label>
                    </>
                  )}
                  {sectionKey === 'projects' && (
                    <>
                      {renderInput(item, index, 'name', '项目名称')}
                      {renderInput(item, index, 'role', '角色 / 负责范围')}
                      <label className={labelClass}>
                        <span className={labelTextClass}>概述</span>
                        <textarea
                          className={textareaClass}
                          rows={3}
                          value={toStringValue(item.summary)}
                          placeholder="简要说明项目背景、亮点与成果"
                          onChange={(event) =>
                            onFieldChange(sectionKey, index, 'summary', event.target.value)
                          }
                          onFocus={() => notifyFocus(sectionKey, itemId)}
                        />
                      </label>
                      {renderInput(item, index, 'link', 'https://项目链接（可选）')}
                    </>
                  )}
                  {sectionKey === 'skills' && (
                    <>
                      {renderInput(item, index, 'title', '例如：前端 / 工程实践')}
                      <label className={labelClass}>
                        <span className={labelTextClass}>技能条目</span>
                        <textarea
                          className={textareaClass}
                          rows={3}
                          value={
                            Array.isArray(item.items)
                              ? (item.items as string[]).filter(Boolean).join('\n')
                              : ''
                          }
                          placeholder="每行一个技能或关键字"
                          onChange={(event) =>
                            onListChange(sectionKey, index, 'items', event.target.value)
                          }
                          onFocus={() => notifyFocus(sectionKey, itemId)}
                        />
                      </label>
                    </>
                  )}
                  {sectionKey === 'languages' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {renderInput(item, index, 'name', '语言')}
                      {renderInput(item, index, 'level', '熟练程度')}
                    </div>
                  )}
                  {sectionKey === 'interests' && renderInput(item, index, 'name', '兴趣 / 爱好')}
                  {sectionKey === 'awards' && (
                    <>
                      {renderInput(item, index, 'name', '奖项名称')}
                      {renderInput(item, index, 'issuer', '颁发机构')}
                      {renderInput(item, index, 'year', '年份')}
                    </>
                  )}
                </div>
                <footer className="flex justify-end pt-2">
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => onRemoveItem(sectionKey, index)}
                  >
                    删除
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
