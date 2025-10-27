import type { ChangeEvent, RefObject } from 'react';

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
}: ActionButtonsProps) => (
  <div className="scrollbar-thin flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
    <button type="button" className={baseButtonClass} onClick={onResetSample}>
      载入示例
    </button>
    <button type="button" className={baseButtonClass} onClick={onClear}>
      清空
    </button>
    <button type="button" className={baseButtonClass} onClick={onImportClick}>
      导入
    </button>
    <button type="button" className={baseButtonClass} onClick={onExport}>
      导出
    </button>
    <button type="button" className={baseButtonClass} onClick={onExportMarkdown}>
      导出 Markdown
    </button>
    <button type="button" className={primaryButtonClass} onClick={onPrint}>
      打印 / PDF
    </button>
    <button type="button" className={baseButtonClass} onClick={onToggleTheme}>
      {theme === 'light' ? '夜间模式' : '日间模式'}
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

export default ActionButtons;
