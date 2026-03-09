import { deriveSectionsFromResume, migrateResume, useResumeActions } from '@entities/resume';
import { useUIActions } from '@entities/ui';
import { migrateWorkspace } from '@entities/workspace';
import { type AppError, createAppError } from '@shared/lib/errors';
import { err, isErr, ok, type Result } from '@shared/lib/result';
import { useCallback } from 'react';

type ImportedDocument =
  | {
      kind: 'resume';
    }
  | {
      kind: 'workspace';
    };

type ImportResult = Result<ImportedDocument, AppError>;

const isWorkspacePayload = (value: unknown): value is { resume: unknown } =>
  Boolean(value && typeof value === 'object' && 'resume' in value);

export const useImportResume = () => {
  const { replaceState } = useResumeActions();
  const { setTheme, setTemplateId, setCustomTemplates, resetPanels, setMobileView } =
    useUIActions();

  const importFromObject = useCallback(
    (payload: unknown): ImportResult => {
      if (isWorkspacePayload(payload)) {
        const workspaceResult = migrateWorkspace(payload);
        if (isErr(workspaceResult)) {
          return err(workspaceResult.error);
        }

        replaceState(workspaceResult.value.resume, workspaceResult.value.activeSections);
        setTheme(workspaceResult.value.theme);
        setCustomTemplates(workspaceResult.value.customTemplates);
        setTemplateId(workspaceResult.value.templateId);
        resetPanels();
        setMobileView('editor');
        return ok({ kind: 'workspace' });
      }

      const resumeResult = migrateResume(payload);
      if (isErr(resumeResult)) {
        return err(resumeResult.error);
      }

      replaceState(resumeResult.value, deriveSectionsFromResume(resumeResult.value));
      return ok({ kind: 'resume' });
    },
    [replaceState, resetPanels, setCustomTemplates, setMobileView, setTemplateId, setTheme],
  );

  const importFromJson = useCallback(
    (content: string): ImportResult => {
      try {
        const data = JSON.parse(content) as unknown;
        return importFromObject(data);
      } catch (error) {
        return err(
          createAppError('INVALID_JSON', 'Failed to parse imported JSON.', {
            cause: error,
          }),
        );
      }
    },
    [importFromObject],
  );

  return { importFromObject, importFromJson };
};
