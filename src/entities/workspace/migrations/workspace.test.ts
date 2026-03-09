import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { workspaceToJson } from '@features/export-resume';
import { isErr } from '@shared/lib/result';
import { describe, expect, it } from 'vitest';

import { createDefaultWorkspace } from '../model/defaults';
import { migrateWorkspace } from './workspace';

const customTemplate: ResumeTemplate = {
  id: 'custom-template',
  name: 'Custom Template',
  previewStyle: 'custom',
  accentColor: '#111827',
  sample: createEmptyResume(),
};

describe('migrateWorkspace', () => {
  it('round-trips a workspace export', () => {
    const base = createDefaultWorkspace();
    const workspace = {
      ...base,
      theme: 'dark' as const,
      templateId: customTemplate.id,
      customTemplates: [customTemplate],
    };

    const result = migrateWorkspace(JSON.parse(workspaceToJson(workspace)) as unknown);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.theme).toBe('dark');
      expect(result.value.templateId).toBe(customTemplate.id);
      expect(result.value.customTemplates[0]?.name).toBe(customTemplate.name);
      expect(result.value.resume.schemaVersion).toBe(base.resume.schemaVersion);
    }
  });

  it('rejects invalid workspace payloads', () => {
    const result = migrateWorkspace({
      version: 1,
      theme: 'dark',
      templateId: 'modern-blue',
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_WORKSPACE');
    }
  });
});
