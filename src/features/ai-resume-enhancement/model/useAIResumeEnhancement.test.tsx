import { createEmptyResume, useResumeStore } from '@entities/resume';
import type {
  ChatCompletionResult,
  ChatMessage,
  CompleteOptions,
  ProviderConfig,
} from '@shared/api/ai';
import { ProviderError } from '@shared/api/ai';
import { I18nProvider } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { FeedbackProvider, useFeedbackStore } from '@shared/ui/feedback';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIEnhancementProviderClient } from './useAIResumeEnhancement';
import { useAIResumeEnhancement } from './useAIResumeEnhancement';

const initialResume = () => {
  const resume = createEmptyResume();
  resume.personal.summary = 'Builds backend APIs';
  resume.personal.fullName = 'Private Name';
  resume.personal.email = 'private@example.com';
  resume.experience = [
    {
      id: 'experience-a',
      company: 'Private Company',
      role: 'Engineer',
      highlights: ['Builds APIs', 'Uses Redis'],
    },
    { id: 'experience-b', company: 'Other Company', role: 'Lead', highlights: ['Leads a team'] },
  ];
  resume.projects = [
    { id: 'project-a', name: 'Project Alpha', summary: 'Builds a scheduling tool', highlights: [] },
    { id: 'project-b', name: 'Project Beta', summary: 'Creates reports', highlights: [] },
  ];
  return resume;
};

const testConfiguration = { baseUrl: 'https://provider.example/v1', model: 'test' } as const;

const testProviders = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

const createProvider = (
  complete: AIEnhancementProviderClient['complete'],
  configuration: Readonly<ProviderConfig> | null = testConfiguration,
  isConfigured = true,
): AIEnhancementProviderClient => ({
  configuration,
  isConfigured,
  connectionStatus: isConfigured ? 'ready' : 'not_configured',
  complete,
});

const openSummary = (controller: ReturnType<typeof useAIResumeEnhancement>) => {
  const opener = document.createElement('button');
  act(() => controller.open({ kind: 'personal-summary' }, opener));
};

