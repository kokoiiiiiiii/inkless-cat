import { StudioCard, StudioIcon, StudioIconButton } from '@shared/ui/studio';

import type { DemoModule, DemoModuleId } from '../model/useDemoStudio';

type DemoModuleManagerProps = {
  announcement: string;
  modules: DemoModule[];
  onMove: (id: DemoModuleId, direction: -1 | 1) => void;
  onNotice: (message: string) => void;
  onToggle: (id: DemoModuleId) => void;
};

const descriptions: Record<DemoModuleId, string> = {
  experience: '岗位、责任与可验证成果',
  projects: '作品背景、贡献与影响',
  education: '院校、专业与学习经历',
  skills: '与目标岗位相关的专业能力',
};

export const DemoModuleManager = ({
  announcement,
  modules,
  onMove,
  onNotice,
  onToggle,
}: DemoModuleManagerProps) => (
  <div className="studio-module-manager">
    <StudioCard className="studio-demo-card" inset="compact">
      <div className="studio-card-heading">
        <div>
          <p className="studio-eyebrow">CONTENT ORDER</p>
          <h2>简历模块</h2>
        </div>
        <span className="studio-module-count">
          {modules.filter((module) => module.visible).length} 项显示
        </span>
      </div>
      <p className="studio-card-intro">用上移和下移按钮调整顺序，也可以隐藏暂时不需要的内容。</p>
      <ol className="studio-module-list" aria-label="简历模块顺序">
        {modules.map((module, index) => (
          <li className="studio-module-row" key={module.id}>
            <span aria-hidden="true" className="studio-module-row__number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="studio-module-row__copy">
              <strong>{module.label}</strong>
              <span>{descriptions[module.id]}</span>
            </div>
            <div className="studio-module-row__controls">
              <StudioIconButton
                label={`上移${module.label}`}
                disabled={index === 0}
                onClick={() => {
                  onMove(module.id, -1);
                  if (index > 0) onNotice(`已将${module.label}向上移动；预览已更新。`);
                }}
              >
                <StudioIcon name="arrow-up" />
              </StudioIconButton>
              <StudioIconButton
                label={`下移${module.label}`}
                disabled={index === modules.length - 1}
                onClick={() => {
                  onMove(module.id, 1);
                  if (index < modules.length - 1)
                    onNotice(`已将${module.label}向下移动；预览已更新。`);
                }}
              >
                <StudioIcon name="arrow-down" />
              </StudioIconButton>
              <button
                aria-checked={module.visible}
                aria-label={`${module.visible ? '隐藏' : '显示'}${module.label}`}
                className="studio-switch"
                onClick={() => {
                  onToggle(module.id);
                  onNotice(`${module.label}已${module.visible ? '隐藏' : '显示'}；预览已更新。`);
                }}
                role="switch"
                type="button"
              >
                <span />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p aria-atomic="true" aria-live="polite" className="studio-sr-only" role="status">
        {announcement}
      </p>
      <p className="studio-demo-privacy">
        <StudioIcon name="info" /> 顺序与显隐仅作用于本页演示
      </p>
    </StudioCard>
  </div>
);
