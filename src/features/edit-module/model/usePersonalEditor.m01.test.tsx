import { createEmptyResume } from '@entities/resume';
import { useModuleEditor } from '@features/edit-module';
import { I18nProvider } from '@shared/i18n';
import { MAX_RESUME_TEXT_LENGTH } from '@shared/lib/limits';
import { FeedbackProvider, useFeedbackStore } from '@shared/ui/feedback';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

describe('M01 personal controller constraints', () => {
  beforeEach(() => {
    useFeedbackStore.getState().clearFeedback();
  });

  it('applies the existing text length limit without adding email or phone validation', () => {
    const resume = createEmptyResume();
    resume.personal.fullName = 'Synthetic baseline';
    const updates: Array<(draft: typeof resume) => void> = [];
    const { result } = renderHook(
      () => useModuleEditor({ resume, onChange: (mutator) => updates.push(mutator) }),
      { wrapper },
    );

    act(() => {
      result.current.handlePersonalChange('fullName', 'x'.repeat(MAX_RESUME_TEXT_LENGTH + 1));
      result.current.handlePersonalChange('email', 'not-an-email');
      result.current.handlePersonalChange('phone', 'synthetic text');
    });

    expect(updates).toHaveLength(2);
    const draft = structuredClone(resume);
    for (const update of updates) update(draft);
    expect(draft.personal.fullName).toBe('Synthetic baseline');
    expect(draft.personal.email).toBe('not-an-email');
    expect(draft.personal.phone).toBe('synthetic text');
    expect(useFeedbackStore.getState().items.some(({ tone }) => tone === 'error')).toBe(true);
  });
});
