import { createEmptyResume, type ResumeData } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import type { AppError } from '@shared/lib/errors';
import { isErr, type Result } from '@shared/lib/result';
import { isBrowser } from '@shared/lib/storage';
import { useAppFeedback } from '@shared/ui/feedback';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

type UseEditorIoActionsOptions = {
  resetState: (nextResume?: ResumeData) => void;
  setHasResumeChanges: (hasChanges: boolean) => void;
  importFromJson: (content: string) => Result<
    | {
        kind: 'resume';
      }
    | {
        kind: 'workspace';
      },
    AppError
  >;
  exportJson: () => Result<void, AppError>;
  exportWorkspaceJson: () => Result<void, AppError>;
  exportMarkdown: () => Result<void, AppError>;
  isLargeScreen: boolean;
  setMobileView: Dispatch<SetStateAction<'editor' | 'preview'>>;
};

export const useEditorIoActions = ({
  resetState,
  setHasResumeChanges,
  importFromJson,
  exportJson,
  exportWorkspaceJson,
  exportMarkdown,
  isLargeScreen,
  setMobileView,
}: UseEditorIoActionsOptions) => {
  const { t } = useI18n();
  const { showError, showInfo, showSuccess } = useAppFeedback();

  const handleClear = useCallback(() => {
    resetState(createEmptyResume());
    setHasResumeChanges(false);
  }, [resetState, setHasResumeChanges]);

  const handleImport = useCallback(
    (content: string) => {
      const result = importFromJson(content);
      if (isErr(result)) {
        showError(result.error);
        return;
      }

      setHasResumeChanges(false);
      showSuccess(
        result.value.kind === 'workspace'
          ? t('common.feedback.importWorkspaceSuccess')
          : t('common.feedback.importResumeSuccess'),
      );
    },
    [importFromJson, setHasResumeChanges, showError, showSuccess, t],
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
