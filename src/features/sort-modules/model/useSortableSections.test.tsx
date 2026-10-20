import { createCustomSection, getCustomSectionKey } from '@entities/module';
import {
  createEmptyResume,
  deriveSectionsFromResume,
  normalizeResumeSchema,
  useResumeStore,
} from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { MAX_CUSTOM_SECTIONS } from '@shared/lib/limits';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSortableSections } from './useSortableSections';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('useSortableSections', () => {
  beforeEach(() => {
    const resume = normalizeResumeSchema(createEmptyResume(), { clone: true });
    useResumeStore.setState({
      resume,
      activeSections: deriveSectionsFromResume(resume),
      hasResumeChanges: false,
    });
    useResumeStore.persist.clearStorage();
  });

  it('supports toggling, reordering, and custom section lifecycle', () => {
    const { result } = renderHook(() => useSortableSections(), { wrapper });

    act(() => {
      result.current.toggleSection('skills', false);
    });
    expect(useResumeStore.getState().activeSections).not.toContain('skills');

    act(() => {
      result.current.toggleSection('skills', true);
    });
    expect(useResumeStore.getState().activeSections).toContain('skills');
    expect(useResumeStore.getState().resume.skills).toHaveLength(1);

    const reordered = [...useResumeStore.getState().activeSections].reverse();
    act(() => {
      result.current.reorderSections(reordered);
    });
    expect(useResumeStore.getState().activeSections).toEqual(reordered);

    act(() => {
      result.current.addCustomSection('Notes');
    });
    const customSection = useResumeStore.getState().resume.customSections[0];
    expect(customSection?.title).toBe('Notes');

    act(() => {
      result.current.removeCustomSection(customSection?.id ?? '');
    });
    expect(useResumeStore.getState().resume.customSections).toHaveLength(0);
  });

  it('does not add custom sections after the configured limit', () => {
    const resume = normalizeResumeSchema(createEmptyResume(), { clone: true });
    resume.customSections = Array.from({ length: MAX_CUSTOM_SECTIONS }, (_, index) =>
      createCustomSection(`Section ${index}`),
    );
    useResumeStore.setState({ resume });
    const { result } = renderHook(() => useSortableSections(), { wrapper });

    act(() => result.current.addCustomSection('One too many'));

    expect(useResumeStore.getState().resume.customSections).toHaveLength(MAX_CUSTOM_SECTIONS);
  });

  it('enables only the custom section explicitly added when all modules are disabled', () => {
    useResumeStore.setState({ activeSections: [] });
    const { result } = renderHook(() => useSortableSections(), { wrapper });

    act(() => result.current.addCustomSection('Notes'));

    const state = useResumeStore.getState();
    const customSection = state.resume.customSections[0];
    expect(customSection).toBeDefined();
    expect(state.activeSections).toEqual([getCustomSectionKey(customSection?.id ?? '')]);
  });

  it('does not enable default modules when the last active custom section is removed', () => {
    const resume = normalizeResumeSchema(createEmptyResume(), { clone: true });
    const customSection = createCustomSection('Notes');
    resume.customSections = [customSection];
    useResumeStore.setState({
      resume,
      activeSections: [getCustomSectionKey(customSection.id)],
    });
    const { result } = renderHook(() => useSortableSections(), { wrapper });

    act(() => result.current.removeCustomSection(customSection.id));

    const state = useResumeStore.getState();
    expect(state.resume.customSections).toEqual([]);
    expect(state.activeSections).toEqual([]);
  });
});
