import { GlassSurface, StudioButton, StudioIcon, StudioIconButton } from '@shared/ui/studio';

import inklessCatMark from '@/assets/inkless-cat-256.webp';

import type { StudioTheme } from '../model/types';

type StudioHeaderProps = {
  onShowDemoInfo: () => void;
  onToggleTheme: () => void;
  theme: StudioTheme;
};

export const StudioHeader = ({ onShowDemoInfo, onToggleTheme, theme }: StudioHeaderProps) => (
  <GlassSurface as="header" className="studio-app-header">
    <a aria-label="Inkless Cat Studio 首页" className="studio-brand" href="#studio-content">
      <img alt="" className="studio-brand__mark" height="40" src={inklessCatMark} width="40" />
      <span className="studio-brand__copy">
        <strong>Inkless Cat</strong>
        <span>STUDIO · 设计演示</span>
      </span>
    </a>
    <div className="studio-header__actions">
      <span className="studio-demo-badge">本地演示</span>
      <StudioButton className="studio-header__help" onClick={onShowDemoInfo} variant="quiet">
        演示说明
      </StudioButton>
      <StudioIconButton
        label={theme === 'light' ? '切换到深色外观' : '切换到浅色外观'}
        onClick={onToggleTheme}
      >
        <StudioIcon name={theme === 'light' ? 'moon' : 'sun'} />
      </StudioIconButton>
    </div>
  </GlassSurface>
);
