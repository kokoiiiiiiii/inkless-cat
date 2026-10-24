import { StudioIcon } from '@shared/ui/studio';

type MobileSwitcherBarProps = {
  showEditor: boolean;
  showPreview: boolean;
  onSelectEditor: () => void;
  onSelectPreview: () => void;
  editorLabel: string;
  previewLabel: string;
  navigationLabel: string;
};

export const MobileSwitcherBar = ({
  showEditor,
  showPreview,
  onSelectEditor,
  onSelectPreview,
  editorLabel,
  previewLabel,
  navigationLabel,
}: MobileSwitcherBarProps) => (
  <nav
    aria-label={navigationLabel}
    className="production-mobile-switcher studio-glass print:hidden"
  >
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
      <StudioIcon name="file" />
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
      <StudioIcon name="eye" />
      {previewLabel}
    </button>
  </nav>
);
