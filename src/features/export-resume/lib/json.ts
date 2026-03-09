import { normalizeResumeSchema, type ResumeData } from '@entities/resume';
import { type AppError, createAppError } from '@shared/lib/errors';
import { err, ok, type Result } from '@shared/lib/result';

export const resumeToJson = (resume: ResumeData): string =>
  JSON.stringify(normalizeResumeSchema(resume, { clone: true }), undefined, 2);

export const downloadBlob = (
  content: string,
  type: string,
  filename: string,
): Result<void, AppError> => {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return ok(void 0);
  } catch (error) {
    return err(
      createAppError('EXPORT_FAILED', `Failed to download "${filename}".`, {
        cause: error,
      }),
    );
  }
};
