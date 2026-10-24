import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

type UseEditorPanelsOptions = {
  theme: 'light' | 'dark';
  setTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  templatePanelOpen: boolean;
  toggleWorkspacePanel: (panel: 'templates' | 'modules') => boolean;
  modulePanelOpen: boolean;
};

export const useEditorPanels = ({
  theme,
  setTheme,
  templatePanelOpen,
  modulePanelOpen,
  toggleWorkspacePanel,
}: UseEditorPanelsOptions) => {
  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const handleToggleTemplatePanel = useCallback(() => {
    toggleWorkspacePanel('templates');
  }, [toggleWorkspacePanel]);

  const toggleModulePanel = useCallback(() => {
    toggleWorkspacePanel('modules');
  }, [toggleWorkspacePanel]);

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
