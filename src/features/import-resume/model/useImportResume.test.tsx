import { createEmptyResume, useResumeStore } from '@entities/resume';
import { DEFAULT_TEMPLATE_ID, type ResumeTemplate } from '@entities/template';
import { useUIStore } from '@entities/ui';
import { createDefaultWorkspace, type WorkspaceData } from '@entities/workspace';
import { RESUME_STORE_PERSIST_KEY, UI_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImportResume } from './useImportResume';

const setupStores = () => {
  const resume = createEmptyResume();
  resume.personal.fullName = 'Existing resume';
  useResumeStore.getState().replaceState(resume, ['projects']);
  useUIStore.getState().setTheme('light');
  useUIStore.getState().setTemplateId(DEFAULT_TEMPLATE_ID);
  useUIStore.getState().setCustomTemplates([]);
};

const createWorkspace = (): WorkspaceData => {
  const workspace = createDefaultWorkspace();
  workspace.resume.personal.fullName = 'Imported resume';
  workspace.resume.personal.summary = 'Imported summary';
  workspace.activeSections = [];
  workspace.theme = 'dark';
  workspace.templateId = 'custom-imported';
  const template: ResumeTemplate = {
    id: 'custom-imported',
    name: 'Imported template',
    sample: workspace.resume,
  };
  workspace.customTemplates = [template];
  return workspace;
};

describe('workspace import transaction', () => {
  beforeEach(() => {
    localStorage.clear();
    setupStores();
  });

  it('validates the full workspace before replacing either store', () => {
    const { result } = renderHook(() => useImportResume());
    const prepared = result.current.prepareImportFromObject(createWorkspace());

    expect(prepared.ok).toBe(true);
    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');
    expect(useUIStore.getState().theme).toBe('light');

    if (prepared.ok) {
      act(() => {
        result.current.commitPreparedImport(prepared.value);
      });
    }

    expect(useResumeStore.getState().resume.personal.fullName).toBe('Imported resume');
    expect(useResumeStore.getState().activeSections).toEqual([]);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().templateId).toBe('custom-imported');
    expect(useUIStore.getState().customTemplates[0]?.name).toBe('Imported template');
  });

  it('restores the prior in-memory state if a commit action throws', () => {
    const { result } = renderHook(() => useImportResume());
    const prepared = result.current.prepareImportFromObject(createWorkspace());
    const setTheme = vi.spyOn(useUIStore.getState(), 'setTheme').mockImplementation(() => {
      throw new Error('simulated commit failure');
    });

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      let outcome: ReturnType<typeof result.current.commitPreparedImport> | undefined;
      act(() => {
        outcome = result.current.commitPreparedImport(prepared.value);
      });

      expect(outcome?.ok).toBe(false);
    }

    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');
    expect(useResumeStore.getState().activeSections).toEqual(['projects']);
    expect(useUIStore.getState().theme).toBe('light');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toContain('Existing resume');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).not.toContain('Imported resume');
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toContain('"theme":"light"');
    setTheme.mockRestore();
  });

  it('rolls back both stores and persisted keys when only the UI store write fails', () => {
    const before = {
      resume: localStorage.getItem(RESUME_STORE_PERSIST_KEY),
      ui: localStorage.getItem(UI_STORE_PERSIST_KEY),
    };
    const { result } = renderHook(() => useImportResume());
    const prepared = result.current.prepareImportFromObject(createWorkspace());
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === UI_STORE_PERSIST_KEY && value.includes('custom-imported')) {
        throw new DOMException('simulated UI store quota failure', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    });

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      let outcome: ReturnType<typeof result.current.commitPreparedImport> | undefined;
      act(() => {
        outcome = result.current.commitPreparedImport(prepared.value);
      });
      expect(outcome?.ok).toBe(false);
    }

    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');
    expect(useResumeStore.getState().activeSections).toEqual(['projects']);
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().templateId).toBe(DEFAULT_TEMPLATE_ID);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(before.resume);
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBe(before.ui);
  });

  it('rejects a workspace with any invalid custom template before changing either store', () => {
    const { result } = renderHook(() => useImportResume());
    const workspace = createWorkspace();
    const payload: unknown = {
      ...workspace,
      customTemplates: [
        ...workspace.customTemplates,
        { id: 'broken', name: 'Broken', sample: null },
      ],
    };

    const prepared = result.current.prepareImportFromObject(payload);

    expect(prepared.ok).toBe(false);
    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');
    expect(useUIStore.getState().theme).toBe('light');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toContain('Existing resume');
  });
});
