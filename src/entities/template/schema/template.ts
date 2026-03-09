import { DEFAULT_LOCALE, type Locale } from '@shared/i18n';
import { z } from 'zod';

import { resumeInputSchema, resumeSchema } from '../../resume/schema/resume';

export const templateThemeSchema = z
  .object({
    accent: z.string().optional(),
    background: z.string().optional(),
    heading: z.string().optional(),
    subheading: z.string().optional(),
    text: z.string().optional(),
    muted: z.string().optional(),
    cardBackground: z.string().optional(),
    cardBorder: z.string().optional(),
    divider: z.string().optional(),
  })
  .strip();

const localeKeys: [Locale, ...Locale[]] = [DEFAULT_LOCALE, 'en'];

const localizedResumeRecord = z.partialRecord(z.enum(localeKeys), resumeSchema);
const localizedResumeInputRecord = z.partialRecord(z.enum(localeKeys), resumeInputSchema);

export const resumeTemplateInputSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    accentColor: z.string().optional(),
    previewStyle: z.string().optional(),
    theme: templateThemeSchema.optional(),
    sample: resumeInputSchema,
    localizedSamples: localizedResumeInputRecord.optional(),
  })
  .strip();

export const resumeTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    accentColor: z.string().optional(),
    previewStyle: z.string().optional(),
    theme: templateThemeSchema.optional(),
    sample: resumeSchema,
    localizedSamples: localizedResumeRecord.optional(),
  })
  .strip();
