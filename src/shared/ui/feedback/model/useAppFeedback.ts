import { useI18n } from '@shared/i18n';
import type { AppError } from '@shared/lib/errors';
import { useCallback } from 'react';

import { useFeedbackActions } from './feedback.store';

let activeUndoFeedbackId: string | null = null;

const ERROR_MESSAGE_KEYS: Record<AppError['code'], string> = {
  INVALID_JSON: 'common.errors.invalidJson',
  INVALID_RESUME: 'common.errors.invalidResume',
  INVALID_WORKSPACE: 'common.errors.invalidWorkspace',
  UNSUPPORTED_RESUME_VERSION: 'common.errors.unsupportedResumeVersion',
  UNSUPPORTED_WORKSPACE_VERSION: 'common.errors.unsupportedWorkspaceVersion',
  IMPORT_FAILED: 'common.errors.importFailed',
  EXPORT_FAILED: 'common.errors.exportFailed',
  PRINT_FAILED: 'common.errors.printFailed',
  FILE_READ_FAILED: 'common.errors.fileReadFailed',
  FILE_TOO_LARGE: 'common.errors.fileTooLarge',
  LIMIT_EXCEEDED: 'common.errors.limitExceeded',
  OPERATION_FAILED: 'common.errors.operationFailed',
  STORAGE_FAILED: 'common.errors.storageFailed',
};

export const useAppFeedback = () => {
  const { t } = useI18n();
  const { pushFeedback, dismissFeedback } = useFeedbackActions();

  const showError = useCallback(
    (error: AppError) => {
      const translated = t(ERROR_MESSAGE_KEYS[error.code]);
      pushFeedback({
        tone: 'error',
        title: t('common.feedback.errorTitle'),
        message: translated === ERROR_MESSAGE_KEYS[error.code] ? error.message : translated,
      });
    },
    [pushFeedback, t],
  );

  const showSuccess = useCallback(
    (message: string) => {
      pushFeedback({
        tone: 'success',
        title: t('common.feedback.successTitle'),
        message,
      });
    },
    [pushFeedback, t],
  );

  const showInfo = useCallback(
    (message: string) => {
      pushFeedback({
        tone: 'info',
        title: t('common.feedback.infoTitle'),
        message,
      });
    },
    [pushFeedback, t],
  );

  const showUndo = useCallback(
    (message: string, onUndo: () => void, durationMs = 12_000) => {
      if (activeUndoFeedbackId) dismissFeedback(activeUndoFeedbackId);
      activeUndoFeedbackId = pushFeedback({
        tone: 'info',
        title: t('common.feedback.undoAvailableTitle'),
        message,
        action: { label: t('common.feedback.undo'), onClick: onUndo },
        durationMs,
      });
    },
    [dismissFeedback, pushFeedback, t],
  );

  return {
    showError,
    showSuccess,
    showInfo,
    showUndo,
  };
};
