import { test } from 'vitest';

import { createEmptyResume } from '../lib/factory';
import { normalizeResumeSchema } from '../lib/normalizers';
import { deriveSectionsFromResume } from '../selectors';
import { useResumeStore } from './resume.store';

const resetResumeStore = () => {
  const baseResume = normalizeResumeSchema(createEmptyResume(), { clone: true });
  useResumeStore.setState({
    resume: baseResume,
    activeSections: deriveSectionsFromResume(baseResume),
    hasResumeChanges: false,
  });
  useResumeStore.persist?.clearStorage();
};

test('resume store update throughput', async ({ bench }) => {
  await bench('update resume', { beforeEach: resetResumeStore }, () => {
    const { updateResume } = useResumeStore.getState();
    updateResume(
      (draft) => {
        draft.personal.fullName = 'Benchmark User';
        draft.personal.title = 'Performance Run';
      },
      { markDirty: false },
    );
  }).run();
});
