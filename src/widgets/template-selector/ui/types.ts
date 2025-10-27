import type { ResumeTemplate } from '@entities/template';

export type TemplateUpdatePayload = Partial<Omit<ResumeTemplate, 'sample'>> & {
  sample?: ResumeTemplate | '__CURRENT__';
};

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
