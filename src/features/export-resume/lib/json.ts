import type { ResumeData } from '@entities/resume';

export const resumeToJson = (resume: ResumeData): string =>
  JSON.stringify(resume, undefined, 2);

export const downloadBlob = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
