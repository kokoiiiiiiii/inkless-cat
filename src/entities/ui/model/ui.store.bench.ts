import { createEmptyResume } from '@entities/resume';
import { beforeEach, bench } from 'vitest';

import { useUIStore } from './ui.store';

beforeEach(() => {
  useUIStore.setState({
    theme: 'light',
    templateId: '',
    customTemplates: [],
    templatePanelOpen: false,
    modulePanelOpen: false,
    mobileView: 'editor',
  });
  useUIStore.persist?.clearStorage();
});

bench('ui store theme toggle', () => {
  const { setTheme } = useUIStore.getState();
  setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
});

bench('ui store custom template writes', () => {
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
});