describe('useAIResumeEnhancement', () => {
  beforeEach(() => {
    useResumeStore.getState().resetState(initialResume());
    useResumeStore.getState().setHasResumeChanges(false);
    useResumeStore.persist?.clearStorage();
    useFeedbackStore.getState().clearFeedback();
  });

  afterEach(() => cleanup());

  it('requires a configured provider and does not write a suggestion before confirmation', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>();
    const { result } = renderHook(
      () => useAIResumeEnhancement(createProvider(complete, null, false)),
      { wrapper: testProviders },
    );
    openSummary(result.current);

    await act(async () => result.current.generate('en'));
    expect(complete).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
  });

  it('applies only the selected field, marks the resume dirty, and locally undoes the AI change', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'Designs and maintains backend APIs.',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);

    await act(async () => result.current.generate('en'));
    expect(result.current.session?.status).toBe('suggested');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);

    act(() => result.current.apply());
    const applied = useResumeStore.getState();
    expect(applied.resume.personal.summary).toBe('Designs and maintains backend APIs.');
    expect(applied.resume.personal.fullName).toBe('Private Name');
    expect(applied.resume.personal.email).toBe('private@example.com');
    expect(applied.resume.experience[0]?.highlights).toEqual(['Builds APIs', 'Uses Redis']);
    expect(applied.resume.projects[0]?.summary).toBe('Builds a scheduling tool');
    expect(applied.hasResumeChanges).toBe(true);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toContain(
      'Designs and maintains backend APIs.',
    );

    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    expect(undo).toBeTypeOf('function');
    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(useResumeStore.getState().resume.personal.email).toBe('private@example.com');
  });

  it('does not overwrite an original field edited while the request is pending', async () => {
    let resolveRequest: ((result: ChatCompletionResult) => void) | undefined;
    let signal: AbortSignal | undefined;
    const complete = vi.fn(
      (_messages: ChatMessage[], options?: CompleteOptions) =>
        new Promise<ChatCompletionResult>((resolve) => {
          resolveRequest = resolve;
          signal = options?.signal;
        }),
    );
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    let generation: Promise<void> | undefined;
    act(() => {
      generation = result.current.generate('en');
    });

    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.personal.summary = 'A newer user edit';
      });
    });
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      resolveRequest?.({ content: 'Stale AI response' });
      await generation;
    });

    expect(result.current.session?.errorCode).toBe('source_changed');
    expect(useResumeStore.getState().resume.personal.summary).toBe('A newer user edit');
  });

  it('cancels when the workspace changes and never applies an old response', () => {
    let signal: AbortSignal | undefined;
    const complete = vi.fn(
      (_messages: ChatMessage[], options?: CompleteOptions) =>
        new Promise<ChatCompletionResult>((_resolve, reject) => {
          signal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(new ProviderError('cancelled')));
        }),
    );
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    act(() => void result.current.generate('en'));

    act(() => useResumeStore.getState().resetState(initialResume()));
    expect(signal?.aborted).toBe(true);
    expect(result.current.session?.errorCode).toBe('workspace_changed');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
  });

  it('aborts when the Provider configuration is replaced during a request', () => {
    let signal: AbortSignal | undefined;
    const complete = vi.fn(
      (_messages: ChatMessage[], options?: CompleteOptions) =>
        new Promise<ChatCompletionResult>((_resolve, reject) => {
          signal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(new ProviderError('cancelled')));
        }),
    );
    const provider = createProvider(complete);
    const { result, rerender } = renderHook(
      ({ currentProvider }: { currentProvider: AIEnhancementProviderClient }) =>
        useAIResumeEnhancement(currentProvider),
      { initialProps: { currentProvider: provider }, wrapper: testProviders },
    );
    openSummary(result.current);
    act(() => void result.current.generate('en'));

    rerender({
      currentProvider: {
        ...provider,
        configuration: { ...testConfiguration, model: 'replacement-model' },
      },
    });
    expect(signal?.aborted).toBe(true);
    expect(result.current.session?.errorCode).toBe('provider_changed');
  });

  it('aborts when the selected item is deleted during generation', () => {
    let signal: AbortSignal | undefined;
    const complete = vi.fn(
      (_messages: ChatMessage[], options?: CompleteOptions) =>
        new Promise<ChatCompletionResult>((_resolve, reject) => {
          signal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(new ProviderError('cancelled')));
        }),
    );
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    const opener = document.createElement('button');
    act(() =>
      result.current.open({ kind: 'experience-highlights', itemId: 'experience-a' }, opener),
    );
    act(() => void result.current.generate('en'));

    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.experience = draft.experience.filter((item) => item.id !== 'experience-a');
      });
    });
    expect(signal?.aborted).toBe(true);
    expect(result.current.session?.errorCode).toBe('target_missing');
  });

  it('rejects a highlights response that changes the number of entries', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: JSON.stringify({ items: ['Only one'] }),
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    const opener = document.createElement('button');
    act(() =>
      result.current.open({ kind: 'experience-highlights', itemId: 'experience-a' }, opener),
    );

    await act(async () => result.current.generate('en'));
    expect(result.current.session?.errorCode).toBe('item_count_mismatch');
    expect(useResumeStore.getState().resume.experience[0]?.highlights).toEqual([
      'Builds APIs',
      'Uses Redis',
    ]);
  });

  it('refuses undo if the user edits the target after applying the AI result', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'AI summary',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.personal.summary = 'A later user edit';
      });
    });

    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('A later user edit');
    expect(useFeedbackStore.getState().items.at(-1)?.tone).toBe('info');
  });

  it('keeps an ID-based target stable through reordering and never undoes into a replacement workspace', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: JSON.stringify({ items: ['Polished API work', 'Polished Redis work'] }),
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    const opener = document.createElement('button');
    act(() =>
      result.current.open({ kind: 'experience-highlights', itemId: 'experience-a' }, opener),
    );
    await act(async () => result.current.generate('en'));
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.experience.reverse();
      });
    });
    act(() => result.current.apply());

    expect(
      useResumeStore.getState().resume.experience.find((item) => item.id === 'experience-a')
        ?.highlights,
    ).toEqual(['Polished API work', 'Polished Redis work']);
    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    const replacement = initialResume();
    replacement.personal.summary = 'New workspace content';
    useResumeStore.getState().resetState(replacement);
    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('New workspace content');
  });

  it('aborts the active request when the enhancement controller unmounts', () => {
    let signal: AbortSignal | undefined;
    const complete = vi.fn(
      (_messages: ChatMessage[], options?: CompleteOptions) =>
        new Promise<ChatCompletionResult>((_resolve, reject) => {
          signal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(new ProviderError('cancelled')));
        }),
    );
    const { result, unmount } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    act(() => void result.current.generate('en'));
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
