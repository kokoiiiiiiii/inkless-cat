import { MAX_CUSTOM_TEMPLATES } from '@shared/lib/limits';
import { z } from 'zod';

import { sectionOrder } from '../../module/lib/sections';
import { resumeInputSchema, resumeSchema } from '../../resume/schema/resume';
import { resumeTemplateInputSchema, resumeTemplateSchema } from '../../template/schema/template';

export const WORKSPACE_SCHEMA_VERSION = 1 as const;

const standardSectionKeySchema = z.enum(sectionOrder);
const customSectionKeySchema = z
  .string()
  .max(132)
  .regex(/^custom:.+$/u);

export const activeSectionKeySchema = z.union([standardSectionKeySchema, customSectionKeySchema]);
export const themeModeSchema = z.enum(['light', 'dark']);

export const workspaceInputSchema = z
  .object({
    version: z.number().int().optional(),
    resume: resumeInputSchema,
    activeSections: z
      .array(activeSectionKeySchema)
      .max(sectionOrder.length + 50)
      .optional(),
    theme: themeModeSchema.optional(),
    templateId: z.string().optional(),
    customTemplates: z.array(resumeTemplateInputSchema).max(MAX_CUSTOM_TEMPLATES).optional(),
  })
  .strip();

export const workspaceSchema = z
  .object({
    version: z.literal(WORKSPACE_SCHEMA_VERSION),
    resume: resumeSchema,
    activeSections: z.array(activeSectionKeySchema).max(sectionOrder.length + 50),
    theme: themeModeSchema,
    templateId: z.string(),
    customTemplates: z.array(resumeTemplateSchema).max(MAX_CUSTOM_TEMPLATES),
  })
  .strip();
