import { useI18n } from '@shared/i18n';
import type { KeyboardEvent, RefObject } from 'react';

import type { LocalSaveStatus } from '../../model/pc-studio/useLocalSaveStatus';

type StudioHeaderProps = {
  saveStatus: LocalSaveStatus;
  resumeName: string;
  templateName: string;
  aiOpen: boolean;
  previewActive: boolean;
  templateCenterOpen: boolean;
  theme: 'light' | 'dark';
  templateButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenTemplates: () => void;
  onToggleAI: () => void;
  onTogglePreview: () => void;
  onToggleTheme: () => void;
  onExportJson: () => void;
  onExportWorkspaceJson: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  onExit: () => void;
};

const iconButtonClass = 'pc-icon-button';

const SaveStatus = ({ status }: { status: LocalSaveStatus }) => {
  const { t } = useI18n();
  const labels: Record<LocalSaveStatus, string> = {
    checking: t('editor.pcStudio.checking'),
    ready: t('editor.pcStudio.localWorkspace'),
    saving: t('editor.pcStudio.saving'),
    saved: t('editor.pcStudio.localSaved'),
    error: t('editor.pcStudio.saveUnavailable'),
  };

  return (
    <div
      className={`pc-save-status pc-save-status--${status}`}
      data-testid="pc-save-status"
      data-save-state={status}
      role="status"
      aria-live="polite"
    >
      <span className="pc-status-dot" aria-hidden="true" />
      <span>{labels[status]}</span>
    </div>
  );
};

const StudioHeader = ({
  saveStatus,
  resumeName,
  templateName,
  aiOpen,
  previewActive,
  templateCenterOpen,
  theme,
  templateButtonRef,
  onOpenTemplates,
  onToggleAI,
  onTogglePreview,
  onToggleTheme,
  onExportJson,
  onExportWorkspaceJson,
  onExportMarkdown,
  onPrint,
  onExit,
}: StudioHeaderProps) => {
  const { t } = useI18n();
  const menuLabels = [
    ['JSON', onExportJson],
    [t('topbar.exportWorkspace'), onExportWorkspaceJson],
    [t('topbar.exportMarkdown'), onExportMarkdown],
    [t('topbar.print'), onPrint],
  ] as const;
  const handleExportMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const details = event.currentTarget.closest('details');
    if (event.key !== 'Escape' || !details?.open) return;
    details.open = false;
    details.querySelector('summary')?.focus();
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <header className="pc-studio-header">
      <div className="pc-brand-lockup" aria-label="Inkless Cat">
        <span className="pc-brand-mark" aria-hidden="true">
          ✦
        </span>
        <span className="pc-brand-wordmark">
          <strong>inkless cat</strong>
          <small>CREATIVE STUDIO</small>
        </span>
      </div>

      <div className="pc-resume-context">
        <span>
          {t('editor.pcStudio.localWorkspace')} · {templateName}
        </span>
        <strong>{resumeName}</strong>
      </div>

      <SaveStatus status={saveStatus} />

      <nav className="pc-header-actions" aria-label={t('editor.pcStudio.workspace')}>
        <button
          ref={templateButtonRef}
          className="pc-header-button"
          type="button"
          aria-expanded={templateCenterOpen}
          aria-controls="pc-template-center"
          onClick={onOpenTemplates}
        >
          <span aria-hidden="true">▦</span>
          <span>{t('editor.pcStudio.template')}</span>
        </button>
        <button
          className={`pc-header-button pc-header-button--ai ${aiOpen ? 'is-active' : ''}`}
          type="button"
          onClick={onToggleAI}
          aria-expanded={aiOpen}
        >
          <span aria-hidden="true">✦</span>
          <span>{t('editor.pcStudio.ai')}</span>
        </button>
        <button
          className={`pc-header-button ${previewActive ? 'is-active' : ''}`}
          type="button"
          onClick={onTogglePreview}
          aria-pressed={previewActive}
        >
          <span aria-hidden="true">◉</span>
          <span>{previewActive ? t('editor.pcStudio.edit') : t('editor.pcStudio.preview')}</span>
        </button>
        <div className="pc-history-controls" aria-label={t('editor.pcStudio.workspace')}>
          <button
            className={iconButtonClass}
            type="button"
            disabled
            title={t('editor.pcStudio.unavailable')}
            aria-label={`${t('editor.pcStudio.undo')} · ${t('editor.pcStudio.unavailable')}`}
          >
            <span aria-hidden="true">↶</span>
          </button>
          <button
            className={iconButtonClass}
            type="button"
            disabled
            title={t('editor.pcStudio.unavailable')}
            aria-label={`${t('editor.pcStudio.redo')} · ${t('editor.pcStudio.unavailable')}`}
          >
            <span aria-hidden="true">↷</span>
          </button>
        </div>
        <div className="pc-export-menu">
          <details>
            <summary className="pc-header-button pc-header-button--primary">
              <span aria-hidden="true">⇩</span>
              <span>{t('editor.pcStudio.export')}</span>
            </summary>
            <div
              className="pc-export-options"
              role="menu"
              tabIndex={-1}
              onKeyDown={handleExportMenuKeyDown}
            >
              {menuLabels.map(([label, action]) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    action();
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
        </div>
        <button
          className="pc-header-button pc-header-button--quiet pc-theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? t('topbar.themeDark') : t('topbar.themeLight')}
          title={theme === 'light' ? t('topbar.themeDark') : t('topbar.themeLight')}
        >
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
        </button>
        <button
          className="pc-header-button pc-header-button--quiet pc-exit-button"
          type="button"
          onClick={onExit}
        >
          <span aria-hidden="true">↩</span>
          <span>{t('editor.pcStudio.exit')}</span>
        </button>
      </nav>
    </header>
  );
};

export default StudioHeader;
