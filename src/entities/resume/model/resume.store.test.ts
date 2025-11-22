import { RESUME_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { beforeEach, describe, expect, it } from 'vitest';

import { createEmptyResume } from '../lib/factory';
import { normalizeResumeSchema } from '../lib/normalizers';
import type { ActiveSectionKey } from '../selectors';
import { deriveSectionsFromResume } from '../selectors';
import { useResumeStore } from './resume.store';

const resetResumeStoreState = () => {
  const baseResume = normalizeResumeSchema(createEmptyResume(), { clone: true });
  useResumeStore.setState({
    resume: baseResume,
    activeSections: deriveSectionsFromResume(baseResume),
    hasResumeChanges: false,
  });
  useResumeStore.persist?.clearStorage();
};

describe('resume store', () => {
  beforeEach(() => {
    resetResumeStoreState();
  });

  it('updates resume draft and marks store as dirty by default', () => {
    const { updateResume } = useResumeStore.getState();
    updateResume((draft) => {
      draft.personal.fullName = 'Test User';
    });
    const state = useResumeStore.getState();
    expect(state.resume.personal.fullName).toBe('Test User');
    expect(state.hasResumeChanges).toBe(true);
  });

  it('respects markDirty flag when updating resume', () => {
    const { updateResume } = useResumeStore.getState();
    updateResume(
      (draft) => {
        draft.personal.fullName = 'Clean User';
      },
      { markDirty: false },
    );
    const state = useResumeStore.getState();
    expect(state.hasResumeChanges).toBe(false);
  });

  it('sanitizes active sections when updating', () => {
    const { updateActiveSections } = useResumeStore.getState();
    updateActiveSections(['non-existent' as ActiveSectionKey], { allowEmpty: false });
    const state = useResumeStore.getState();
    expect(state.activeSections.length).toBeGreaterThan(0);
  });

  it('persists updates into storage', () => {
    const { updateResume } = useResumeStore.getState();
    updateResume((draft) => {
      draft.personal.fullName = 'Persisted User';
    });
    const stored = localStorage.getItem(RESUME_STORE_PERSIST_KEY);
    expect(stored).not.toBeNull();
    expect(stored ?? '').toContain('Persisted User');
  });

  it('resets state to a clean baseline', () => {
    const { updateResume, resetState, setHasResumeChanges } = useResumeStore.getState();
    updateResume((draft) => {
      draft.personal.fullName = 'Dirty state';
    });
    setHasResumeChanges(true);
    resetState();
    const state = useResumeStore.getState();
    expect(state.hasResumeChanges).toBe(false);
    expect(state.activeSections).toEqual(deriveSectionsFromResume(state.resume));
  });
});
