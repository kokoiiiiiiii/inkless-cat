import type { ResumeData } from '@entities/resume';
import { createEmptyResume } from '@entities/resume';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

import { isBrowser } from '../lib/storage';

type UseEditorIoActionsOptions = {
  resetState: (nextResume?: ResumeData) => void;
  setHasResumeChanges: (hasChanges: boolean) => void;
  importFromObject: (payload: unknown) => { success: boolean; message?: string };
  exportJson: () => void;
  exportMarkdown: () => void;
  isLargeScreen: boolean;
  setMobileView: Dispatch<SetStateAction<'editor' | 'preview'>>;
};

export const useEditorIoActions = ({
  resetState,
  setHasResumeChanges,
  importFromObject,
  exportJson,
  exportMarkdown,
  isLargeScreen,
  setMobileView,
}: UseEditorIoActionsOptions) => {
  const handleClear = useCallback(() => {
    resetState(createEmptyResume());
    setHasResumeChanges(false);
  }, [resetState, setHasResumeChanges]);

  const handleImport = useCallback(
    (payload: unknown) => {
      const result = importFromObject(payload);
      if (!result.success && result.message && isBrowser) {
        globalThis.alert(result.message);
      }
    },
    [importFromObject],
  );

  const handleExportJson = useCallback(() => {
    exportJson();
  }, [exportJson]);

  const handleExportMarkdown = useCallback(() => {
    exportMarkdown();
  }, [exportMarkdown]);

  const handlePrint = useCallback(() => {
    if (!isBrowser) return;
    if (!isLargeScreen) {
      setMobileView('preview');
      globalThis.requestAnimationFrame(() => {
        globalThis.setTimeout(() => {
          globalThis.print();
        }, 120);
      });
      return;
    }
    globalThis.print();
  }, [isLargeScreen, setMobileView]);

  return {
    handleClear,
    handleImport,
    handleExportJson,
    handleExportMarkdown,
    handlePrint,
  };
};

export type UseEditorIoActionsResult = ReturnType<typeof useEditorIoActions>;
