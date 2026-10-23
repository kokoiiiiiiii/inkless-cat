import { GlassSurface, StudioIcon, StudioPopover } from '@shared/ui/studio';

import type { StudioMobileView, StudioPanel } from '../model/types';

type StudioMobileNavigationProps = {
  activePanel: StudioPanel;
  onChangePanel: (panel: StudioPanel) => void;
  onChangeView: (view: StudioMobileView) => void;
  view: StudioMobileView;
};

export const StudioMobileNavigation = ({
  activePanel,
  onChangePanel,
  onChangeView,
  view,
}: StudioMobileNavigationProps) => (
  <GlassSurface as="nav" aria-label="移动端工作区导航" className="studio-mobile-nav" tone="strong">
    <button
      aria-current={view === 'edit' && activePanel === 'profile' ? 'page' : undefined}
      className={view === 'edit' && activePanel === 'profile' ? 'is-active' : ''}
      onClick={() => {
        onChangePanel('profile');
        onChangeView('edit');
      }}
      type="button"
    >
      <StudioIcon name="file" />
      <span>编辑</span>
    </button>
    <button
      aria-current={view === 'preview' ? 'page' : undefined}
      className={view === 'preview' ? 'is-active' : ''}
      onClick={() => onChangeView('preview')}
      type="button"
    >
      <StudioIcon name="eye" />
      <span>预览</span>
    </button>
    <button
      aria-current={view === 'edit' && activePanel === 'templates' ? 'page' : undefined}
      className={view === 'edit' && activePanel === 'templates' ? 'is-active' : ''}
      onClick={() => {
        onChangePanel('templates');
        onChangeView('edit');
      }}
      type="button"
    >
      <StudioIcon name="palette" />
      <span>模板</span>
    </button>
    <StudioPopover icon="menu" label="更多">
      <span className="studio-popover__label">工作区</span>
      <button onClick={() => onChangePanel('modules')} role="menuitem" type="button">
        <StudioIcon name="layers" />
        模块管理
      </button>
      <button onClick={() => onChangePanel('interview')} role="menuitem" type="button">
        <StudioIcon name="sparkles" />
        AI 功能演示
      </button>
      <button onClick={() => onChangePanel('settings')} role="menuitem" type="button">
        <StudioIcon name="settings" />
        设置入口
      </button>
      <span className="studio-popover__note">所有操作均为本地演示</span>
    </StudioPopover>
  </GlassSurface>
);
