import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import type { Locale } from '@shared/i18n';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

import { useEditorBootstrap } from './useEditorBootstrap';
import { useEditorStorageSync } from './useEditorStorageSync';

type UseEditorLifecycleOptions = {
  resetState: (resume?: ResumeData) => void;
  updateActiveSections: (sections: ActiveSectionKey[]) => void;
  setTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  setTemplateId: Dispatch<SetStateAction<string>>;
  setCustomTemplates: Dispatch<SetStateAction<ResumeTemplate[]>>;
  defaultTemplateId: string;
  locale: Locale;
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  theme: 'light' | 'dark';
  templateId: string;
  customTemplates: ResumeTemplate[];
};

export const useEditorLifecycle = ({
  resetState,
  updateActiveSections,
  setTheme,
  setTemplateId,
  setCustomTemplates,
  defaultTemplateId,
  locale,
  resume,
  activeSections,
  theme,
  templateId,
  customTemplates,
}: UseEditorLifecycleOptions) => {
  const setInitialActiveSections = useCallback(
    (sections: ActiveSectionKey[]) => {
      updateActiveSections(sections);
    },
    [updateActiveSections],
  );

  useEditorBootstrap({
    resetState,
    updateActiveSections: setInitialActiveSections,
    setTheme,
    setTemplateId,
    setCustomTemplates,
    defaultTemplateId,
    locale,
  });

  useEditorStorageSync({
    resume,
    activeSections,
    theme,
    templateId,
    customTemplates,
  });
};

export type UseEditorLifecycleResult = ReturnType<typeof useEditorLifecycle>;
