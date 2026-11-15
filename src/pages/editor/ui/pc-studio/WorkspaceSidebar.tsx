import type { ActiveSectionKey } from '@entities/resume';
import { useI18n } from '@shared/i18n';

import type { LocalSaveStatus } from '../../model/pc-studio/useLocalSaveStatus';
import type { StudioModuleKey } from '../../model/pc-studio/usePCStudioController';

type SidebarModule = {
  key: StudioModuleKey;
  label: string;
  count: number;
};

type WorkspaceSidebarProps = {
  modules: SidebarModule[];
  selectedModule: StudioModuleKey;
  activeSections: ActiveSectionKey[];
  saveStatus: LocalSaveStatus;
  resumeName: string;
  onSelect: (key: StudioModuleKey) => void;
  onToggleSection: (key: string, included: boolean) => void;
};

const symbols: Record<string, string> = {
  personal: '◉',
  experience: '▦',
  education: '▱',
  projects: '◇',
  skills: '✧',
  languages: '◎',
  interests: '⌁',
  awards: '✦',
  socials: '↗',
};

const WorkspaceSidebar = ({
  modules,
  selectedModule,
  activeSections,
  saveStatus,
  resumeName,
  onSelect,
  onToggleSection,
}: WorkspaceSidebarProps) => {
  const { t } = useI18n();
  const isSaved = saveStatus === 'saved';

  return (
    <aside className="pc-workspace-sidebar" aria-label={t('editor.pcStudio.navRail')}>
      <div className="pc-sidebar-resume-card">
        <span className="pc-eyebrow">{t('editor.pcStudio.localWorkspace')}</span>
        <strong>{resumeName}</strong>
        <span>
          {t('editor.pcStudio.modules')} · {modules.length}
        </span>
      </div>
      <div className="pc-sidebar-section-heading">
        <span>{t('editor.pcStudio.modules')}</span>
      </div>
      <nav className="pc-module-list" aria-label={t('editor.pcStudio.modules')}>
        {modules.map((module) => {
          const isPersonal = module.key === 'personal';
          const included = isPersonal || activeSections.includes(module.key as ActiveSectionKey);
          const selected = module.key === selectedModule;
          return (
            <div className={`pc-module-row ${selected ? 'is-selected' : ''}`} key={module.key}>
              <button
                className="pc-module-select"
                type="button"
                onClick={() => onSelect(module.key)}
                aria-current={selected ? 'page' : undefined}
                aria-label={module.label}
                title={module.label}
                data-module-key={module.key}
              >
                <span className="pc-module-icon" aria-hidden="true">
                  {symbols[module.key.split(':')[0] ?? ''] ?? '◇'}
                </span>
                <span className="pc-module-label">{module.label}</span>
                {module.count > 0 && <span className="pc-module-count">{module.count}</span>}
              </button>
              {!isPersonal && (
                <button
                  className={`pc-module-visibility ${included ? 'is-included' : ''}`}
                  type="button"
                  onClick={() => onToggleSection(module.key, !included)}
                  aria-label={`${included ? t('modules.toggle.hide') : t('modules.toggle.show')} ${module.label} ${t('editor.pcStudio.previewModule')}`}
                  title={`${included ? t('modules.toggle.hide') : t('modules.toggle.show')} ${module.label}`}
                >
                  <span aria-hidden="true">{included ? '◉' : '○'}</span>
                </button>
              )}
            </div>
          );
        })}
      </nav>

      <div className="pc-sidebar-footer">
        <span
          className={`pc-status-dot ${isSaved ? 'is-success' : saveStatus === 'error' ? 'is-error' : ''}`}
          aria-hidden="true"
        />
        <div>
          <strong>
            {isSaved
              ? t('editor.pcStudio.localSaved')
              : saveStatus === 'error'
                ? t('editor.pcStudio.saveUnavailable')
                : t('editor.pcStudio.localWorkspace')}
          </strong>
          <span>{t('editor.pcStudio.localOnlyNote')}</span>
        </div>
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
