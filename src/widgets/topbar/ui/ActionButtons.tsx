import { type Locale, useI18n } from '@shared/i18n';
import type { ChangeEvent, RefObject } from 'react';
import { useState } from 'react';

import { baseButtonClass, primaryButtonClass } from './constants';

type ActionButtonsProps = {
  onResetSample: () => void;
  onClear: () => void;
  onImportClick: () => void;
  onExport: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  inputRef: RefObject<HTMLInputElement>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLocaleChange: (nextLocale: Locale, options?: { loadTemplate?: boolean }) => void;
};

const ActionButtons = ({
  onResetSample,
  onClear,
  onImportClick,
  onExport,
  onExportMarkdown,
  onPrint,
  theme,
  onToggleTheme,
  inputRef,
  onFileChange,
  onLocaleChange,
}: ActionButtonsProps) => {
  const { t, locale } = useI18n();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const nextLocale = locale === 'en' ? 'zh-CN' : 'en';
  const translateWithFallback = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const openLocaleDialog = () => setPendingLocale(nextLocale);
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

  return (
    <>
      <div className="scrollbar-thin flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
        <button type="button" className={baseButtonClass} onClick={onResetSample}>
          {t('topbar.loadSample')}
        </button>
        <button type="button" className={baseButtonClass} onClick={onClear}>
          {t('topbar.clear')}
        </button>
        <button type="button" className={baseButtonClass} onClick={onImportClick}>
          {t('topbar.import')}
        </button>
        <button type="button" className={baseButtonClass} onClick={onExport}>
          {t('topbar.export')}
        </button>
        <button type="button" className={baseButtonClass} onClick={onExportMarkdown}>
          {t('topbar.exportMarkdown')}
        </button>
        <button type="button" className={primaryButtonClass} onClick={onPrint}>
          {t('topbar.print')}
        </button>
        <button type="button" className={baseButtonClass} onClick={onToggleTheme}>
          {theme === 'light' ? t('topbar.themeDark') : t('topbar.themeLight')}
        </button>
        <button type="button" className={baseButtonClass} onClick={openLocaleDialog}>
          {t('topbar.toggleLang')}
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="application/json"
          onChange={onFileChange}
        />
      </div>
      {pendingLocale && (
        <div
          className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-slate-900/70 sm:px-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md translate-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl transition-transform dark:border-slate-700 dark:bg-slate-900 sm:translate-y-4 lg:translate-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {translateWithFallback('topbar.langSwitch.title', '切换语言')}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t('topbar.langSwitch.description', {
                language: targetLocaleName || localeNameFallback,
              })}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
                onClick={handleLanguageOnly}
              >
                {translateWithFallback('topbar.langSwitch.languageOnly', '仅切换语言')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
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
  );
};

export default ActionButtons;
