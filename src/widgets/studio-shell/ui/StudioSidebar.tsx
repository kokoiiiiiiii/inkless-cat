import { GlassSurface, StudioIcon, type StudioIconName } from '@shared/ui/studio';

import type { StudioPanel } from '../model/types';

type StudioSidebarProps = {
  activePanel: StudioPanel;
  onSelect: (panel: StudioPanel) => void;
};

const destinations: Array<{ icon: StudioIconName; id: StudioPanel; label: string }> = [
  { id: 'profile', label: '简历编辑', icon: 'file' },
  { id: 'modules', label: '模块管理', icon: 'layers' },
  { id: 'templates', label: '模板选择', icon: 'palette' },
  { id: 'interview', label: 'AI 功能演示', icon: 'sparkles' },
  { id: 'settings', label: '设置入口', icon: 'settings' },
];

export const StudioSidebar = ({ activePanel, onSelect }: StudioSidebarProps) => (
  <GlassSurface aria-label="工作区侧栏" as="aside" className="studio-sidebar">
    <div className="studio-sidebar__heading">
      <span>工作区</span>
      <small>DESIGN PREVIEW</small>
    </div>
    <nav aria-label="工作台导航" className="studio-sidebar__nav">
      {destinations.map((destination) => (
        <button
          aria-current={activePanel === destination.id ? 'page' : undefined}
          aria-label={destination.label}
          className={activePanel === destination.id ? 'is-active' : ''}
          key={destination.id}
          onClick={() => onSelect(destination.id)}
          type="button"
        >
          <StudioIcon name={destination.icon} />
          <span>{destination.label}</span>
        </button>
      ))}
    </nav>
    <div className="studio-sidebar__footnote">
      <span className="studio-sidebar__status-dot" />
      <div>
        <strong>合成示例</strong>
        <span>内容仅保存在当前页面</span>
      </div>
    </div>
  </GlassSurface>
);
