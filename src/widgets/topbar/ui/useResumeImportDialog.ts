import { type ChangeEvent, useCallback, useRef } from 'react';

type ResumeImportHandler = (payload: unknown) => void;

const useResumeImportDialog = (onImport: ResumeImportHandler) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const [file] = event.target.files || [];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          const textContent = typeof reader.result === 'string' ? reader.result : '';
          if (!textContent) {
            throw new Error('EMPTY_FILE');
          }
          onImport(JSON.parse(textContent));
        } catch {
          globalThis.alert('导入失败，请确认文件内容为合法的 JSON 简历数据。');
        } finally {
          event.target.value = '';
        }
      });
      reader.readAsText(file, 'utf-8');
    },
    [onImport],
  );

  return { inputRef, openPicker, handleFileChange };
};

export default useResumeImportDialog;
