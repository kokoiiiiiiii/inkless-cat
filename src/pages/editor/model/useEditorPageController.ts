import { useResumeActions, useResumeState } from '@entities/resume';
import { DEFAULT_TEMPLATE_ID, templates as builtInTemplates } from '@entities/template';
import { useUIActions, useUIState } from '@entities/ui';
import {
  useCustomSectionPrompt,
  useEditorIoActions,
  useEditorPanels,
  useEditorTemplatePanel,
  useMobileSwitcher,
  useScrollSync,
} from '@features/editor-shell';
import { useExportResume } from '@features/export-resume';
import { useImportResume } from '@features/import-resume';
import { useModulesPanelController } from '@features/modules-panel';
import { useSortableSections } from '@features/sort-modules';
import { useMediaQuery } from '@shared/hooks';
import { useI18n } from '@shared/i18n';
import { useDeferredValue } from 'react';

export const useEditorPageController = () => {
  const { t, setLocale } = useI18n();
  const { resume, activeSections, hasResumeChanges } = useResumeState();
  const { updateResume, setHasResumeChanges, resetState } = useResumeActions();
  const { theme, templateId, customTemplates, templatePanelOpen, modulePanelOpen, mobileView } =
    useUIState();
  const {
    setTheme,
    setTemplateId,
    setCustomTemplates,
    setTemplatePanelOpen,
    setModulePanelOpen,
    setMobileView,
  } = useUIActions();
  const {
    customSections,
    toggleSection,
    reorderSections,
    addCustomSection: appendCustomSection,
    removeCustomSection,
  } = useSortableSections();
  const { importFromJson } = useImportResume();
  const { exportJson, exportWorkspaceJson, exportMarkdown } = useExportResume();
  const deferredResume = useDeferredValue(resume);
  const deferredActiveSections = useDeferredValue(activeSections);
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');

  const scrollSync = useScrollSync({ activeSections, resume });
  const {
    handleFieldFocus,
    registerPreviewRef,
    registerEditorSectionRef,
    editorScrollContainerRef,
    previewScrollContainerRef,
  } = scrollSync;

  const panelState = useEditorPanels({
    theme,
    setTheme,
    templatePanelOpen,
    setTemplatePanelOpen,
    modulePanelOpen,
    setModulePanelOpen,
  });

  const templatePanel = useEditorTemplatePanel({
    baseTemplates: builtInTemplates,
    templateId,
    customTemplates,
    setTemplateId,
    setCustomTemplates,
    resume,
    resetState,
    hasResumeChanges,
    setHasResumeChanges,
    defaultTemplateId: DEFAULT_TEMPLATE_ID,
    setLocale,
  });

  const ioActions = useEditorIoActions({
    resetState,
    setHasResumeChanges,
    importFromJson,
    exportJson,
    exportWorkspaceJson,
    exportMarkdown,
    isLargeScreen,
    setMobileView,
  });

  const addCustomSection = useCustomSectionPrompt({ appendCustomSection });

  const modulesPanelController = useModulesPanelController({
    resume,
    onChange: updateResume,
    activeSections,
    customSections,
    onFieldFocus: handleFieldFocus,
    onRemoveCustomSection: removeCustomSection,
    registerSectionRef: registerEditorSectionRef,
  });

  const { showEditor, showPreview } = useMobileSwitcher({
    isLargeScreen,
    mobileView,
    setMobileView,
    editorScrollContainerRef,
    previewScrollContainerRef,
  });

  return {
    t,
    resume,
    deferredResume,
    activeSections,
    deferredActiveSections,
    modulesPanelController,
    addCustomSection,
    removeCustomSection,
    reorderSections,
    toggleSection,
    templatePanel,
    panelState,
    ioActions,
    showEditor,
    showPreview,
    isLargeScreen,
    setMobileView,
    editorScrollContainerRef,
    previewScrollContainerRef,
    registerPreviewRef,
  };
};

export type UseEditorPageControllerResult = ReturnType<typeof useEditorPageController>;
