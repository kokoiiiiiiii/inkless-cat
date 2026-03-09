import { useResumeState } from '@entities/resume';
import { useUIState } from '@entities/ui';
import { WORKSPACE_SCHEMA_VERSION } from '@entities/workspace';
import { useI18n } from '@shared/i18n';
import { useCallback } from 'react';

import { downloadBlob, resumeToJson } from '../lib/json';
import { resumeToMarkdown } from '../lib/markdown';
import { workspaceToJson } from '../lib/workspace';

type ExportOptions = {
  filename?: string;
};

const getDefaultFilename = () => `resume-${new Date().toISOString().slice(0, 10)}`;

export const useExportResume = (options: ExportOptions = {}) => {
  const { resume, activeSections } = useResumeState();
  const { theme, templateId, customTemplates } = useUIState();
  const { t } = useI18n();
  const { filename = getDefaultFilename() } = options;

  const exportJson = useCallback(() => {
    const content = resumeToJson(resume);
    return downloadBlob(content, 'application/json', `${filename}.resume.json`);
  }, [resume, filename]);

  const exportWorkspaceJson = useCallback(() => {
    const content = workspaceToJson({
      version: WORKSPACE_SCHEMA_VERSION,
      resume,
      activeSections,
      theme,
      templateId,
      customTemplates,
    });
    return downloadBlob(content, 'application/json', `${filename}.workspace.json`);
  }, [activeSections, customTemplates, filename, resume, templateId, theme]);

  const exportMarkdown = useCallback(() => {
    const markdown = resumeToMarkdown(resume, { activeSections, t });
    return downloadBlob(markdown, 'text/markdown', `${filename}.md`);
  }, [resume, activeSections, filename, t]);

  return { exportJson, exportWorkspaceJson, exportMarkdown };
};
