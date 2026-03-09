import { type AppError, createAppError } from '@shared/lib/errors';
import { err, ok, type Result } from '@shared/lib/result';

import { normalizeResumeInput } from '../lib/normalizers';
import { RESUME_SCHEMA_VERSION, resumeInputSchema, resumeSchema } from '../schema/resume';
import type { ResumeData } from '../types';

export const migrateResume = (input: unknown): Result<ResumeData, AppError> => {
  const parsed = resumeInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      createAppError('INVALID_RESUME', 'Resume payload validation failed.', {
        details: parsed.error.flatten(),
      }),
    );
  }

  const { schemaVersion } = parsed.data;
  if (typeof schemaVersion === 'number' && schemaVersion > RESUME_SCHEMA_VERSION) {
    return err(
      createAppError(
        'UNSUPPORTED_RESUME_VERSION',
        `Resume schema version ${schemaVersion} is not supported.`,
      ),
    );
  }

  const normalized = normalizeResumeInput(parsed.data, { clone: true });
  const validated = resumeSchema.safeParse(normalized);

  if (!validated.success) {
    return err(
      createAppError('INVALID_RESUME', 'Resume normalization produced an invalid document.', {
        details: validated.error.flatten(),
      }),
    );
  }

  return ok(validated.data);
};
