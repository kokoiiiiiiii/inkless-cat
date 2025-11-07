import type { ResumeTemplate, TemplateUpdatePayload } from '@entities/template';

export type TemplateSelectorProps = {
  builtInTemplates?: ResumeTemplate[];
  customTemplates?: ResumeTemplate[];
  activeId: string;
  onStyleChange: (template: ResumeTemplate) => void;
  onLoadSample: (template: ResumeTemplate) => void;
  onSaveTemplate?: (template: TemplateUpdatePayload) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: TemplateUpdatePayload) => void;
  onReady?: () => void;
};
