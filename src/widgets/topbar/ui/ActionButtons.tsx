import type { ChangeEvent, RefObject } from 'react';

import { useI18n } from '@shared/i18n';

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
}: ActionButtonsProps) => {
  const { t, locale, setLocale } = useI18n();
  const toggleLocale = () => setLocale(locale === 'en' ? 'zh-CN' : 'en');

  return (
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
      <button type="button" className={baseButtonClass} onClick={toggleLocale}>
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
  );
};

export default ActionButtons;
