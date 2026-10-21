import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { ResumeTemplate, TemplateUpdatePayload } from '@entities/template';
import type {
  SectionReorderHandler,
  SectionToggleHandler,
  UseModulesPanelControllerResult,
} from '@features/modules-panel';
import { ModulesPanel } from '@widgets/modules-panel';
import { TemplateSelector } from '@widgets/template-selector';
import type { RefObject } from 'react';

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
}: EditorSidebarPaneProps) => (
  <section
    className={`flex min-h-0 flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-[0_35px_60px_-25px_rgba(15,23,42,0.75)] sm:p-6 print:hidden ${
      visible ? '' : 'hidden'
    } lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden`}
    aria-hidden={!visible && !isLargeScreen}
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-200 sm:w-auto"
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
        <div className="mb-4">
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
        </div>
      )}
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
  </section>
);
