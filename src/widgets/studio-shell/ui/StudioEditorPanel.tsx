import type { ReactNode } from 'react';

import type { StudioPanel } from '../model/types';

const panelCopy: Record<StudioPanel, { eyebrow: string; title: string; description: string }> = {
  profile: {
    eyebrow: 'RESUME EDITOR',
    title: '个人资料',
    description: '先整理关键信息，合成预览会同步更新。',
  },
  modules: {
    eyebrow: 'CONTENT STRUCTURE',
    title: '模块管理',
    description: '调整模块顺序与显隐，变化会反映在右侧纸张。',
  },
  templates: {
    eyebrow: 'PRESENTATION',
    title: '模板选择',
    description: '选择一种演示版式，查看纸张层级如何变化。',
  },
  interview: {
    eyebrow: 'AI WORKSPACE',
    title: 'AI 功能演示',
    description: '这里只展示交互结构，不会调用模型或保存内容。',
  },
  settings: {
    eyebrow: 'PREFERENCES',
    title: '设置入口',
    description: '正式服务配置不会在设计原型中启用。',
  },
};

type StudioEditorPanelProps = {
  children: ReactNode;
  panel: StudioPanel;
};

export const StudioEditorPanel = ({ children, panel }: StudioEditorPanelProps) => {
  const copy = panelCopy[panel];

  return (
    <section
      aria-labelledby="studio-panel-title"
      className="studio-editor-panel"
      id="studio-content"
    >
      <div className="studio-panel-heading">
        <p className="studio-eyebrow">{copy.eyebrow}</p>
        <div className="studio-panel-heading__row">
          <h1 id="studio-panel-title">{copy.title}</h1>
          <span className="studio-panel-status">
            <span />
            本地演示
          </span>
        </div>
        <p className="studio-panel-heading__description">{copy.description}</p>
      </div>
      <div className="studio-editor-content">{children}</div>
    </section>
  );
};
