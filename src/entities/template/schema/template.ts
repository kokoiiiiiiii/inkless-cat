import { DEFAULT_LOCALE, type Locale } from '@shared/i18n';
import { MAX_TEMPLATE_DESCRIPTION_LENGTH, MAX_TEMPLATE_NAME_LENGTH } from '@shared/lib/limits';
import { z } from 'zod';

import { resumeInputSchema, resumeSchema } from '../../resume/schema/resume';

const isHexColor = (value: string): boolean => {
  if (!value.startsWith('#') || (value.length !== 4 && value.length !== 7)) return false;
  for (const character of value.slice(1)) {
    const code = character.toLowerCase().codePointAt(0);
    if (code === undefined || !((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) {
      return false;
    }
  }
  return true;
};

const hexColorSchema = z.string().refine(isHexColor, 'Expected a hexadecimal color.');

export const templateThemeSchema = z
  .object({
    accent: hexColorSchema.optional(),
    background: hexColorSchema.optional(),
    heading: hexColorSchema.optional(),
    subheading: hexColorSchema.optional(),
    text: hexColorSchema.optional(),
    muted: hexColorSchema.optional(),
    cardBackground: hexColorSchema.optional(),
    cardBorder: hexColorSchema.optional(),
    divider: hexColorSchema.optional(),
  })
  .strip();

const localeKeys: [Locale, ...Locale[]] = [DEFAULT_LOCALE, 'en'];

const localizedResumeRecord = z.partialRecord(z.enum(localeKeys), resumeSchema);
const localizedResumeInputRecord = z.partialRecord(z.enum(localeKeys), resumeInputSchema);

export const resumeTemplateInputSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(MAX_TEMPLATE_NAME_LENGTH),
    description: z.string().max(MAX_TEMPLATE_DESCRIPTION_LENGTH).optional(),
    accentColor: hexColorSchema.optional(),
    previewStyle: z.string().max(40).optional(),
    theme: templateThemeSchema.optional(),
    sample: resumeInputSchema,
    localizedSamples: localizedResumeInputRecord.optional(),
  })
  .strip();

export const resumeTemplateSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(MAX_TEMPLATE_NAME_LENGTH),
    description: z.string().max(MAX_TEMPLATE_DESCRIPTION_LENGTH).optional(),
    accentColor: hexColorSchema.optional(),
    previewStyle: z.string().max(40).optional(),
    theme: templateThemeSchema.optional(),
    sample: resumeSchema,
    localizedSamples: localizedResumeRecord.optional(),
  })
  .strip();
