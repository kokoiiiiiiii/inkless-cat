import { createEmptyResume } from '@entities/resume';
import { test } from 'vitest';

import { useUIStore } from './ui.store';

const resetUIStore = () => {
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

test('ui store theme toggle', async ({ bench }) => {
  await bench('toggle theme', { beforeEach: resetUIStore }, () => {
    const { setTheme } = useUIStore.getState();
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }).run();
});

test('ui store custom template writes', async ({ bench }) => {
  await bench('write custom template', { beforeEach: resetUIStore }, () => {
    const { setCustomTemplates } = useUIStore.getState();
    setCustomTemplates((prev) => [
      ...prev,
      {
        id: `tpl-${prev.length + 1}`,
        name: 'Bench Template',
        description: 'Generated during benchmark',
        previewStyle: 'modern',
        accentColor: '#2563eb',
        sample: createEmptyResume(),
      },
    ]);
  }).run();
});
