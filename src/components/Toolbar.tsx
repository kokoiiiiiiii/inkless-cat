import { useRef, type ChangeEvent } from "react";

type ToolbarProps = {
  onResetSample: () => void;
  onClear: () => void;
  onImport: (data: unknown) => void;
  onExport: () => void;
  onExportMarkdown: () => void;
  onPrint: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

const baseButton =
  "inline-flex min-w-fit flex-shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:px-4 sm:text-sm";

const primaryButton =
  "inline-flex min-w-fit flex-shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/40 transition-all hover:-translate-y-0.5 hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-brand-500 dark:hover:bg-brand-400 sm:px-4 sm:text-sm";

const inklessCatLogo = new URL("../assets/Inkless Cat.png", import.meta.url)
  .href;

const Toolbar = ({
  onResetSample,
  onClear,
  onImport,
  onExport,
  onExportMarkdown,
  onPrint,
  theme,
  onToggleTheme,
}: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const textContent =
          typeof reader.result === "string" ? reader.result : "";
        if (!textContent) {
          throw new Error("Empty file content");
        }
        const parsed = JSON.parse(textContent);
        onImport(parsed);
      } catch {
        window.alert("导入失败，请确认文件内容为合法的 JSON 简历数据。");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <header className="print:hidden sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src={inklessCatLogo}
            alt="Inkless Cat 标志"
            className="size-10 rounded-full border border-slate-200/70 bg-white object-cover shadow-inner shadow-brand-200/60 dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-wide text-slate-900 dark:text-white sm:text-lg">
              Inkless Cat
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              无墨猫简历编辑器
            </span>
          </div>
          <a
            href="https://github.com/kokoiiiiiiii/inkless-cat"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 仓库"
            className="ml-2 inline-flex size-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-500 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5"
            >
              <path
                fill="currentColor"
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.34-3.37-1.34-.46-1.17-1.12-1.48-1.12-1.48-.92-.63.07-.61.07-.61 1.02.07 1.56 1.05 1.56 1.05.9 1.55 2.36 1.1 2.94.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 7.5c.85 0 1.7.11 2.5.32 1.9-1.29 2.74-1.02 2.74-1.02.56 1.39.21 2.42.11 2.67.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.58 4.93.36.3.68.9.68 1.81v2.68c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
              />
            </svg>
          </a>
        </div>
        <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 scrollbar-thin sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
          <button type="button" className={baseButton} onClick={onResetSample}>
            载入示例
          </button>
          <button type="button" className={baseButton} onClick={onClear}>
            清空
          </button>
          <button
            type="button"
            className={baseButton}
            onClick={handleImportClick}
          >
            导入
          </button>
          <button type="button" className={baseButton} onClick={onExport}>
            导出
          </button>
          <button
            type="button"
            className={baseButton}
            onClick={onExportMarkdown}
          >
            导出 Markdown
          </button>
          <button type="button" className={primaryButton} onClick={onPrint}>
            打印 / PDF
          </button>
          <button type="button" className={baseButton} onClick={onToggleTheme}>
            {theme === "light" ? "夜间模式" : "日间模式"}
          </button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="application/json"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
