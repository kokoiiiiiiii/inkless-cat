import { ChangeEvent, CSSProperties, useRef } from "react";

type PhotoUploadProps = {
  value?: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  size?: number;
  hidden?: boolean;
};

const uploadButtonClass =
  "inline-flex items-center justify-center rounded-full border border-transparent bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/40 transition hover:-translate-y-0.5 hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-brand-500 dark:hover:bg-brand-400";

const clearButtonClass =
  "inline-flex items-center justify-center rounded-full border border-transparent bg-slate-200/70 px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700/70";

const PhotoUpload = ({
  value,
  onChange,
  onFocus,
  size = 144,
  hidden = false,
}: PhotoUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    const file = files && files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      window.alert("图片大小超过 2MB，请选择更小的文件。");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
      event.target.value = "";
    };
    reader.onerror = () => {
      window.alert("读取图片失败，请重试或更换文件。");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  if (hidden) {
    return null;
  }

  const boxStyle: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-5 text-center shadow-inner shadow-slate-200/60 dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-none">
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        style={boxStyle}
      >
        {value ? (
          <img
            src={value}
            alt="个人照片预览"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 9l-4.5 4.5m0 0L7.5 9m4.5 4.5V3"
              />
            </svg>
            <span className="text-xs">上传照片</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className={uploadButtonClass}
          onClick={() => {
            onFocus?.();
            handleSelect();
          }}
        >
          选择照片
        </button>
        {value && (
          <button
            type="button"
            className={clearButtonClass}
            onClick={() => {
              onFocus?.();
              onChange("");
            }}
          >
            移除照片
          </button>
        )}
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          建议尺寸 400×400，支持 JPG / PNG，文件需小于 2MB。
        </p>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default PhotoUpload;
