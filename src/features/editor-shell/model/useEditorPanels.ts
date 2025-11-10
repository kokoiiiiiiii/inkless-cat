import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

type UseEditorPanelsOptions = {
  theme: 'light' | 'dark';
  setTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  templatePanelOpen: boolean;
  setTemplatePanelOpen: Dispatch<SetStateAction<boolean>>;
  modulePanelOpen: boolean;
  setModulePanelOpen: Dispatch<SetStateAction<boolean>>;
};

export const useEditorPanels = ({
  theme,
  setTheme,
  templatePanelOpen,
  setTemplatePanelOpen,
  modulePanelOpen,
  setModulePanelOpen,
}: UseEditorPanelsOptions) => {
  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const handleToggleTemplatePanel = useCallback(() => {
    setTemplatePanelOpen((open) => !open);
  }, [setTemplatePanelOpen]);

  const toggleModulePanel = useCallback(() => {
    setModulePanelOpen((open) => !open);
  }, [setModulePanelOpen]);

  return {
    theme,
    toggleTheme,
    templatePanelOpen,
    handleToggleTemplatePanel,
    modulePanelOpen,
    toggleModulePanel,
  };
};

export type UseEditorPanelsResult = ReturnType<typeof useEditorPanels>;
