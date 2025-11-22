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

  it('persists ui state to storage', () => {
    const { setTemplateId } = useUIStore.getState();
    setTemplateId('template-123');
    const stored = localStorage.getItem(UI_STORE_PERSIST_KEY);
    expect(stored).not.toBeNull();
    expect(stored ?? '').toContain('template-123');
  });
});
