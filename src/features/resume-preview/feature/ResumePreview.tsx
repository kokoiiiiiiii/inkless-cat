import type { ResumeData } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import { memo } from 'react';

import { type RegisterSectionRef, useResumePreviewState } from '../model/useResumePreviewState';
import { ResumePreviewView } from '../ui/ResumePreviewView';

export type ResumePreviewProps = {
  resume: ResumeData;
  registerSectionRef?: RegisterSectionRef;
  templateStyle?: string;
  accentColor?: string;
  activeSections?: string[];
  theme?: TemplateTheme;
};

const ResumePreviewComponent = ({ registerSectionRef, ...stateInput }: ResumePreviewProps) => {
  const state = useResumePreviewState({
    ...stateInput,
    registerSectionRef,
  });

  return <ResumePreviewView state={state} registerSectionRef={registerSectionRef} />;
};

const arePropsEqual = (prev: ResumePreviewProps, next: ResumePreviewProps): boolean =>
  prev.resume === next.resume &&
  prev.templateStyle === next.templateStyle &&
  prev.accentColor === next.accentColor &&
  prev.activeSections === next.activeSections &&
  prev.theme === next.theme &&
  prev.registerSectionRef === next.registerSectionRef;

export const ResumePreview = memo(ResumePreviewComponent, arePropsEqual);
export default ResumePreview;
