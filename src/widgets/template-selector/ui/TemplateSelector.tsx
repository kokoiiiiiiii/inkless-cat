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
  useEffect(() => {
    if (typeof onReady === 'function') {
      onReady();
    }
  }, [onReady]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          <TemplateCreationForm onSaveTemplate={onSaveTemplate} />
        )}
      </div>
    </section>
  );
};

export default TemplateSelector;
