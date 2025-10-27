import { ModulesPanel } from '@widgets/modules-panel';
import { ResumePreview } from '@widgets/preview';
import { TemplateSelector } from '@widgets/template-selector';
import { Topbar } from '@widgets/topbar';

import { useEditorController } from './model/useEditorController';

function EditorPage() {
  const {
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
    baseTemplates,
  } = useEditorController();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <Topbar
        onResetSample={handleResetSample}
        onClear={handleClear}
        onImport={handleImport}
        onExport={handleExportJson}
        onExportMarkdown={handleExportMarkdown}
        onPrint={handlePrint}
        theme={theme}
        onToggleTheme={toggleTheme}
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
              编辑
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
              预览
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">编辑器</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                左侧编辑内容，右侧实时预览排版效果。
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
              onClick={handleToggleTemplatePanel}
              aria-expanded={templatePanelOpen}
            >
              {templatePanelOpen ? '收起模板' : '展开模板'}
            </button>
          </div>
          <div
            ref={editorScrollContainerRef}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"
          >
            {templatePanelOpen && (
              <div className="mb-4">
                <TemplateSelector
                  builtInTemplates={baseTemplates}
                  customTemplates={customTemplates}
                  activeId={activeTemplate.id}
                  onStyleChange={handleTemplateStyleChange}
                  onLoadSample={handleTemplateSampleLoad}
                  onSaveTemplate={handleSaveCustomTemplate}
                  onDeleteTemplate={handleDeleteCustomTemplate}
                  onUpdateTemplate={handleUpdateCustomTemplate}
                />
              </div>
            )}
            <ModulesPanel
              resume={resume}
              onChange={updateResume}
              onFieldFocus={handleFieldFocus}
              activeSections={activeSections}
              onSectionToggle={toggleSection}
              onSectionReorder={reorderSections}
              customSections={customSections}
              onAddCustomSection={addCustomSection}
              onRemoveCustomSection={removeCustomSection}
              modulePanelOpen={modulePanelOpen}
              onToggleModulePanel={toggleModulePanel}
              registerSectionRef={registerEditorSectionRef}
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">实时预览</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                模板：{activeTemplate.name}
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
              templateStyle={activeTemplate.previewStyle}
              accentColor={activeTemplate.accentColor}
              activeSections={deferredActiveSections}
              theme={activeTemplate.theme}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default EditorPage;
export { EditorPage };
