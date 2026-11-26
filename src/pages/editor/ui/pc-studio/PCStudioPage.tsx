import './pc-studio.css';

import type { ActiveSectionKey } from '@entities/resume';
import { useUISelector } from '@entities/ui';
import { useMediaQuery } from '@shared/hooks';
import { useI18n } from '@shared/i18n';
import { FocusedModulesPanel } from '@widgets/modules-panel';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useLocalSaveStatus } from '../../model/pc-studio/useLocalSaveStatus';
import { usePCStudioController } from '../../model/pc-studio/usePCStudioController';
import { useEditorPageController } from '../../model/useEditorPageController';
import AIWorkspaceDock from './AIWorkspaceDock';
import ResumePreviewPane from './ResumePreviewPane';
import StudioHeader from './StudioHeader';
import TemplateCenterDialog from './TemplateCenterDialog';
import TemplateCenterPage from './TemplateCenterPage';
import WorkspaceSidebar from './WorkspaceSidebar';

const PCStudioPage = () => {
  const editor = useEditorPageController();
  const studio = usePCStudioController(editor);
  const saveStatus = useLocalSaveStatus();
  const { t } = useI18n();
  const isCompact = useMediaQuery('(max-width: 1199px)');
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const templateManagerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [templateCenterOpen, setTemplateCenterOpen] = useState(false);
  const [personalMoreOpen, setPersonalMoreOpen] = useState(false);
  const wasTemplateCenterOpenRef = useRef(false);
  const currentTemplateId = useUISelector((state) => state.templateId);
  const setTemplateManagerOpen = studio.setTemplateOpen;
  const resumeName = studio.resume.personal.fullName?.trim() || t('modules.personal.title');
  const registeredTemplates = [
    ...studio.templatePanel.baseTemplates,
    ...studio.templatePanel.customTemplates,
  ];
  const currentTemplate = registeredTemplates.find((template) => template.id === currentTemplateId);
  const currentTemplateName = currentTemplate?.name ?? t('template.gallery.missingTemplate');
  const moduleLabel = studio.moduleTitle(studio.activeModule);
  const showSidebar = !studio.previewFocus;
  const showEditor = !studio.previewFocus && (!isCompact || studio.compactMode === 'edit');
  const showPreview =
    studio.previewFocus || (!studio.aiOpen && (!isCompact || studio.compactMode === 'preview'));

  const handleTogglePreview = useCallback(() => {
    if (studio.previewFocus) {
      studio.exitPreviewFocus();
      return;
    }
    if (isCompact) {
      if (studio.compactMode === 'preview' && !studio.aiOpen) {
        studio.setCompactMode('edit');
        return;
      }
      studio.closeAI();
      studio.enterCompactPreview();
      return;
    }
    studio.enterPreviewFocus();
  }, [isCompact, studio]);

  const handleToggleAI = useCallback(() => {
    if (studio.aiOpen) {
      studio.closeAI();
    } else {
      studio.openAI();
    }
  }, [studio]);

  const handleReturnToPreview = useCallback(() => {
    studio.closeAI(true);
    studio.exitPreviewFocus();
  }, [studio]);

  const handleBackToWorkspace = useCallback(() => {
    setTemplateCenterOpen(false);
    setTemplateManagerOpen(false);
  }, [setTemplateManagerOpen]);

  const handleCloseTemplateManager = useCallback(
    () => setTemplateManagerOpen(false),
    [setTemplateManagerOpen],
  );

  const handleOpenTemplateManager = useCallback(
    (trigger: HTMLButtonElement) => {
      templateManagerTriggerRef.current = trigger;
      setTemplateManagerOpen(true);
    },
    [setTemplateManagerOpen],
  );

  useLayoutEffect(() => {
    if (wasTemplateCenterOpenRef.current && !templateCenterOpen) {
      templateTriggerRef.current?.focus({ preventScroll: true });
    }
    wasTemplateCenterOpenRef.current = templateCenterOpen;
  }, [templateCenterOpen]);

  const handleSectionToggle = useCallback(
    (key: string, included: boolean) => {
      studio.toggleSection(key as ActiveSectionKey, included);
    },
    [studio],
  );

  return (
    <div className="pc-studio" data-testid="pc-studio">
      <StudioHeader
        saveStatus={saveStatus}
        resumeName={resumeName}
        templateName={currentTemplateName}
        aiOpen={studio.aiOpen}
        previewActive={studio.previewFocus || (isCompact && studio.compactMode === 'preview')}
        templateCenterOpen={templateCenterOpen}
        theme={studio.panelState.theme}
        templateButtonRef={templateTriggerRef}
        onOpenTemplates={() => setTemplateCenterOpen(true)}
        onToggleAI={handleToggleAI}
        onTogglePreview={handleTogglePreview}
        onToggleTheme={studio.panelState.toggleTheme}
        onExportJson={studio.ioActions.handleExportJson}
        onExportWorkspaceJson={studio.ioActions.handleExportWorkspaceJson}
        onExportMarkdown={studio.ioActions.handleExportMarkdown}
        onPrint={studio.ioActions.handlePrint}
        onExit={() => {
          globalThis.location.assign('/');
        }}
      />

      <main
        className="pc-workspace-grid"
        hidden={templateCenterOpen}
        data-compact={isCompact}
        data-ai-open={studio.aiOpen}
        data-preview-focus={studio.previewFocus}
        data-compact-mode={studio.compactMode}
      >
        {showSidebar && (
          <WorkspaceSidebar
            modules={studio.modules}
            selectedModule={studio.activeModule}
            activeSections={studio.activeSections}
            saveStatus={saveStatus}
            resumeName={resumeName}
            onSelect={studio.selectModule}
            onToggleSection={handleSectionToggle}
          />
        )}

        {showEditor && (
          <section
            className="pc-editor-stage"
            aria-label={t('editor.pcStudio.editModule')}
            data-testid="pc-editor-stage"
            onBlurCapture={studio.captureEditorSelection}
            onSelectCapture={studio.captureEditorSelection}
            onKeyUpCapture={studio.captureEditorSelection}
            onMouseUpCapture={studio.captureEditorSelection}
          >
            <div className="pc-editor-scroll" ref={studio.editorScrollContainerRef}>
              <div className="pc-focused-module" data-module={studio.activeModule}>
                <FocusedModulesPanel
                  selectedKey={studio.activeModule}
                  resume={studio.resume}
                  controller={studio.modulesController}
                  personalPresentation="pc-studio"
                  personalMoreOpen={personalMoreOpen}
                  onPersonalMoreOpenChange={setPersonalMoreOpen}
                />
              </div>
            </div>
          </section>
        )}

        {showPreview && (
          <ResumePreviewPane
            visible
            resume={studio.resume}
            activeSections={studio.activeSections}
            registerSectionRef={studio.registerPreviewRef}
            templateStyle={studio.templatePanel.activeTemplate.previewStyle}
            accentColor={studio.templatePanel.activeTemplate.accentColor}
            theme={studio.templatePanel.activeTemplate.theme}
            title={studio.templatePanel.activeTemplate.name}
            onFocusPreview={studio.previewFocus ? undefined : () => studio.enterPreviewFocus()}
            onReturnToEdit={studio.previewFocus ? studio.exitPreviewFocus : undefined}
          />
        )}

        {studio.aiOpen && (
          <AIWorkspaceDock
            moduleKey={studio.activeModule}
            moduleLabel={moduleLabel}
            fieldContext={studio.fieldContext}
            onClose={() => studio.closeAI()}
            onReturnToPreview={handleReturnToPreview}
          />
        )}
      </main>

      {templateCenterOpen && (
        <TemplateCenterPage
          builtInTemplates={studio.templatePanel.baseTemplates}
          customTemplates={studio.templatePanel.customTemplates}
          resume={studio.resume}
          activeSections={studio.activeSections}
          currentTemplateId={currentTemplateId}
          displayedFallbackTemplateName={studio.templatePanel.activeTemplate.name}
          onBackToWorkspace={handleBackToWorkspace}
          onManageTemplates={handleOpenTemplateManager}
        />
      )}

      <TemplateCenterDialog
        open={studio.templateOpen}
        triggerRef={templateManagerTriggerRef}
        builtInTemplates={studio.templatePanel.baseTemplates}
        customTemplates={studio.templatePanel.customTemplates}
        activeTemplateId={currentTemplateId}
        onClose={handleCloseTemplateManager}
        onStyleChange={(template) => {
          studio.templatePanel.handleTemplateStyleChange(template);
          studio.setTemplateOpen(false);
        }}
        onLoadSample={studio.templatePanel.handleTemplateSampleLoad}
        onSaveTemplate={studio.templatePanel.handleSaveCustomTemplate}
        onDeleteTemplate={studio.templatePanel.handleDeleteCustomTemplate}
        onUpdateTemplate={studio.templatePanel.handleUpdateCustomTemplate}
      />
    </div>
  );
};

export default PCStudioPage;
