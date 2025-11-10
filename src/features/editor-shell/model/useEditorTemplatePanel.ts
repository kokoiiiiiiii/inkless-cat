import type { ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import type { Locale } from '@shared/i18n';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

import { useTemplateLibrary } from './useTemplateLibrary';

type UseEditorTemplatePanelOptions = {
  baseTemplates: ResumeTemplate[];
  templateId: string;
  customTemplates: ResumeTemplate[];
  setTemplateId: Dispatch<SetStateAction<string>>;
  setCustomTemplates: Dispatch<SetStateAction<ResumeTemplate[]>>;
  resume: ResumeData;
  resetState: (value: ResumeData) => void;
  hasResumeChanges: boolean;
  setHasResumeChanges: (value: boolean) => void;
  defaultTemplateId: string;
  setLocale: (locale: Locale) => void;
};

export const useEditorTemplatePanel = ({
  baseTemplates,
  templateId,
  customTemplates,
  setTemplateId,
  setCustomTemplates,
  resume,
  resetState,
  hasResumeChanges,
  setHasResumeChanges,
  defaultTemplateId,
  setLocale,
}: UseEditorTemplatePanelOptions) => {
  const {
    activeTemplate,
    handleResetSample,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
    loadTemplateForLocale,
  } = useTemplateLibrary({
    baseTemplates,
    templateId,
    customTemplates,
    setTemplateId,
    setCustomTemplates,
    resume,
    resetState,
    hasResumeChanges,
    setHasResumeChanges,
    defaultTemplateId,
  });

  const handleLocaleChange = useCallback(
    (nextLocale: Locale, options?: { loadTemplate?: boolean }) => {
      setLocale(nextLocale);
      if (options?.loadTemplate) {
        loadTemplateForLocale(nextLocale);
      }
    },
    [loadTemplateForLocale, setLocale],
  );

  return {
    baseTemplates,
    activeTemplate,
    customTemplates,
    handleResetSample,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
    handleLocaleChange,
  };
};

export type UseEditorTemplatePanelResult = ReturnType<typeof useEditorTemplatePanel>;
