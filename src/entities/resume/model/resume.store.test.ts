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

  it('keeps all sections disabled when the name is edited', () => {
    useResumeStore.setState({ activeSections: [] });

    useResumeStore.getState().updateResume((draft) => {
      draft.personal.fullName = 'Name with no enabled sections';
    });

    expect(useResumeStore.getState().activeSections).toEqual([]);
  });

  it('keeps all sections disabled when the personal summary is edited', () => {
    useResumeStore.setState({ activeSections: [] });

    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'A fictional summary';
    });

    expect(useResumeStore.getState().activeSections).toEqual([]);
  });

  it('preserves an explicitly selected section order when resume content changes', () => {
    const selectedOrder: ActiveSectionKey[] = ['projects', 'experience', 'socials'];
    useResumeStore.setState({ activeSections: selectedOrder });

    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'Updated without changing module order';
    });

    expect(useResumeStore.getState().activeSections).toEqual(selectedOrder);
  });

  it('initializes default modules from the default resume', () => {
    const initialState = useResumeStore.getInitialState();

    expect(initialState.activeSections).toEqual(deriveSectionsFromResume(initialState.resume));
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
    expect(stored ?? '').not.toContain('hasResumeChanges');
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

  it('preserves invalid same-version data instead of overwriting it with defaults', async () => {
    const raw = JSON.stringify({
      state: { resume: { personal: 'invalid' }, activeSections: [] },
      version: 1,
    });
    localStorage.setItem(RESUME_STORE_PERSIST_KEY, raw);

    await useResumeStore.persist?.rehydrate();
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.fullName = 'In memory only';
    });

    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(raw);
  });
});
