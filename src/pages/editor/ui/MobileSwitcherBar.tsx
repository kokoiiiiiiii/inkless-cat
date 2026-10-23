type MobileSwitcherBarProps = {
  showEditor: boolean;
  showPreview: boolean;
  onSelectEditor: () => void;
  onSelectPreview: () => void;
  editorLabel: string;
  previewLabel: string;
};

export const MobileSwitcherBar = ({
  showEditor,
  showPreview,
  onSelectEditor,
  onSelectPreview,
  editorLabel,
  previewLabel,
}: MobileSwitcherBarProps) => (
  <div className="sticky top-20 z-30 -mx-1 flex rounded-full border border-slate-200/60 bg-white/90 p-1 shadow-xs backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-900/70 print:hidden">
    <button
      type="button"
      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 ${
        showEditor
          ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/30'
          : 'text-slate-600 hover:text-brand-500 dark:text-slate-300 dark:hover:text-brand-200'
      }`}
      onClick={onSelectEditor}
      aria-pressed={showEditor}
    >
      {editorLabel}
    </button>
    <button
      type="button"
      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 ${
        showPreview
          ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/30'
          : 'text-slate-600 hover:text-brand-500 dark:text-slate-300 dark:hover:text-brand-200'
      }`}
      onClick={onSelectPreview}
      aria-pressed={showPreview}
    >
      {previewLabel}
    </button>
  </div>
);
