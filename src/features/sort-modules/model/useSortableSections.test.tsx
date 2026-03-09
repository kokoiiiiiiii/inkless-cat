import {
  createEmptyResume,
  deriveSectionsFromResume,
  normalizeResumeSchema,
  useResumeStore,
} from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
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
});
