import { createEmptyResume, useResumeActions, useResumeState } from '@entities/resume';
import { templates as builtInTemplates } from '@entities/template';
import { useUIActions, useUIState } from '@entities/ui';
import { useExportResume } from '@features/export-resume';
import { useImportResume } from '@features/import-resume';
import { useSortableSections } from '@features/sort-modules';
import { useMediaQuery } from '@shared/hooks';
import { useI18n } from '@shared/i18n';
import { useCallback, useDeferredValue } from 'react';

import { isBrowser } from '../lib/storage';
import { useEditorBootstrap } from './useEditorBootstrap';
import { useEditorStorageSync } from './useEditorStorageSync';
import { useMobileLayout } from './useMobileLayout';
import { useScrollSync } from './useScrollSync';
import { useTemplateLibrary } from './useTemplateLibrary';

const defaultTemplateId = builtInTemplates[0]?.id ?? 'modern-blue';

export const useEditorController = () => {
  const { t, locale } = useI18n();
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

  const scrollSync = useScrollSync({ activeSections, resume });
  const {
    editorScrollContainerRef,
    previewScrollContainerRef,
    registerPreviewRef,
    registerEditorSectionRef,
    handleFieldFocus,
  } = scrollSync;

  useEditorBootstrap({
    resetState,
    updateActiveSections,
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

  const {
    activeTemplate,
    handleResetSample,
    handleTemplateStyleChange,
    handleTemplateSampleLoad,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleUpdateCustomTemplate,
  } = useTemplateLibrary({
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
  });

  const { showEditor, showPreview } = useMobileLayout({
    isLargeScreen,
    mobileView,
    setMobileView,
    editorScrollContainerRef,
    previewScrollContainerRef,
  });

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

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const handleToggleTemplatePanel = useCallback(() => {
    setTemplatePanelOpen((open) => !open);
  }, [setTemplatePanelOpen]);

  const toggleModulePanel = useCallback(() => {
    setModulePanelOpen((open) => !open);
  }, [setModulePanelOpen]);

  const addCustomSection = useCallback(() => {
    if (!isBrowser) {
      appendCustomSection();
      return;
    }
    const message = t('modules.customSection.promptTitle');
    const placeholder = t('modules.customSection.promptPlaceholder');
    const fallback = t('modules.customSection.defaultTitle');
    const input = globalThis.prompt(
      message === 'modules.customSection.promptTitle' ? 'Enter a module name' : message,
      placeholder === 'modules.customSection.promptPlaceholder' ? fallback : placeholder,
    );
    if (input === null) return;
    appendCustomSection(input.trim() || fallback);
  }, [appendCustomSection, t]);

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
    theme,
    toggleTheme,
    templatePanelOpen,
    handleToggleTemplatePanel,
    modulePanelOpen,
    toggleModulePanel,
    activeTemplate,
    customTemplates,
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
    baseTemplates: builtInTemplates,
  };
};

export type UseEditorControllerResult = ReturnType<typeof useEditorController>;
