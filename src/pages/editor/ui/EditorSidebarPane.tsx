import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { ResumeTemplate, TemplateUpdatePayload } from '@entities/template';
import type {
  SectionReorderHandler,
  SectionToggleHandler,
  UseModulesPanelControllerResult,
} from '@features/modules-panel';
import { useI18n } from '@shared/i18n';
import { LazyChunkBoundary } from '@shared/ui/LazyChunkBoundary';
import { ModulesPanel } from '@widgets/modules-panel';
import type { RefObject } from 'react';
import { lazy, Suspense } from 'react';

const TemplateSelector = lazy(() => import('@widgets/template-selector/ui/TemplateSelector'));

type EditorSidebarPaneProps = {
  visible: boolean;
  isLargeScreen: boolean;
  title: string;
  description: string;
  toggleLabel: string;
  templatePanelOpen: boolean;
  onToggleTemplatePanel: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  resume: ResumeData;
  controller: UseModulesPanelControllerResult;
  activeSections: ActiveSectionKey[];
  onSectionToggle: SectionToggleHandler;
  onSectionReorder: SectionReorderHandler;
  onAddCustomSection: () => void;
  onRemoveCustomSection: (sectionId: string) => void;
  modulePanelOpen: boolean;
  onToggleModulePanel: () => void;
  builtInTemplates: ResumeTemplate[];
  customTemplates: ResumeTemplate[];
  activeTemplateId: string;
  onTemplateStyleChange: (template: ResumeTemplate) => void;
  onTemplateSampleLoad: (template: ResumeTemplate) => void;
  onSaveTemplate: (payload: TemplateUpdatePayload) => void;
  onDeleteTemplate: (templateId: string) => void;
  onUpdateTemplate: (templateId: string, updates: TemplateUpdatePayload) => void;
};

export const EditorSidebarPane = ({
  visible,
  isLargeScreen,
  title,
  description,
  toggleLabel,
  templatePanelOpen,
  onToggleTemplatePanel,
  scrollRef,
  resume,
  controller,
  activeSections,
  onSectionToggle,
  onSectionReorder,
  onAddCustomSection,
  onRemoveCustomSection,
  modulePanelOpen,
  onToggleModulePanel,
  builtInTemplates,
  customTemplates,
  activeTemplateId,
  onTemplateStyleChange,
  onTemplateSampleLoad,
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
}: EditorSidebarPaneProps) => {
  const { t } = useI18n();

  return (
    <section
      id="production-editor-pane"
      tabIndex={-1}
      aria-labelledby="production-editor-heading"
      className={`studio-glass production-editor-pane flex min-h-0 flex-col gap-4 rounded-3xl p-4 sm:p-6 print:hidden ${
        visible ? '' : 'hidden'
      } lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden`}
      aria-hidden={!visible && !isLargeScreen}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-lg font-semibold text-slate-900 dark:text-white"
            id="production-editor-heading"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
          onClick={onToggleTemplatePanel}
          aria-expanded={templatePanelOpen}
        >
          {toggleLabel}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-2 lg:overscroll-contain"
      >
        {templatePanelOpen && (
          <div className="mb-4" id="production-template-panel" tabIndex={-1}>
            <LazyChunkBoundary
              renderError={(reload) => (
                <div
                  className="rounded-xl border border-rose-300 p-4 text-sm text-slate-900 dark:border-rose-800 dark:text-slate-100"
                  role="alert"
                >
                  <p>{t('common.featureFailedLoad')}</p>
                  <button className="mt-2 font-semibold underline" type="button" onClick={reload}>
                    {t('common.reloadPage')}
                  </button>
                </div>
              )}
            >
              <Suspense
                fallback={
                  <div
                    aria-live="polite"
                    className="min-h-32 rounded-xl bg-slate-100/70 p-4 text-sm text-slate-500 dark:bg-slate-800/70 dark:text-slate-300"
                    role="status"
                  >
                    {t('common.loadingFeature')}
                  </div>
                }
              >
                <TemplateSelector
                  builtInTemplates={builtInTemplates}
                  customTemplates={customTemplates}
                  activeId={activeTemplateId}
                  onStyleChange={onTemplateStyleChange}
                  onLoadSample={onTemplateSampleLoad}
                  onSaveTemplate={onSaveTemplate}
                  onDeleteTemplate={onDeleteTemplate}
                  onUpdateTemplate={onUpdateTemplate}
                />
              </Suspense>
            </LazyChunkBoundary>
          </div>
        )}
        <div id="production-modules-panel" tabIndex={-1}>
          <ModulesPanel
            resume={resume}
            controller={controller}
            activeSections={activeSections}
            onSectionToggle={onSectionToggle}
            onSectionReorder={onSectionReorder}
            onAddCustomSection={onAddCustomSection}
            onRemoveCustomSection={onRemoveCustomSection}
            modulePanelOpen={modulePanelOpen}
            onToggleModulePanel={onToggleModulePanel}
          />
        </div>
      </div>
    </section>
  );
};
