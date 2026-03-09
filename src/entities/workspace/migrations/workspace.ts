import { type AppError, createAppError } from '@shared/lib/errors';
import { err, isErr, ok, type Result } from '@shared/lib/result';

import { normalizeResumeSchema } from '../../resume/lib/normalizers';
import { migrateResume } from '../../resume/migrations/resume';
import {
  type ActiveSectionKey,
  deriveSectionsFromResume,
  sanitizeSections,
} from '../../resume/selectors';
import { DEFAULT_TEMPLATE_ID } from '../../template/lib/templates';
import { migrateTemplates } from '../../template/migrations/template';
import {
  WORKSPACE_SCHEMA_VERSION,
  workspaceInputSchema,
  workspaceSchema,
} from '../schema/workspace';
import type { WorkspaceData } from '../types';

const buildWorkspace = (input: Omit<WorkspaceData, 'version'>): Result<WorkspaceData, AppError> => {
  const workspace: WorkspaceData = {
    version: WORKSPACE_SCHEMA_VERSION,
    ...input,
  };
  const validated = workspaceSchema.safeParse(workspace);

  if (!validated.success) {
    return err(
      createAppError('INVALID_WORKSPACE', 'Workspace normalization produced an invalid document.', {
        details: validated.error.flatten(),
      }),
    );
  }

  return ok(workspace);
};

export const migrateWorkspace = (input: unknown): Result<WorkspaceData, AppError> => {
  const parsed = workspaceInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      createAppError('INVALID_WORKSPACE', 'Workspace payload validation failed.', {
        details: parsed.error.flatten(),
      }),
    );
  }

  if (typeof parsed.data.version === 'number' && parsed.data.version > WORKSPACE_SCHEMA_VERSION) {
    return err(
      createAppError(
        'UNSUPPORTED_WORKSPACE_VERSION',
        `Workspace schema version ${parsed.data.version} is not supported.`,
      ),
    );
  }

  const resumeResult = migrateResume(parsed.data.resume);
  if (isErr(resumeResult)) {
    return err(
      createAppError('INVALID_WORKSPACE', 'Workspace resume payload is invalid.', {
        details: resumeResult.error,
      }),
    );
  }

  const customTemplatesResult = migrateTemplates(parsed.data.customTemplates);
  if (isErr(customTemplatesResult)) {
    return err(customTemplatesResult.error);
  }

  const normalizedResume = normalizeResumeSchema(resumeResult.value, { clone: true });
  const activeSections = sanitizeSections(
    parsed.data.activeSections as ActiveSectionKey[] | undefined,
    normalizedResume,
    { fallbackToDefaults: true },
  );

  return buildWorkspace({
    resume: normalizedResume,
    activeSections:
      activeSections.length > 0 ? activeSections : deriveSectionsFromResume(normalizedResume),
    theme: parsed.data.theme ?? 'light',
    templateId: parsed.data.templateId?.trim() || DEFAULT_TEMPLATE_ID,
    customTemplates: customTemplatesResult.value,
  });
};
