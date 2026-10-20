import { createCustomSection } from '@entities/module';
import { createEmptyResume } from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { MAX_SECTION_ITEMS } from '@shared/lib/limits';
import { FeedbackProvider } from '@shared/ui/feedback';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useCustomSectionsEditor } from './useCustomSectionsEditor';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

describe('custom section editor limits', () => {
  it('does not add fields beyond the configured per-section maximum', () => {
    const resume = createEmptyResume();
    const section = createCustomSection('Details', 'fields');
    section.fields = Array.from({ length: MAX_SECTION_ITEMS }, (_, index) => ({
      id: `field-${index}`,
      label: `Field ${index}`,
      value: '',
    }));
    resume.customSections = [section];
    const updateDraft = vi.fn();
    const { result } = renderHook(() => useCustomSectionsEditor(resume, updateDraft), { wrapper });

    act(() => result.current.handleCustomFieldAdd(section.id));

    expect(updateDraft).not.toHaveBeenCalled();
  });
});
