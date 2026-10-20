import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { I18nProvider } from '@shared/i18n';
import { MAX_CUSTOM_TEMPLATES } from '@shared/lib/limits';
import { FeedbackProvider } from '@shared/ui/feedback';
import { act, renderHook } from '@testing-library/react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTemplateLibrary } from './useTemplateLibrary';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

const createLibraryOptions = () => {
  const baseTemplate: ResumeTemplate = {
    id: 'base',
    name: 'Base',
    sample: createEmptyResume(),
  };
  const customTemplate: ResumeTemplate = {
    id: 'custom',
    name: 'Custom',
    sample: createEmptyResume(),
  };
  return {
    baseTemplates: [baseTemplate],
    templateId: customTemplate.id,
    customTemplates: [customTemplate],
    setTemplateId: vi.fn() as Dispatch<SetStateAction<string>>,
    setCustomTemplates: vi.fn() as Dispatch<SetStateAction<ResumeTemplate[]>>,
    resume: createEmptyResume(),
    resetState: vi.fn(),
    setHasResumeChanges: vi.fn(),
    defaultTemplateId: baseTemplate.id,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('template destructive actions', () => {
  it('keeps the resume and template library unchanged when destructive confirmations are cancelled', () => {
    const options = createLibraryOptions();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    const { result } = renderHook(() => useTemplateLibrary(options), { wrapper });

    act(() => {
      result.current.handleResetSample();
      result.current.handleTemplateSampleLoad(options.customTemplates[0]!);
      result.current.handleDeleteCustomTemplate(options.customTemplates[0]!.id);
      result.current.handleUpdateCustomTemplate(options.customTemplates[0]!.id, {
        sample: '__CURRENT__',
      });
    });

    expect(options.resetState).not.toHaveBeenCalled();
    expect(options.setCustomTemplates).not.toHaveBeenCalled();
    expect(options.setTemplateId).not.toHaveBeenCalled();
  });

  it('refuses to add a custom template once the configured limit is reached', () => {
    const options = createLibraryOptions();
    options.customTemplates = Array.from({ length: MAX_CUSTOM_TEMPLATES }, (_, index) => ({
      ...options.customTemplates[0]!,
      id: `custom-${index}`,
    }));
    const { result } = renderHook(() => useTemplateLibrary(options), { wrapper });

    act(() => result.current.handleSaveCustomTemplate({ name: 'One too many' }));

    expect(options.setCustomTemplates).not.toHaveBeenCalled();
  });
});
