import type { ResumeInputData } from '@entities/resume';
import type { z } from 'zod';

import type {
  resumeTemplateInputSchema,
  resumeTemplateSchema,
  templateThemeSchema,
} from './schema/template';

export type TemplateTheme = z.infer<typeof templateThemeSchema>;
export type ResumeTemplate = z.infer<typeof resumeTemplateSchema>;
export type ResumeTemplateInput = z.infer<typeof resumeTemplateInputSchema>;

export type TemplateUpdatePayload = Partial<Omit<ResumeTemplate, 'sample'>> & {
  sample?: ResumeInputData | '__CURRENT__';
};
