import { useI18n } from '@shared/i18n';
import { createAppError } from '@shared/lib/errors';
import { useAppFeedback } from '@shared/ui/feedback';
import { type ChangeEvent, useCallback, useRef } from 'react';

type ResumeImportHandler = (content: string) => void;

const useResumeImportDialog = (onImport: ResumeImportHandler) => {
  const { t } = useI18n();
  const { showError } = useAppFeedback();
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
          onImport(textContent);
        } catch {
          showError(createAppError('FILE_READ_FAILED', t('topbar.importError')));
        } finally {
          event.target.value = '';
        }
      });
      reader.addEventListener('error', () => {
        showError(createAppError('FILE_READ_FAILED', t('topbar.importError')));
        event.target.value = '';
      });
      reader.readAsText(file, 'utf-8');
    },
    [onImport, showError, t],
  );

  return { inputRef, openPicker, handleFileChange };
};

export default useResumeImportDialog;
