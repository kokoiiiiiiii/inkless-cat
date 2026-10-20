import { useI18n } from '@shared/i18n';
import { createAppError } from '@shared/lib/errors';
import { MAX_IMPORT_JSON_BYTES } from '@shared/lib/limits';
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
      if (file.size > MAX_IMPORT_JSON_BYTES) {
        showError(createAppError('FILE_TOO_LARGE', t('common.errors.fileTooLarge')));
        event.target.value = '';
        return;
      }

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
      try {
        reader.readAsText(file, 'utf-8');
      } catch (error) {
        showError(createAppError('FILE_READ_FAILED', t('topbar.importError'), { cause: error }));
        event.target.value = '';
      }
    },
    [onImport, showError, t],
  );

  return { inputRef, openPicker, handleFileChange };
};

export default useResumeImportDialog;
