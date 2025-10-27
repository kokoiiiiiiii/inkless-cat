import type { ResumeData } from '@entities/resume';
import { useCallback } from 'react';

import type {
  UseModuleEditorOptions,
  UseModuleEditorResult,
} from './types';
import { useCustomSectionsEditor } from './useCustomSectionsEditor';
import { usePersonalEditor } from './usePersonalEditor';
import { useStandardSectionEditor } from './useStandardSectionEditor';

export const useModuleEditor = ({
  resume,
  onChange,
}: UseModuleEditorOptions): UseModuleEditorResult => {
  const updateDraft = useCallback(
    (mutator: (draft: ResumeData) => void) => {
      onChange((draft) => {
        mutator(draft);
      });
    },
    [onChange],
  );

  const personalHandlers = usePersonalEditor(resume, updateDraft);
  const standardHandlers = useStandardSectionEditor(updateDraft);
  const customHandlers = useCustomSectionsEditor(resume, updateDraft);

  return {
    ...personalHandlers,
    ...standardHandlers,
    ...customHandlers,
  };
};

export type {
  PersonalSettings,
  ResumeSectionItem,
  UseModuleEditorOptions,
  UseModuleEditorResult,
} from './types';
