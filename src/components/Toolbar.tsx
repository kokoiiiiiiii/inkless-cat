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
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-brand-400 dark:hover:text-brand-200";

const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-transparent bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/40 transition-all hover:-translate-y-0.5 hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-brand-500 dark:hover:bg-brand-400";

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
      } catch (error) {
        console.error("Failed to import resume data", error);
        window.alert("导入失败，请确认文件内容为合法的 JSON 简历数据。");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <header className="print:hidden sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/Inkless Cat.png"
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
