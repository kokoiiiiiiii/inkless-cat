import { resolveInitialLocale } from '@shared/i18n';

import { createSampleResume } from '../../resume/lib/factory';
import { deriveSectionsFromResume } from '../../resume/selectors';
import { DEFAULT_TEMPLATE_ID } from '../../template/lib/templates';
import { WORKSPACE_SCHEMA_VERSION } from '../schema/workspace';
import type { WorkspaceData } from '../types';

export const createDefaultWorkspace = (): WorkspaceData => {
  const resume = createSampleResume(resolveInitialLocale());

  return {
    version: WORKSPACE_SCHEMA_VERSION,
    resume,
    activeSections: deriveSectionsFromResume(resume),
    theme: 'light',
    templateId: DEFAULT_TEMPLATE_ID,
    customTemplates: [],
  };
};
