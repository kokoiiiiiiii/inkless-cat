import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import type { z } from 'zod';

import type { ThemeMode } from '../ui/model/types';
import type { workspaceInputSchema } from './schema/workspace';

export type WorkspaceData = {
  version: number;
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  theme: ThemeMode;
  templateId: string;
  customTemplates: ResumeTemplate[];
};

export type WorkspaceInputData = z.infer<typeof workspaceInputSchema>;

export type WorkspaceSlice = {
  version: WorkspaceData['version'];
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  theme: ThemeMode;
  templateId: string;
  customTemplates: ResumeTemplate[];
};
