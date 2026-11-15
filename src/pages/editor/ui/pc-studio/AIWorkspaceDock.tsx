import { useAIProviderClient } from '@features/ai-provider-settings';
import type { AIEnhancementTarget } from '@features/ai-resume-enhancement';
import { useAIResumeEnhancementLauncher } from '@features/ai-resume-enhancement';
import { useI18n } from '@shared/i18n';
import { LazyChunkBoundary } from '@shared/ui/LazyChunkBoundary';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import type {
  StudioFieldContext,
  StudioModuleKey,
} from '../../model/pc-studio/usePCStudioController';

const AIProviderSettingsDialog = lazy(
  () => import('@features/ai-provider-settings/ui/AIProviderSettingsDialog'),
);

type AIWorkspaceDockProps = {
  moduleKey: StudioModuleKey;
  moduleLabel: string;
  fieldContext: StudioFieldContext | null;
  onClose: () => void;
  onReturnToPreview: () => void;
};

const AIWorkspaceDock = ({
  moduleKey,
  moduleLabel,
  fieldContext,
  onClose,
  onReturnToPreview,
}: AIWorkspaceDockProps) => {
  const { t, loadAIProviderTranslations } = useI18n();
  const provider = useAIProviderClient();
  const launcher = useAIResumeEnhancementLauncher();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPreparing, setSettingsPreparing] = useState(false);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const enhancementTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inlineMountRef = useRef<HTMLDivElement | null>(null);
  const inlineMountSnapshotRef = useRef<HTMLDivElement | null>(null);
  const closeInlineRef = useRef(launcher.closeInline);
  closeInlineRef.current = launcher.closeInline;
  const setInlineMountRef = useCallback((node: HTMLDivElement | null) => {
    inlineMountRef.current = node;
    if (node) inlineMountSnapshotRef.current = node;
  }, []);
  const isSupported = Boolean(fieldContext?.aiTarget);

  useEffect(() => {
    return () => {
      const mountNode = inlineMountSnapshotRef.current;
      if (mountNode) closeInlineRef.current(mountNode);
    };
  }, []);

  const openProviderSettings = useCallback(async () => {
    setSettingsPreparing(true);
    setSettingsLoadFailed(false);
    try {
      await loadAIProviderTranslations();
      setSettingsOpen(true);
    } catch {
      setSettingsLoadFailed(true);
    } finally {
      setSettingsPreparing(false);
    }
  }, [loadAIProviderTranslations]);

  const requestEnhancement = useCallback(() => {
    const target: AIEnhancementTarget | null = fieldContext?.aiTarget ?? null;
    const opener = enhancementTriggerRef.current;
    if (!target || !opener) return;
    if (target.kind === 'personal-summary' && inlineMountRef.current && fieldContext) {
      launcher.open(target, opener, {
        presentation: 'inline',
        mountNode: inlineMountRef.current,
        fieldLabel: fieldContext.fieldLabel,
        sourceValue: fieldContext.sourceValue,
        sourceRevision: fieldContext.sourceRevision,
        workspaceGeneration: fieldContext.workspaceGeneration,
        selectionRange: fieldContext.selectionRange,
        onConfigureProvider: () => void openProviderSettings(),
      });
      return;
    }
    launcher.open(target, opener);
  }, [fieldContext, launcher, openProviderSettings]);

  /* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The named dock scroll region must accept keyboard focus. */
  return (
    <aside
      className="pc-ai-dock"
      aria-label={t('editor.pcStudio.aiTitle')}
      data-testid="pc-ai-dock"
    >
      <header className="pc-ai-dock-header">
        <div className="pc-ai-dock-symbol" aria-hidden="true">
          ✦
        </div>
        <div>
          <span className="pc-eyebrow">{t('editor.pcStudio.aiContext')}</span>
          <h2>{t('editor.pcStudio.aiTitle')}</h2>
        </div>
        <button
          type="button"
          className="pc-panel-close"
          onClick={onClose}
          aria-label={t('editor.pcStudio.close')}
        >
          ×
        </button>
      </header>

      <div className="pc-ai-context-card">
        <div>
          <span>{t('editor.pcStudio.currentModule')}</span>
          <strong>{moduleLabel}</strong>
        </div>
        <div>
          <span>{t('editor.pcStudio.currentField')}</span>
          <strong
            data-testid="pc-ai-field-context"
            data-field-id={fieldContext?.fieldId}
            data-write-target={fieldContext?.writeTarget ?? ''}
            data-source-kind={
              Array.isArray(fieldContext?.sourceValue) ? 'list' : typeof fieldContext?.sourceValue
            }
          >
            {fieldContext?.fieldLabel || t('editor.pcStudio.noField')}
          </strong>
        </div>
        <span className="pc-ai-context-pill" data-module-context={moduleKey}>
          {fieldContext ? t('editor.pcStudio.aiContext') : t('editor.pcStudio.editModule')}
        </span>
      </div>

      <div
        className="pc-ai-dock-body"
        role="region"
        aria-label={t('editor.pcStudio.aiTitle')}
        tabIndex={0}
      >
        <div className="pc-ai-prompt-card">
          <span className="pc-ai-orbit" aria-hidden="true">
            ✦
          </span>
          <h3>{t('editor.pcStudio.aiTitle')}</h3>
          <p>
            {fieldContext
              ? isSupported
                ? t('editor.pcStudio.aiSupported')
                : t('editor.pcStudio.aiUnsupported')
              : t('editor.pcStudio.noField')}
          </p>
        </div>

        {fieldContext && isSupported && provider.isConfigured ? (
          <button
            ref={enhancementTriggerRef}
            className="pc-ai-primary-action"
            type="button"
            onClick={requestEnhancement}
          >
            <span aria-hidden="true">✦</span>
            {t('editor.pcStudio.requestSuggestion')}
          </button>
        ) : fieldContext && isSupported ? (
          <button
            ref={settingsTriggerRef}
            className="pc-ai-primary-action"
            type="button"
            onClick={() => void openProviderSettings()}
            disabled={settingsPreparing}
          >
            <span aria-hidden="true">⚙</span>
            {settingsPreparing
              ? t('common.loadingFeature')
              : t('editor.pcStudio.configureProvider')}
          </button>
        ) : (
          <p className="pc-ai-supported-note">
            {fieldContext ? t('editor.pcStudio.aiUnsupported') : t('editor.pcStudio.noField')}
          </p>
        )}

        {provider.isConfigured && (
          <button
            ref={settingsTriggerRef}
            className="pc-ai-settings-link"
            type="button"
            onClick={() => void openProviderSettings()}
          >
            {t('topbar.aiProviderSettings')}
          </button>
        )}

        {settingsLoadFailed && (
          <div className="pc-ai-inline-error" role="alert">
            <span>{t('common.featureFailedLoad')}</span>
            <button type="button" onClick={() => void openProviderSettings()}>
              {t('common.reloadPage')}
            </button>
          </div>
        )}

        <div
          ref={setInlineMountRef}
          className="pc-ai-inline-mount"
          data-testid="pc-ai-inline-mount"
        />

        <div className="pc-ai-privacy-note">
          <span aria-hidden="true">◈</span>
          <p>{t('editor.pcStudio.aiPrivacy')}</p>
        </div>
      </div>

      <footer className="pc-ai-dock-footer">
        <button type="button" onClick={onReturnToPreview}>
          {t('editor.pcStudio.returnToPreview')}
        </button>
      </footer>

      <LazyChunkBoundary
        renderError={(reload) => (
          <div className="pc-ai-inline-error" role="alert">
            <span>{t('common.featureFailedLoad')}</span>
            <button type="button" onClick={reload}>
              {t('common.reloadPage')}
            </button>
          </div>
        )}
      >
        <Suspense fallback={null}>
          <AIProviderSettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            triggerRef={settingsTriggerRef}
          />
        </Suspense>
      </LazyChunkBoundary>
    </aside>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-tabindex */
};

export default AIWorkspaceDock;
