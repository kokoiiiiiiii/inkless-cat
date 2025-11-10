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
import { useModulesPanelController } from '@features/modules-panel';
import { ResumePreview } from '@features/resume-preview';
import { useSortableSections } from '@features/sort-modules';
import { useMediaQuery } from '@shared/hooks';
import { useI18n } from '@shared/i18n';
import { ModulesPanel } from '@widgets/modules-panel';
import { TemplateSelector } from '@widgets/template-selector';
import { Topbar } from '@widgets/topbar';
import { useDeferredValue } from 'react';

const defaultTemplateId = builtInTemplates[0]?.id ?? 'modern-blue';

function EditorPage() {
  const { t, locale, setLocale } = useI18n();
  const { resume, activeSections, hasResumeChanges } = useResumeState();
  const { updateResume, updateActiveSections, setHasResumeChanges, resetState } =
    useResumeActions();
  const {
    customSections,
    toggleSection,
    reorderSections,
    addCustomSection: appendCustomSection,
    removeCustomSection,
  } = useSortableSections();
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

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <Topbar
        onResetSample={templatePanel.handleResetSample}
        onClear={ioActions.handleClear}
        onImport={ioActions.handleImport}
        onExport={ioActions.handleExportJson}
        onExportMarkdown={ioActions.handleExportMarkdown}
        onPrint={ioActions.handlePrint}
        theme={panelState.theme}
        onToggleTheme={panelState.toggleTheme}
        onLocaleChange={templatePanel.handleLocaleChange}
      />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 pb-16 pt-4 sm:gap-6 sm:pt-6 lg:grid lg:grid-cols-2 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        {!isLargeScreen && (
          <div className="sticky top-20 z-30 -mx-1 flex rounded-full border border-slate-200/60 bg-white/90 p-1 shadow-sm backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-900/70 print:hidden">
            <button
              type="button"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                showEditor
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                  : 'text-slate-600 hover:text-brand-500 dark:text-slate-300 dark:hover:text-brand-200'
              }`}
              onClick={() => setMobileView('editor')}
              aria-pressed={showEditor}
            >
              {t('editor.title')}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                showPreview
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                  : 'text-slate-600 hover:text-brand-500 dark:text-slate-300 dark:hover:text-brand-200'
              }`}
              onClick={() => setMobileView('preview')}
              aria-pressed={showPreview}
            >
              {t('preview.title')}
            </button>
          </div>
        )}
        <section
          className={`flex min-h-0 flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_35px_60px_-25px_rgba(15,23,42,0.75)] sm:p-6 print:hidden ${
            showEditor ? '' : 'hidden'
          } lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden`}
          aria-hidden={!showEditor && !isLargeScreen}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('editor.title')}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('editor.desc')}</p>
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
              onClick={panelState.handleToggleTemplatePanel}
              aria-expanded={panelState.templatePanelOpen}
            >
              {panelState.templatePanelOpen
                ? t('editor.templatePanel.collapse')
                : t('editor.templatePanel.expand')}
            </button>
          </div>
          <div
            ref={editorScrollContainerRef}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"
          >
            {panelState.templatePanelOpen && (
              <div className="mb-4">
                <TemplateSelector
                  builtInTemplates={templatePanel.baseTemplates}
                  customTemplates={templatePanel.customTemplates}
                  activeId={templatePanel.activeTemplate.id}
                  onStyleChange={templatePanel.handleTemplateStyleChange}
                  onLoadSample={templatePanel.handleTemplateSampleLoad}
                  onSaveTemplate={templatePanel.handleSaveCustomTemplate}
                  onDeleteTemplate={templatePanel.handleDeleteCustomTemplate}
                  onUpdateTemplate={templatePanel.handleUpdateCustomTemplate}
                />
              </div>
            )}
            <ModulesPanel
              resume={resume}
              controller={modulesPanelController}
              activeSections={activeSections}
              onSectionToggle={toggleSection}
              onSectionReorder={reorderSections}
              onAddCustomSection={addCustomSection}
              onRemoveCustomSection={removeCustomSection}
              modulePanelOpen={panelState.modulePanelOpen}
              onToggleModulePanel={panelState.toggleModulePanel}
            />
          </div>
        </section>
        <section
          className={`flex min-h-0 flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-soft backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_35px_60px_-25px_rgba(15,23,42,0.75)] sm:p-6 print:m-0 print:block print:w-full print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none ${
            showPreview ? '' : 'hidden print:block'
          } lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden`}
          aria-hidden={!showPreview && !isLargeScreen}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('preview.title')}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('preview.template', { name: templatePanel.activeTemplate.name })}
              </p>
            </div>
          </div>
          <div
            ref={previewScrollContainerRef}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"
          >
            <ResumePreview
              resume={deferredResume}
              registerSectionRef={registerPreviewRef}
              templateStyle={templatePanel.activeTemplate.previewStyle}
              accentColor={templatePanel.activeTemplate.accentColor}
              activeSections={deferredActiveSections}
              theme={templatePanel.activeTemplate.theme}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default EditorPage;
export { EditorPage };
