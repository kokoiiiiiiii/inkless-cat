import { type ActiveSectionKey, createEmptyResume } from '@entities/resume';
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

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
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

  it('preserves an explicit empty active section list', () => {
    const workspace = { ...createDefaultWorkspace(), activeSections: [] };
    const result = migrateWorkspace(JSON.parse(workspaceToJson(workspace)) as unknown);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.activeSections).toEqual([]);
  });

  it('round-trips all resume and workspace state while preserving section order', () => {
    const base = createDefaultWorkspace();
    const resume = createEmptyResume();
    resume.personal.fullName = 'Round Trip User';
    resume.personal.summary = 'Summary text';
    resume.projects = [
      {
        id: 'project-1',
        name: 'Round Trip Project',
        role: 'Owner',
        summary: 'Project summary',
        link: 'https://example.com',
        highlights: ['Project highlight'],
      },
    ];
    resume.customSections = [
      {
        id: 'custom-round-trip',
        title: 'Custom module',
        mode: 'fields',
        items: [],
        fields: [{ id: 'field-1', label: 'Key', value: 'Value' }],
        text: '',
      },
    ];
    const template: ResumeTemplate = {
      ...customTemplate,
      sample: resume,
      localizedSamples: { en: resume },
    };
    const workspace = {
      ...base,
      resume,
      activeSections: ['custom:custom-round-trip', 'projects', 'socials'] as ActiveSectionKey[],
      theme: 'dark' as const,
      templateId: template.id,
      customTemplates: [template],
    };

    const result = migrateWorkspace(JSON.parse(workspaceToJson(workspace)) as unknown);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(canonicalize(result.value)).toEqual(canonicalize(workspace));
      expect(result.value.activeSections).toEqual(workspace.activeSections);
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
