import { createEmptyResume } from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { MAX_SECTION_ITEMS } from '@shared/lib/limits';
import { FeedbackProvider } from '@shared/ui/feedback';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useStandardSectionEditor } from './useStandardSectionEditor';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

describe('standard section editor limits', () => {
  it('does not add items beyond the configured section maximum', () => {
    const resume = createEmptyResume();
    resume.experience = Array.from({ length: MAX_SECTION_ITEMS }, (_, index) => ({
      id: `experience-${index}`,
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      highlights: [],
    }));
    const updateDraft = vi.fn();
    const { result } = renderHook(() => useStandardSectionEditor(resume, updateDraft), {
      wrapper,
    });

    act(() => result.current.handleAddSectionItem('experience'));

    expect(updateDraft).not.toHaveBeenCalled();
  });
});
