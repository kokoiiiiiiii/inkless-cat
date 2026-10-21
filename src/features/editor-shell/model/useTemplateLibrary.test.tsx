import { createEmptyResume } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';
import { I18nProvider } from '@shared/i18n';
import { MAX_CUSTOM_TEMPLATES, MAX_TEMPLATE_NAME_LENGTH } from '@shared/lib/limits';
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
  const setCustomTemplates = vi.fn<Dispatch<SetStateAction<ResumeTemplate[]>>>();
  return {
    baseTemplates: [baseTemplate],
    templateId: customTemplate.id,
    customTemplates: [customTemplate],
    setTemplateId: vi.fn() as Dispatch<SetStateAction<string>>,
    setCustomTemplates,
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

  it('does not write empty, whitespace-only, or overlong template names', () => {
    const options = createLibraryOptions();
    const { result } = renderHook(() => useTemplateLibrary(options), { wrapper });

    act(() => {
      result.current.handleUpdateCustomTemplate('custom', { name: '' });
      result.current.handleUpdateCustomTemplate('custom', { name: '   ' });
      result.current.handleUpdateCustomTemplate('custom', {
        name: 'x'.repeat(MAX_TEMPLATE_NAME_LENGTH + 1),
      });
    });

    expect(options.setCustomTemplates).not.toHaveBeenCalled();
  });

  it('trims a valid updated name without changing the template sample or appearance', () => {
    const options = createLibraryOptions();
    const original = {
      ...options.customTemplates[0]!,
      description: 'Keep this description.',
      accentColor: '#6d28d9',
      previewStyle: 'custom',
      theme: { accent: '#6d28d9', heading: '#312e81' },
      sample: {
        ...createEmptyResume(),
        personal: { ...createEmptyResume().personal, fullName: 'Synthetic template sample' },
      },
    };
    options.customTemplates = [original];
    const { result } = renderHook(() => useTemplateLibrary(options), { wrapper });

    act(() => result.current.handleUpdateCustomTemplate(original.id, { name: '  Updated Name  ' }));

    const update = options.setCustomTemplates.mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    if (typeof update !== 'function') return;
    const next = update(options.customTemplates);
    expect(next[0]).toMatchObject({
      id: original.id,
      name: 'Updated Name',
      description: original.description,
      accentColor: original.accentColor,
      previewStyle: original.previewStyle,
      theme: original.theme,
    });
    expect(next[0]?.sample).toBe(original.sample);
  });

  it('creates a blank-named template with a localized non-empty fallback', () => {
    const options = createLibraryOptions();
    const { result } = renderHook(() => useTemplateLibrary(options), { wrapper });

    act(() => result.current.handleSaveCustomTemplate({ name: '   ' }));

    const update = options.setCustomTemplates.mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    if (typeof update !== 'function') return;
    const next = update([]);
    expect(next).toHaveLength(1);
    expect(next[0]?.name).toBe('未命名模板');
    expect(next[0]?.sample).toEqual(options.resume);
    expect(options.setTemplateId).toHaveBeenCalledWith(next[0]?.id);
  });
});
