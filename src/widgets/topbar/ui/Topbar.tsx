import ActionButtons from './ActionButtons';
import LogoSection from './LogoSection';
import useResumeImportDialog from './useResumeImportDialog';

type TopbarProps = {
  onResetSample: () => void;
  onClear: () => void;
  onImport: (data: unknown) => void;
  onExport: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
};

const Topbar = ({
  onResetSample,
  onClear,
  onImport,
  onExport,
  onExportMarkdown,
  onPrint,
  theme,
  onToggleTheme,
}: TopbarProps) => {
  const { inputRef, openPicker, handleFileChange } = useResumeImportDialog(onImport);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70 print:hidden">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <LogoSection />
        <ActionButtons
          onResetSample={onResetSample}
          onClear={onClear}
          onImportClick={openPicker}
          onExport={onExport}
          onExportMarkdown={onExportMarkdown}
          onPrint={onPrint}
          theme={theme}
          onToggleTheme={onToggleTheme}
          inputRef={inputRef}
          onFileChange={handleFileChange}
        />
      </div>
    </header>
  );
};

export default Topbar;
