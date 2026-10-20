import { createEmptyResume, type ResumeData } from '@entities/resume';
import type { PreparedImport } from '@features/import-resume';
import { useI18n } from '@shared/i18n';
import type { AppError } from '@shared/lib/errors';
import { isErr, type Result } from '@shared/lib/result';
import { isBrowser } from '@shared/lib/storage';
import { useAppFeedback } from '@shared/ui/feedback';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { useDestructiveAction } from './useDestructiveAction';

type UseEditorIoActionsOptions = {
  resetState: (nextResume?: ResumeData) => void;
  prepareImportFromJson: (content: string) => Result<PreparedImport, AppError>;
  commitPreparedImport: (
    prepared: PreparedImport,
  ) => Result<{ kind: PreparedImport['kind'] }, AppError>;
  exportJson: () => Result<void, AppError>;
  exportWorkspaceJson: () => Result<void, AppError>;
  exportMarkdown: () => Result<void, AppError>;
  isLargeScreen: boolean;
  setMobileView: Dispatch<SetStateAction<'editor' | 'preview'>>;
};

export const useEditorIoActions = ({
  resetState,
  prepareImportFromJson,
  commitPreparedImport,
  exportJson,
  exportWorkspaceJson,
  exportMarkdown,
  isLargeScreen,
  setMobileView,
}: UseEditorIoActionsOptions) => {
  const { t } = useI18n();
  const { showError, showInfo, showSuccess } = useAppFeedback();
  const runDestructiveAction = useDestructiveAction();

  const handleClear = useCallback(() => {
    runDestructiveAction(t('common.confirmations.clearResume'), () => {
      resetState(createEmptyResume());
      return true;
    });
  }, [resetState, runDestructiveAction, t]);

  const handleImport = useCallback(
    (content: string) => {
      const preparedResult = prepareImportFromJson(content);
      if (isErr(preparedResult)) {
        showError(preparedResult.error);
        return;
      }

      runDestructiveAction(t('common.confirmations.importResume'), () => {
        const result = commitPreparedImport(preparedResult.value);
        if (isErr(result)) {
          showError(result.error);
          return false;
        }
        showSuccess(
          result.value.kind === 'workspace'
            ? t('common.feedback.importWorkspaceSuccess')
            : t('common.feedback.importResumeSuccess'),
        );
        return true;
      });
    },
    [commitPreparedImport, prepareImportFromJson, runDestructiveAction, showError, showSuccess, t],
  );

  const handleExportJson = useCallback(() => {
    const result = exportJson();
    if (isErr(result)) {
      showError(result.error);
      return;
    }
    showSuccess(t('common.feedback.exportResumeSuccess'));
  }, [exportJson, showError, showSuccess, t]);

  const handleExportWorkspaceJson = useCallback(() => {
    const result = exportWorkspaceJson();
    if (isErr(result)) {
      showError(result.error);
      return;
    }
    showSuccess(t('common.feedback.exportWorkspaceSuccess'));
  }, [exportWorkspaceJson, showError, showSuccess, t]);

  const handleExportMarkdown = useCallback(() => {
    const result = exportMarkdown();
    if (isErr(result)) {
      showError(result.error);
      return;
    }
    showSuccess(t('common.feedback.exportMarkdownSuccess'));
  }, [exportMarkdown, showError, showSuccess, t]);

  const handlePrint = useCallback(() => {
    try {
      if (!isBrowser) return;
      if (!isLargeScreen) {
        setMobileView('preview');
        globalThis.requestAnimationFrame(() => {
          globalThis.setTimeout(() => {
            globalThis.print();
          }, 120);
        });
        showInfo(t('common.feedback.printStarted'));
        return;
      }
      globalThis.print();
    } catch (error) {
      showError({
        code: 'PRINT_FAILED',
        message: 'Failed to print the resume.',
        cause: error,
      });
    }
  }, [isLargeScreen, setMobileView, showError, showInfo, t]);

  return {
    handleClear,
    handleImport,
    handleExportJson,
    handleExportWorkspaceJson,
    handleExportMarkdown,
    handlePrint,
  };
};

export type UseEditorIoActionsResult = ReturnType<typeof useEditorIoActions>;
