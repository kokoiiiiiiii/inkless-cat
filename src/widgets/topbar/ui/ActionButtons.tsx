import { useAIProviderClient } from '@features/ai-provider-settings';
import { AIResumeInterviewProvider, CreateResumeWithAIButton } from '@features/ai-resume-interview';
import { type Locale, useI18n } from '@shared/i18n';
import { LazyChunkBoundary } from '@shared/ui/LazyChunkBoundary';
import { StudioPopover } from '@shared/ui/studio';
import type { ChangeEvent, RefObject } from 'react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const AIProviderSettingsDialog = lazy(
  () => import('@features/ai-provider-settings/ui/AIProviderSettingsDialog'),
);

type ActionButtonsProps = {
  onResetSample: () => void;
  onClear: () => void;
  onImportClick: () => void;
  onExport: () => void;
  onExportWorkspace: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLocaleChange: (nextLocale: Locale, options?: { loadTemplate?: boolean }) => void;
};

const ActionButtons = ({
  onResetSample,
  onClear,
  onImportClick,
  onExport,
  onExportWorkspace,
  onExportMarkdown,
  onPrint,
  theme,
  onToggleTheme,
  inputRef,
  onFileChange,
  onLocaleChange,
}: ActionButtonsProps) => {
  const { loadAIProviderTranslations, t, locale } = useI18n();
  const provider = useAIProviderClient();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [aiSettingsPreparing, setAISettingsPreparing] = useState(false);
  const [aiSettingsLoadFailed, setAISettingsLoadFailed] = useState(false);
  const localeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const aiSettingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const aiSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreActionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const setMoreActionsTrigger = useCallback((node: HTMLButtonElement | null) => {
    moreActionsTriggerRef.current = node;
  }, []);
  const closeAISettings = useCallback(() => setAISettingsOpen(false), []);
  const loadAndOpenAISettings = useCallback(async () => {
    setAISettingsPreparing(true);
    setAISettingsLoadFailed(false);
    try {
      await loadAIProviderTranslations();
      setAISettingsOpen(true);
    } catch {
      setAISettingsLoadFailed(true);
    } finally {
      setAISettingsPreparing(false);
    }
  }, [loadAIProviderTranslations]);
  const openAISettings = useCallback(() => {
    const isCompactToolbar = globalThis.matchMedia?.('(max-width: 1100px)').matches ?? false;
    aiSettingsTriggerRef.current = isCompactToolbar
      ? moreActionsTriggerRef.current
      : aiSettingsButtonRef.current;
    void loadAndOpenAISettings();
  }, [loadAndOpenAISettings]);
  const nextLocale = locale === 'en' ? 'zh-CN' : 'en';
  const translateWithFallback = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const openLocaleDialog = (fromMoreMenu = false) => {
    localeTriggerRef.current = fromMoreMenu
      ? moreActionsTriggerRef.current
      : localeTriggerRef.current;
    setPendingLocale(nextLocale);
  };
  const closeLocaleDialog = () => setPendingLocale(null);

  const localeNameFallback = pendingLocale === 'en' ? 'English' : '中文';
  const targetLocaleName =
    pendingLocale === null
      ? ''
      : translateWithFallback(`topbar.langSwitch.localeNames.${pendingLocale}`, localeNameFallback);

  const handleLanguageOnly = () => {
    if (!pendingLocale) return;
    onLocaleChange(pendingLocale);
    closeLocaleDialog();
  };

  const handleLoadTemplate = () => {
    if (!pendingLocale) return;
    onLocaleChange(pendingLocale, { loadTemplate: true });
    closeLocaleDialog();
  };

  useEffect(() => {
    if (!pendingLocale) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const localeTrigger = localeTriggerRef.current;

    const getFocusableElements = () => [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    getFocusableElements()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingLocale(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      localeTrigger?.focus();
    };
  }, [pendingLocale]);

  return (
    <AIResumeInterviewProvider provider={provider} onOpenProviderSettings={openAISettings}>
      <>
        <div className="production-topbar__actions">
          <div className="production-topbar__primary">
            <CreateResumeWithAIButton />
            <button
              type="button"
              className="production-topbar__action production-topbar__action--primary"
              onClick={onPrint}
            >
              {t('topbar.print')}
            </button>
          </div>
          <div className="production-topbar__desktop-secondary">
            <button type="button" className="production-topbar__action" onClick={onResetSample}>
              {t('topbar.loadSample')}
            </button>
            <button type="button" className="production-topbar__action" onClick={onClear}>
              {t('topbar.clear')}
            </button>
            <button type="button" className="production-topbar__action" onClick={onImportClick}>
              {t('topbar.import')}
            </button>
            <button type="button" className="production-topbar__action" onClick={onExport}>
              {t('topbar.export')}
            </button>
            <button type="button" className="production-topbar__action" onClick={onExportWorkspace}>
              {t('topbar.exportWorkspace')}
            </button>
            <button type="button" className="production-topbar__action" onClick={onExportMarkdown}>
              {t('topbar.exportMarkdown')}
            </button>
            <button
              ref={aiSettingsButtonRef}
              type="button"
              className="production-topbar__action"
              onClick={openAISettings}
            >
              {t('topbar.aiProviderSettings')}
            </button>
            <button type="button" className="production-topbar__action" onClick={onToggleTheme}>
              {theme === 'light' ? t('topbar.themeDark') : t('topbar.themeLight')}
            </button>
            <button
              ref={localeTriggerRef}
              type="button"
              className="production-topbar__action"
              onClick={() => openLocaleDialog()}
            >
              {t('topbar.toggleLang')}
            </button>
          </div>
          <div className="production-topbar__mobile-secondary">
            <StudioPopover
              className="production-topbar__more"
              icon="menu"
              label={t('topbar.moreActions')}
              onTriggerRef={setMoreActionsTrigger}
              triggerClassName="production-topbar__more-trigger"
            >
              <span className="studio-popover__label" role="presentation">
                {t('topbar.moreActions')}
              </span>
              <button onClick={onResetSample} role="menuitem" type="button">
                {t('topbar.loadSample')}
              </button>
              <button onClick={onClear} role="menuitem" type="button">
                {t('topbar.clear')}
              </button>
              <button onClick={onImportClick} role="menuitem" type="button">
                {t('topbar.import')}
              </button>
              <button onClick={onExport} role="menuitem" type="button">
                {t('topbar.export')}
              </button>
              <button onClick={onExportWorkspace} role="menuitem" type="button">
                {t('topbar.exportWorkspace')}
              </button>
              <button onClick={onExportMarkdown} role="menuitem" type="button">
                {t('topbar.exportMarkdown')}
              </button>
              <button onClick={openAISettings} role="menuitem" type="button">
                {t('topbar.aiProviderSettings')}
              </button>
              <button onClick={onToggleTheme} role="menuitem" type="button">
                {theme === 'light' ? t('topbar.themeDark') : t('topbar.themeLight')}
              </button>
              <button onClick={() => openLocaleDialog(true)} role="menuitem" type="button">
                {t('topbar.toggleLang')}
              </button>
            </StudioPopover>
          </div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={onFileChange}
            aria-label={t('topbar.import')}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        {aiSettingsPreparing && (
          <span className="sr-only" role="status">
            {t('common.loadingFeature')}
          </span>
        )}
        {aiSettingsLoadFailed && (
          <div
            className="fixed right-4 bottom-4 z-[100] max-w-sm rounded-xl border border-rose-300 bg-white p-4 text-sm text-slate-900 shadow-xl dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
            role="alert"
          >
            <p>{t('common.featureFailedLoad')}</p>
            <button className="mt-2 font-semibold underline" type="button" onClick={openAISettings}>
              {t('common.reloadPage')}
            </button>
          </div>
        )}
        {aiSettingsOpen && (
          <LazyChunkBoundary
            renderError={(reload) => (
              <div
                className="fixed right-4 bottom-4 z-[100] max-w-sm rounded-xl border border-rose-300 bg-white p-4 text-sm text-slate-900 shadow-xl dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
                role="alert"
              >
                <p>{t('common.featureFailedLoad')}</p>
                <button className="mt-2 font-semibold underline" type="button" onClick={reload}>
                  {t('common.reloadPage')}
                </button>
              </div>
            )}
          >
            <Suspense
              fallback={
                <span className="sr-only" role="status">
                  {t('common.loadingFeature')}
                </span>
              }
            >
              <AIProviderSettingsDialog
                open={aiSettingsOpen}
                onClose={closeAISettings}
                triggerRef={aiSettingsTriggerRef}
              />
            </Suspense>
          </LazyChunkBoundary>
        )}
        {pendingLocale && (
          <div
            ref={dialogRef}
            className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-xs sm:px-6 dark:bg-slate-900/70"
            role="dialog"
            aria-modal="true"
            aria-labelledby="locale-dialog-title"
            aria-describedby="locale-dialog-description"
          >
            <div className="relative w-full max-w-md translate-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl transition-transform sm:translate-y-4 lg:translate-y-2 dark:border-slate-700 dark:bg-slate-900">
              <h3
                id="locale-dialog-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                {translateWithFallback('topbar.langSwitch.title', '切换语言')}
              </h3>
              <p
                id="locale-dialog-description"
                className="mt-2 text-sm text-slate-600 dark:text-slate-300"
              >
                {t('topbar.langSwitch.description', {
                  language: targetLocaleName || localeNameFallback,
                })}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-hidden dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
                  onClick={handleLanguageOnly}
                >
                  {translateWithFallback('topbar.langSwitch.languageOnly', '仅切换语言')}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-hidden"
                  onClick={handleLoadTemplate}
                >
                  {t('topbar.langSwitch.loadTemplate', {
                    language: targetLocaleName || localeNameFallback,
                  })}
                </button>
              </div>
              <button
                type="button"
                className="mt-4 text-sm font-medium text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                onClick={closeLocaleDialog}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </>
    </AIResumeInterviewProvider>
  );
};

export default ActionButtons;
