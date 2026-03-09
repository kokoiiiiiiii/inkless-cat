import type { ActiveSectionKey } from '@entities/resume';
import { Topbar } from '@widgets/topbar';

import { useEditorPageController } from '../model/useEditorPageController';
import { EditorPreviewPane } from './EditorPreviewPane';
import { EditorSidebarPane } from './EditorSidebarPane';
import { MobileSwitcherBar } from './MobileSwitcherBar';

export const EditorPageShell = () => {
  const controller = useEditorPageController();
  const {
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
  } = controller;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <Topbar
        onResetSample={templatePanel.handleResetSample}
        onClear={ioActions.handleClear}
        onImport={ioActions.handleImport}
        onExport={ioActions.handleExportJson}
        onExportWorkspace={ioActions.handleExportWorkspaceJson}
        onExportMarkdown={ioActions.handleExportMarkdown}
        onPrint={ioActions.handlePrint}
        theme={panelState.theme}
        onToggleTheme={panelState.toggleTheme}
        onLocaleChange={templatePanel.handleLocaleChange}
      />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 pb-16 pt-4 sm:gap-6 sm:pt-6 lg:grid lg:grid-cols-2 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        {!isLargeScreen && (
          <MobileSwitcherBar
            showEditor={showEditor}
            showPreview={showPreview}
            onSelectEditor={() => setMobileView('editor')}
            onSelectPreview={() => setMobileView('preview')}
            editorLabel={t('editor.title')}
            previewLabel={t('preview.title')}
          />
        )}
        <EditorSidebarPane
          visible={showEditor}
          isLargeScreen={isLargeScreen}
          title={t('editor.title')}
          description={t('editor.desc')}
          toggleLabel={
            panelState.templatePanelOpen
              ? t('editor.templatePanel.collapse')
              : t('editor.templatePanel.expand')
          }
          templatePanelOpen={panelState.templatePanelOpen}
          onToggleTemplatePanel={panelState.handleToggleTemplatePanel}
          scrollRef={editorScrollContainerRef}
          resume={resume}
          controller={modulesPanelController}
          activeSections={activeSections}
          onSectionToggle={(sectionKey, enabled) =>
            toggleSection(sectionKey as ActiveSectionKey, enabled)
          }
          onSectionReorder={(order) => reorderSections(order as ActiveSectionKey[])}
          onAddCustomSection={addCustomSection}
          onRemoveCustomSection={removeCustomSection}
          modulePanelOpen={panelState.modulePanelOpen}
          onToggleModulePanel={panelState.toggleModulePanel}
          builtInTemplates={templatePanel.baseTemplates}
          customTemplates={templatePanel.customTemplates}
          activeTemplateId={templatePanel.activeTemplate.id}
          onTemplateStyleChange={templatePanel.handleTemplateStyleChange}
          onTemplateSampleLoad={templatePanel.handleTemplateSampleLoad}
          onSaveTemplate={templatePanel.handleSaveCustomTemplate}
          onDeleteTemplate={templatePanel.handleDeleteCustomTemplate}
          onUpdateTemplate={templatePanel.handleUpdateCustomTemplate}
        />
        <EditorPreviewPane
          visible={showPreview}
          isLargeScreen={isLargeScreen}
          title={t('preview.title')}
          description={t('preview.template', { name: templatePanel.activeTemplate.name })}
          scrollRef={previewScrollContainerRef}
          resume={deferredResume}
          activeSections={deferredActiveSections}
          registerSectionRef={registerPreviewRef}
          templateStyle={templatePanel.activeTemplate.previewStyle}
          accentColor={templatePanel.activeTemplate.accentColor}
          theme={templatePanel.activeTemplate.theme}
        />
      </main>
    </div>
  );
};
