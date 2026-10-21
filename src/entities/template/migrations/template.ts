import { resolveInitialLocale } from '@shared/i18n/config';
import { type AppError, createAppError } from '@shared/lib/errors';
import { err, isErr, ok, type Result } from '@shared/lib/result';

import { migrateResume } from '../../resume/migrations/resume';
import { normalizeTemplateTheme } from '../lib/normalizers';
import { resumeTemplateInputSchema, resumeTemplateSchema } from '../schema/template';
import type { ResumeTemplate, ResumeTemplateInput } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const migrateTemplate = (input: unknown): Result<ResumeTemplate, AppError> => {
  const hasBlankName = isRecord(input) && typeof input.name === 'string' && !input.name.trim();
  const migrationInput = hasBlankName
    ? {
        ...input,
        name: resolveInitialLocale() === 'en' ? 'Unnamed template' : '未命名模板',
      }
    : input;
  const parsed = resumeTemplateInputSchema.safeParse(migrationInput);
  if (!parsed.success) {
    return err(
      createAppError('INVALID_WORKSPACE', 'Template payload validation failed.', {
        details: parsed.error.flatten(),
      }),
    );
  }

  const sampleResult = migrateResume(parsed.data.sample);
  if (isErr(sampleResult)) {
    return err(
      createAppError('INVALID_WORKSPACE', `Template "${parsed.data.id}" has an invalid sample.`, {
        details: sampleResult.error,
      }),
    );
  }

  const localizedSamples = parsed.data.localizedSamples;
  const normalizedLocalizedSamples: Partial<ResumeTemplate['localizedSamples']> = {};

  if (localizedSamples) {
    for (const [locale, value] of Object.entries(localizedSamples)) {
      const localizedResult = migrateResume(value);
      if (isErr(localizedResult)) {
        return err(
          createAppError(
            'INVALID_WORKSPACE',
            `Template "${parsed.data.id}" has an invalid localized sample.`,
            {
              details: localizedResult.error,
            },
          ),
        );
      }
      normalizedLocalizedSamples[locale as keyof typeof normalizedLocalizedSamples] =
        localizedResult.value;
    }
  }

  const normalized: ResumeTemplate = {
    id: parsed.data.id,
    name: parsed.data.name,
    description: parsed.data.description,
    accentColor: parsed.data.accentColor,
    previewStyle: parsed.data.previewStyle,
    theme: normalizeTemplateTheme(parsed.data.theme),
    sample: sampleResult.value,
    localizedSamples:
      Object.keys(normalizedLocalizedSamples).length > 0 ? normalizedLocalizedSamples : undefined,
  };

  const validated = resumeTemplateSchema.safeParse(normalized);
  if (!validated.success) {
    return err(
      createAppError('INVALID_WORKSPACE', `Template "${parsed.data.id}" is invalid.`, {
        details: validated.error.flatten(),
      }),
    );
  }

  return ok(validated.data);
};

export const migrateTemplates = (
  templates: ResumeTemplateInput[] | undefined,
): Result<ResumeTemplate[], AppError> => {
  if (!Array.isArray(templates) || templates.length === 0) {
    return ok([]);
  }

  const normalized: ResumeTemplate[] = [];
  for (const template of templates) {
    const templateResult = migrateTemplate(template);
    if (isErr(templateResult)) {
      return err(templateResult.error);
    }
    normalized.push(templateResult.value);
  }

  return ok(normalized);
};
