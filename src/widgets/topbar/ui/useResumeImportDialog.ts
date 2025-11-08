import { type ChangeEvent, useCallback, useRef } from 'react';

import { useI18n } from '@shared/i18n';

type ResumeImportHandler = (payload: unknown) => void;

const useResumeImportDialog = (onImport: ResumeImportHandler) => {
  const { t } = useI18n();
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
          const message = t('topbar.importError');
          globalThis.alert(message === 'topbar.importError' ? 'Import failed.' : message);
        } finally {
          event.target.value = '';
        }
      });
      reader.readAsText(file, 'utf-8');
    },
    [onImport, t],
  );

  return { inputRef, openPicker, handleFileChange };
};

export default useResumeImportDialog;
