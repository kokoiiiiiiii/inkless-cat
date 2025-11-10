import { useResumeActions, useResumeState } from '@entities/resume';
import { templates as builtInTemplates } from '@entities/template';
import { useUIActions, useUIState } from '@entities/ui';
import {
  useCustomSectionPrompt,
  useEditorIoActions,
  useEditorLifecycle,
  useEditorPanels,
  useEditorTemplatePanel,
  useMobileSwitcher,
  useScrollSync,
} from '@features/editor-shell';
import { useExportResume } from '@features/export-resume';
import { useImportResume } from '@features/import-resume';
import { useSortableSections } from '@features/sort-modules';
import { useMediaQuery } from '@shared/hooks';
import { useI18n } from '@shared/i18n';
import { useDeferredValue } from 'react';

const defaultTemplateId = builtInTemplates[0]?.id ?? 'modern-blue';

export const useEditorController = () => {
  const { locale, setLocale } = useI18n();
  const { resume, activeSections, hasResumeChanges } = useResumeState();
  const { updateResume, updateActiveSections, setHasResumeChanges, resetState } =
    useResumeActions();
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
  const { importFromObject } = useImportResume();
  const { exportJson, exportMarkdown } = useExportResume();
  const deferredResume = useDeferredValue(resume);
  const deferredActiveSections = useDeferredValue(activeSections);
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');

  useEditorLifecycle({
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
  });

  const scrollSync = useScrollSync({ activeSections, resume });
  const {
    editorScrollContainerRef,
    previewScrollContainerRef,
    registerPreviewRef,
    registerEditorSectionRef,
    handleFieldFocus,
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
    defaultTemplateId,
    setLocale,
  });

  const ioActions = useEditorIoActions({
    resetState,
    setHasResumeChanges,
    importFromObject,
    exportJson,
    exportMarkdown,
    isLargeScreen,
    setMobileView,
  });

  const addCustomSection = useCustomSectionPrompt({ appendCustomSection });

  const { showEditor, showPreview } = useMobileSwitcher({
    isLargeScreen,
    mobileView,
    setMobileView,
    editorScrollContainerRef,
    previewScrollContainerRef,
  });

  const { handleClear, handleImport, handleExportJson, handleExportMarkdown, handlePrint } =
    ioActions;

  const {
    theme: resolvedTheme,
    toggleTheme,
    templatePanelOpen: resolvedTemplatePanelOpen,
    handleToggleTemplatePanel,
    modulePanelOpen: resolvedModulePanelOpen,
    toggleModulePanel,
  } = panelState;

  const {
    baseTemplates,
    activeTemplate,
    customTemplates: resolvedCustomTemplates,
    handleResetSample,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
    handleLocaleChange,
  } = templatePanel;

  return {
    resume,
    deferredResume,
    activeSections,
    deferredActiveSections,
    customSections,
    updateResume,
    handleResetSample,
    handleClear,
    handleImport,
    handleExportJson,
    handleExportMarkdown,
    handlePrint,
    theme: resolvedTheme,
    toggleTheme,
    templatePanelOpen: resolvedTemplatePanelOpen,
    handleToggleTemplatePanel,
    modulePanelOpen: resolvedModulePanelOpen,
    toggleModulePanel,
    activeTemplate,
    customTemplates: resolvedCustomTemplates,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
    addCustomSection,
    removeCustomSection,
    reorderSections,
    toggleSection,
    handleFieldFocus,
    registerPreviewRef,
    registerEditorSectionRef,
    editorScrollContainerRef,
    previewScrollContainerRef,
    showEditor,
    showPreview,
    isLargeScreen,
    mobileView,
    setMobileView,
    baseTemplates,
    handleLocaleChange,
  };
};

export type UseEditorControllerResult = ReturnType<typeof useEditorController>;
