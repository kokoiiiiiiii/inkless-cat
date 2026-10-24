import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { UI_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUIStore } from './ui.store';

const resetUIStoreState = () => {
  useUIStore.setState({
    theme: 'light',
    templateId: '',
    customTemplates: [],
    templatePanelOpen: false,
    modulePanelOpen: false,
    mobileView: 'editor',
  });
  useUIStore.persist?.clearStorage();
};

const mockTemplate: ResumeTemplate = {
  id: 'custom-1',
  name: 'Custom Template',
  description: 'Test template',
  previewStyle: 'modern',
  accentColor: '#2563eb',
  sample: createEmptyResume(),
};

describe('ui store', () => {
  beforeEach(() => {
    resetUIStoreState();
  });

  it('switches theme and syncs document attributes', () => {
    const { setTheme } = useUIStore.getState();
    setTheme('dark');
    const state = useUIStore.getState();
    expect(state.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('handles functional updates for custom templates', () => {
    const { setCustomTemplates } = useUIStore.getState();
    setCustomTemplates((prev) => [...prev, mockTemplate]);
    const state = useUIStore.getState();
    expect(state.customTemplates).toHaveLength(1);
    expect(state.customTemplates[0]?.id).toBe('custom-1');
  });

  it('resets panel states', () => {
    const { setTemplatePanelOpen, setModulePanelOpen, resetPanels } = useUIStore.getState();
    setTemplatePanelOpen(true);
    setModulePanelOpen(true);
    resetPanels();
    const state = useUIStore.getState();
    expect(state.templatePanelOpen).toBe(false);
    expect(state.modulePanelOpen).toBe(false);
  });

  it('toggles workspace panels exclusively and closes an already open panel', () => {
    const { toggleWorkspacePanel, setTemplatePanelOpen, setModulePanelOpen } =
      useUIStore.getState();

    expect(toggleWorkspacePanel('modules')).toBe(true);
    expect(useUIStore.getState()).toMatchObject({
      modulePanelOpen: true,
      templatePanelOpen: false,
    });
    expect(toggleWorkspacePanel('modules')).toBe(false);
    expect(useUIStore.getState()).toMatchObject({
      modulePanelOpen: false,
      templatePanelOpen: false,
    });

    expect(toggleWorkspacePanel('templates')).toBe(true);
    expect(toggleWorkspacePanel('modules')).toBe(true);
    expect(useUIStore.getState()).toMatchObject({
      modulePanelOpen: true,
      templatePanelOpen: false,
    });
    expect(toggleWorkspacePanel('templates')).toBe(true);
    expect(useUIStore.getState()).toMatchObject({
      modulePanelOpen: false,
      templatePanelOpen: true,
    });

    setModulePanelOpen(true);
    expect(useUIStore.getState()).toMatchObject({
      modulePanelOpen: true,
      templatePanelOpen: false,
    });
    setTemplatePanelOpen(true);
    expect(useUIStore.getState()).toMatchObject({
      modulePanelOpen: false,
      templatePanelOpen: true,
    });
  });

  it('persists ui state to storage', () => {
    const { setTemplateId, setTemplatePanelOpen, setMobileView } = useUIStore.getState();
    setTemplateId('template-123');
    setTemplatePanelOpen(true);
    setMobileView('preview');
    const stored = localStorage.getItem(UI_STORE_PERSIST_KEY);
    expect(stored).not.toBeNull();
    expect(stored ?? '').toContain('template-123');
    expect(stored ?? '').not.toContain('templatePanelOpen');
    expect(stored ?? '').not.toContain('mobileView');
  });

  it('keeps valid templates when recovering a same-version state with one invalid template', async () => {
    const raw = JSON.stringify({
      state: {
        theme: 'dark',
        templateId: 'custom-1',
        customTemplates: [mockTemplate, { id: 'broken', name: 'Broken', sample: null }],
      },
      version: 1,
    });
    localStorage.setItem(UI_STORE_PERSIST_KEY, raw);

    await useUIStore.persist?.rehydrate();

    expect(useUIStore.getState().customTemplates.map((template) => template.id)).toEqual([
      mockTemplate.id,
    ]);
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBe(raw);

    useUIStore.getState().setTheme('light');
    expect(localStorage.getItem(`${UI_STORE_PERSIST_KEY}/recovery`)).toBe(raw);
  });

  it('restores blank-named templates with a fallback and preserves the original recovery copy', async () => {
    const sample = createEmptyResume();
    sample.personal.fullName = 'Synthetic saved sample';
    const blankNamedTemplate: ResumeTemplate = {
      ...mockTemplate,
      id: 'custom-legacy-blank-name',
      name: '   ',
      accentColor: '#6d28d9',
      previewStyle: 'custom',
      theme: { accent: '#6d28d9', background: '#fffaf0', heading: '#312e81' },
      sample,
    };
    const unaffectedTemplate: ResumeTemplate = {
      ...mockTemplate,
      id: 'custom-unaffected',
      name: 'Unaffected Template',
    };
    const raw = JSON.stringify({
      state: {
        theme: 'light',
        templateId: blankNamedTemplate.id,
        customTemplates: [blankNamedTemplate, unaffectedTemplate],
      },
      version: 1,
    });
    localStorage.setItem(UI_STORE_PERSIST_KEY, raw);

    await useUIStore.persist?.rehydrate();

    const recoveredTemplates = useUIStore.getState().customTemplates;
    expect(recoveredTemplates.map(({ id }) => id)).toEqual([
      blankNamedTemplate.id,
      unaffectedTemplate.id,
    ]);
    expect(recoveredTemplates[0]).toMatchObject({
      name: '未命名模板',
      id: blankNamedTemplate.id,
      sample: { personal: { fullName: 'Synthetic saved sample' } },
      previewStyle: 'custom',
      accentColor: '#6d28d9',
      theme: { background: '#fffaf0', heading: '#312e81' },
    });
    expect(localStorage.getItem(UI_STORE_PERSIST_KEY)).toBe(raw);

    useUIStore.getState().setTheme('dark');

    expect(localStorage.getItem(`${UI_STORE_PERSIST_KEY}/recovery`)).toBe(raw);
    const persisted = JSON.parse(localStorage.getItem(UI_STORE_PERSIST_KEY) ?? 'null') as {
      state?: { customTemplates?: Array<{ id: string; name: string }> };
    };
    expect(persisted.state?.customTemplates).toEqual([
      expect.objectContaining({ id: blankNamedTemplate.id, name: '未命名模板' }),
      expect.objectContaining({ id: unaffectedTemplate.id, name: 'Unaffected Template' }),
    ]);
  });
});
