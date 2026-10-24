import type { ActiveSectionKey } from '@entities/resume';
import { Topbar } from '@widgets/topbar';
import { GlassSurface, StudioIcon } from '@shared/ui/studio';
import { type FocusEvent, useEffect, useState } from 'react';

import type { UseEditorPageControllerResult } from '../model/useEditorPageController';
import { EditorPreviewPane } from './EditorPreviewPane';
import { EditorSidebarPane } from './EditorSidebarPane';
import { MobileSwitcherBar } from './MobileSwitcherBar';
import './production-studio-shell.css';

type StudioDestination = 'editor' | 'modules' | 'templates' | 'preview';

type ProductionStudioShellProps = {
  controller: UseEditorPageControllerResult;
};

const focusElement = (id: string) => {
  requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(`#${id}`);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
};

export const ProductionStudioShell = ({ controller }: ProductionStudioShellProps) => {
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
  const [textEntryFocused, setTextEntryFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      setKeyboardOpen(textEntryFocused && window.innerHeight - viewport.height > 120);
    };

    viewport.addEventListener('resize', updateKeyboardState);
    window.addEventListener('resize', updateKeyboardState);
    updateKeyboardState();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      window.removeEventListener('resize', updateKeyboardState);
    };
  }, [textEntryFocused]);

  const handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    setTextEntryFocused(
      target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement,
    );
  };

  const selectDestination = (destination: StudioDestination) => {
    if (destination === 'preview') {
      if (isLargeScreen) {
        previewScrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        focusElement('production-preview-pane');
      } else {
        setMobileView('preview');
      }
      return;
    }

    if (!isLargeScreen) setMobileView('editor');

    if (destination === 'modules' && !panelState.modulePanelOpen) {
      panelState.toggleModulePanel();
    }
    if (destination === 'templates' && !panelState.templatePanelOpen) {
      panelState.handleToggleTemplatePanel();
    }

    editorScrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    focusElement(
      destination === 'modules'
        ? 'production-modules-panel'
        : destination === 'templates'
          ? 'production-template-panel'
          : 'production-editor-pane',
    );
  };

  return (
    <div
      className="studio-root production-studio-root"
      data-keyboard-open={keyboardOpen ? 'true' : 'false'}
      data-theme={panelState.theme}
      onFocusCapture={handleFocusCapture}
    >
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
      <div className="production-studio-layout">
        <GlassSurface
          aria-label={t('editor.studioNavigation.title')}
          as="aside"
          className="production-studio-sidebar"
        >
          <div className="production-studio-sidebar__heading">
            <span>{t('editor.studioNavigation.title')}</span>
          </div>
          <nav aria-label={t('editor.studioNavigation.label')} className="production-studio-nav">
            <button onClick={() => selectDestination('editor')} type="button">
              <StudioIcon name="file" />
              <span>{t('editor.studioNavigation.editor')}</span>
            </button>
            <button
              aria-controls="production-modules-panel"
              aria-expanded={panelState.modulePanelOpen}
              onClick={() => selectDestination('modules')}
              type="button"
            >
              <StudioIcon name="layers" />
              <span>{t('editor.studioNavigation.modules')}</span>
            </button>
            <button
              aria-controls="production-template-panel"
              aria-expanded={panelState.templatePanelOpen}
              onClick={() => selectDestination('templates')}
              type="button"
            >
              <StudioIcon name="palette" />
              <span>{t('editor.studioNavigation.templates')}</span>
            </button>
            <button onClick={() => selectDestination('preview')} type="button">
              <StudioIcon name="eye" />
              <span>{t('editor.studioNavigation.preview')}</span>
            </button>
          </nav>
        </GlassSurface>
        <main className="production-studio-main">
          {!isLargeScreen && (
            <MobileSwitcherBar
              showEditor={showEditor}
              showPreview={showPreview}
              onSelectEditor={() => setMobileView('editor')}
              onSelectPreview={() => setMobileView('preview')}
              editorLabel={t('editor.title')}
              previewLabel={t('preview.title')}
              navigationLabel={t('editor.studioNavigation.mobile')}
            />
          )}
          <div
            className="production-studio-workspace"
            data-mobile-view={showEditor && showPreview ? 'split' : showEditor ? 'editor' : 'preview'}
          >
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
          </div>
        </main>
      </div>
    </div>
  );
};
