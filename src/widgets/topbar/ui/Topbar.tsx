import type { Locale } from '@shared/i18n';

import ActionButtons from './ActionButtons';
import LogoSection from './LogoSection';
import useResumeImportDialog from './useResumeImportDialog';

type TopbarProps = {
  onResetSample: () => void;
  onClear: () => void;
  onImport: (content: string) => void;
  onExport: () => void;
  onExportWorkspace: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLocaleChange: (nextLocale: Locale, options?: { loadTemplate?: boolean }) => void;
};

const Topbar = ({
  onResetSample,
  onClear,
  onImport,
  onExport,
  onExportWorkspace,
  onExportMarkdown,
  onPrint,
  theme,
  onToggleTheme,
  onLocaleChange,
}: TopbarProps) => {
  const { inputRef, openPicker, handleFileChange } = useResumeImportDialog(onImport);

  return (
    <header className="production-topbar studio-glass print:hidden">
      <div className="production-topbar__inner">
        <LogoSection />
        <ActionButtons
          onResetSample={onResetSample}
          onClear={onClear}
          onImportClick={openPicker}
          onExport={onExport}
          onExportWorkspace={onExportWorkspace}
          onExportMarkdown={onExportMarkdown}
          onPrint={onPrint}
          theme={theme}
          onToggleTheme={onToggleTheme}
          inputRef={inputRef}
          onFileChange={handleFileChange}
          onLocaleChange={onLocaleChange}
        />
      </div>
    </header>
  );
};

export default Topbar;
