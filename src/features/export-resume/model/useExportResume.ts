import { useCallback } from 'react';

import { useResumeState } from '@/stores/resume.store';

import { downloadBlob, resumeToJson } from '../lib/json';
import { resumeToMarkdown } from '../lib/markdown';

type ExportOptions = {
  filename?: string;
};

const getDefaultFilename = () => `resume-${new Date().toISOString().slice(0, 10)}`;

export const useExportResume = (options: ExportOptions = {}) => {
  const { resume, activeSections } = useResumeState();
  const { filename = getDefaultFilename() } = options;

  const exportJson = useCallback(() => {
    const content = resumeToJson(resume);
    downloadBlob(content, 'application/json', `${filename}.json`);
  }, [resume, filename]);

  const exportMarkdown = useCallback(() => {
    const markdown = resumeToMarkdown(resume, { activeSections });
    downloadBlob(markdown, 'text/markdown', `${filename}.md`);
  }, [resume, activeSections, filename]);

  return { exportJson, exportMarkdown };
};
