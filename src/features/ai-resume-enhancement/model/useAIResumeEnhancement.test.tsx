import { createEmptyResume, useResumeStore } from '@entities/resume';
import type {
  ChatCompletionResult,
  ChatMessage,
  CompleteOptions,
  ProviderConfig,
  StreamCompleteOptions,
} from '@shared/api/ai';
import { ProviderError } from '@shared/api/ai';
import { I18nProvider } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { FeedbackProvider, useFeedbackStore } from '@shared/ui/feedback';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS } from '../lib/inputBudget';
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
  streamComplete: (messages: ChatMessage[], options: StreamCompleteOptions) =>
    complete(messages, { signal: options.signal, timeoutMs: options.timeoutMs }).then((result) => {
      if (!options.signal?.aborted) options.onDelta(result.content);
      return result;
    }),
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

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

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
    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(useResumeStore.getState().resume.personal.email).toBe('private@example.com');
    expect(useResumeStore.getState().hasResumeChanges).toBe(true);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toContain('Builds backend APIs');
  });

  it('shows a temporary incremental preview and only makes a complete validated suggestion adoptable', async () => {
    vi.useFakeTimers();
    let onDelta: ((delta: string) => void) | undefined;
    let resolveStream: ((result: ChatCompletionResult) => void) | undefined;
    const streamComplete = vi.fn(
      (_messages: ChatMessage[], options: StreamCompleteOptions) =>
        new Promise<ChatCompletionResult>((resolve) => {
          onDelta = options.onDelta;
          resolveStream = resolve;
        }),
    );
    const provider = { ...createProvider(vi.fn()), streamComplete };
    const { result } = renderHook(() => useAIResumeEnhancement(provider), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    let generation: Promise<void> | undefined;
    act(() => {
      generation = result.current.generate('en');
    });

    act(() => onDelta?.('A streamed '));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(41);
    });
    expect(result.current.session?.status).toBe('streaming');
    expect(result.current.session?.preview).toBe('A streamed ');
    expect(result.current.session?.candidate).toBe('');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY) ?? '').not.toContain('A streamed');
    act(() => result.current.apply());
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');

    act(() => onDelta?.('suggestion'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(41);
    });
    expect(result.current.session?.preview).toBe('A streamed suggestion');
    await act(async () => {
      resolveStream?.({ content: 'A streamed suggestion' });
      await generation;
    });

    expect(result.current.session?.status).toBe('suggested');
    expect(result.current.session?.preview).toBe('');
    expect(result.current.session?.candidate).toBe('A streamed suggestion');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    act(() => result.current.apply());
    expect(useResumeStore.getState().resume.personal.summary).toBe('A streamed suggestion');
  });

  it('discards a partial stream after cancellation and ignores a late delta', async () => {
    vi.useFakeTimers();
    let onDelta: ((delta: string) => void) | undefined;
    let rejectStream: ((error: unknown) => void) | undefined;
    const streamComplete = vi.fn(
      (_messages: ChatMessage[], options: StreamCompleteOptions) =>
        new Promise<ChatCompletionResult>((_resolve, reject) => {
          onDelta = options.onDelta;
          rejectStream = reject;
          options.signal?.addEventListener('abort', () => reject(new ProviderError('cancelled')));
        }),
    );
    const provider = { ...createProvider(vi.fn()), streamComplete };
    const { result } = renderHook(() => useAIResumeEnhancement(provider), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    let generation: Promise<void> | undefined;
    act(() => {
      generation = result.current.generate('en');
    });
    act(() => onDelta?.('partial suggestion'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(41);
    });
    expect(result.current.session?.preview).toBe('partial suggestion');

    await act(async () => {
      result.current.cancelGeneration();
      await generation;
    });
    act(() => onDelta?.(' late text'));
    rejectStream?.(new ProviderError('cancelled'));
    expect(result.current.session?.status).toBe('cancelled');
    expect(result.current.session?.preview).toBe('');
    expect(result.current.session?.candidate).toBe('');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY) ?? '').not.toContain(
      'partial suggestion',
    );
    expect(useFeedbackStore.getState().items).toHaveLength(0);
  });

  it('does not keep partial output when a stream is interrupted or times out', async () => {
    const failureCode = vi.fn().mockRejectedValue(new ProviderError('stream_interrupted'));
    const interruptedProvider = {
      ...createProvider(vi.fn()),
      streamComplete: vi.fn((_messages: ChatMessage[], options: StreamCompleteOptions) => {
        options.onDelta('partial');
        return failureCode();
      }),
    };
    const { result, rerender } = renderHook(
      ({ currentProvider }: { currentProvider: AIEnhancementProviderClient }) =>
        useAIResumeEnhancement(currentProvider),
      { initialProps: { currentProvider: interruptedProvider }, wrapper: testProviders },
    );
    openSummary(result.current);
    await act(async () => result.current.generate('en'));
    expect(result.current.session?.status).toBe('error');
    expect(result.current.session?.preview).toBe('');
    expect(result.current.session?.candidate).toBe('');
    expect(result.current.session?.providerErrorCode).toBe('stream_interrupted');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY) ?? '').not.toContain('partial');

    rerender({
      currentProvider: {
        ...interruptedProvider,
        streamComplete: vi.fn().mockRejectedValue(new ProviderError('timeout')),
      },
    });
    await act(async () => result.current.generate('en'));
    expect(result.current.session?.providerErrorCode).toBe('timeout');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
  });

  it('ignores an older request delta and final result after a new session starts', async () => {
    const pending: Array<{
      onDelta: (delta: string) => void;
      resolve: (result: ChatCompletionResult) => void;
    }> = [];
    const streamComplete = vi.fn(
      (_messages: ChatMessage[], options: StreamCompleteOptions) =>
        new Promise<ChatCompletionResult>((resolve) => {
          pending.push({ onDelta: options.onDelta, resolve });
        }),
    );
    const provider = { ...createProvider(vi.fn()), streamComplete };
    const { result } = renderHook(() => useAIResumeEnhancement(provider), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    let oldGeneration: Promise<void> | undefined;
    act(() => {
      oldGeneration = result.current.generate('en');
    });
    act(() => pending[0]?.onDelta('Old '));

    act(() => {
      result.current.open(
        { kind: 'project-summary', itemId: 'project-a' },
        document.createElement('button'),
      );
    });
    let newGeneration: Promise<void> | undefined;
    act(() => {
      newGeneration = result.current.generate('en');
    });
    act(() => pending[1]?.onDelta('Current suggestion'));
    await act(async () => {
      pending[1]?.resolve({ content: 'Current suggestion' });
      await newGeneration;
    });
    act(() => pending[0]?.onDelta('late old delta'));
    await act(async () => {
      pending[0]?.resolve({ content: 'Old suggestion' });
      await oldGeneration;
    });

    expect(result.current.session?.status).toBe('suggested');
    expect(result.current.session?.candidate).toBe('Current suggestion');
    expect(result.current.session?.preview).toBe('');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(useResumeStore.getState().resume.projects[0]?.summary).toBe('Builds a scheduling tool');
  });

  it('rejects empty text and invalid completed Highlights JSON without changing the resume', async () => {
    const emptyProvider = {
      ...createProvider(vi.fn()),
      streamComplete: vi.fn().mockResolvedValue({ content: '' }),
    };
    const { result, rerender } = renderHook(
      ({ currentProvider }: { currentProvider: AIEnhancementProviderClient }) =>
        useAIResumeEnhancement(currentProvider),
      { initialProps: { currentProvider: emptyProvider }, wrapper: testProviders },
    );
    openSummary(result.current);
    await act(async () => result.current.generate('en'));
    expect(result.current.session?.errorCode).toBe('empty_output');
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');

    const invalidHighlightsProvider = {
      ...createProvider(vi.fn()),
      streamComplete: vi.fn((_messages: ChatMessage[], options: StreamCompleteOptions) => {
        const content = '{"items":["partial"';
        options.onDelta(content);
        return Promise.resolve({ content });
      }),
    };
    rerender({ currentProvider: invalidHighlightsProvider });
    act(() =>
      result.current.open(
        { kind: 'experience-highlights', itemId: 'experience-a' },
        document.createElement('button'),
      ),
    );
    await act(async () => result.current.generate('en'));
    expect(result.current.session?.errorCode).toBe('invalid_highlights');
    expect(result.current.session?.preview).toBe('');
    expect(result.current.session?.candidate).toBe('');
    expect(useResumeStore.getState().resume.experience[0]?.highlights).toEqual([
      'Builds APIs',
      'Uses Redis',
    ]);
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

  it('permanently refuses undo after the target changes away and back to the AI value', async () => {
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
        draft.personal.summary = 'C';
      });
    });
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.personal.summary = 'AI summary';
      });
    });

    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('AI summary');
  });

  it('undoes the AI field while preserving later edits to unrelated fields', async () => {
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
        draft.personal.email = 'edited@example.com';
      });
    });

    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    act(() => undo?.());
    const state = useResumeStore.getState();
    expect(state.resume.personal.summary).toBe('Builds backend APIs');
    expect(state.resume.personal.email).toBe('edited@example.com');
    expect(state.resume.personal.fullName).toBe('Private Name');
    expect(state.resume.experience).toEqual(initialResume().experience);
    expect(state.resume.projects).toEqual(initialResume().projects);
    expect(state.hasResumeChanges).toBe(true);
  });

  it('keeps an experience undo target stable when experiences are reordered after apply', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: JSON.stringify({ items: ['Polished API work', 'Polished Redis work'] }),
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    act(() =>
      result.current.open(
        { kind: 'experience-highlights', itemId: 'experience-a' },
        document.createElement('button'),
      ),
    );
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.experience.reverse();
      });
    });

    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    act(() => undo?.());
    expect(
      useResumeStore.getState().resume.experience.find((item) => item.id === 'experience-a')
        ?.highlights,
    ).toEqual(['Builds APIs', 'Uses Redis']);
  });

  it('keeps a project undo target stable when projects are reordered after apply', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'Polished scheduling tool',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    act(() =>
      result.current.open(
        { kind: 'project-summary', itemId: 'project-a' },
        document.createElement('button'),
      ),
    );
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.projects.reverse();
      });
    });

    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    act(() => undo?.());
    expect(
      useResumeStore.getState().resume.projects.find((item) => item.id === 'project-a')?.summary,
    ).toBe('Builds a scheduling tool');
  });

  it('refuses an undo after its experience target is deleted and recreated with the same ID and text', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: JSON.stringify({ items: ['Polished API work', 'Polished Redis work'] }),
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    act(() =>
      result.current.open(
        { kind: 'experience-highlights', itemId: 'experience-a' },
        document.createElement('button'),
      ),
    );
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;

    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.experience = draft.experience.filter((item) => item.id !== 'experience-a');
      });
    });
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.experience.push({
          id: 'experience-a',
          company: 'Private Company',
          role: 'Engineer',
          highlights: ['Polished API work', 'Polished Redis work'],
        });
      });
    });

    act(() => undo?.());
    expect(
      useResumeStore.getState().resume.experience.find((item) => item.id === 'experience-a')
        ?.highlights,
    ).toEqual(['Polished API work', 'Polished Redis work']);
  });

  it('does not restore a deleted target when its undo callback is used', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: JSON.stringify({ items: ['Polished API work', 'Polished Redis work'] }),
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    act(() =>
      result.current.open(
        { kind: 'experience-highlights', itemId: 'experience-a' },
        document.createElement('button'),
      ),
    );
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.experience = draft.experience.filter((item) => item.id !== 'experience-a');
      });
    });

    act(() => undo?.());
    expect(
      useResumeStore.getState().resume.experience.some((item) => item.id === 'experience-a'),
    ).toBe(false);
  });

  it('refuses an undo after a resume reset recreates the same target value', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'AI summary',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    useResumeStore.getState().resetState(initialResume());

    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('Builds backend APIs');
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('refuses an undo after importing a replacement workspace', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'AI summary',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    const undo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;
    const imported = initialResume();
    imported.personal.summary = 'Imported summary';
    useResumeStore.getState().replaceState(imported);

    act(() => undo?.());
    expect(useResumeStore.getState().resume.personal.summary).toBe('Imported summary');
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('isolates old undo callbacks from newer snapshots and consumes a token only once', async () => {
    const complete = vi
      .fn<AIEnhancementProviderClient['complete']>()
      .mockResolvedValueOnce({ content: 'AI summary' })
      .mockResolvedValueOnce({ content: 'AI project summary' });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    openSummary(result.current);
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    const oldUndo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;

    act(() =>
      result.current.open(
        { kind: 'project-summary', itemId: 'project-a' },
        document.createElement('button'),
      ),
    );
    await act(async () => result.current.generate('en'));
    act(() => result.current.apply());
    const currentUndo = useFeedbackStore.getState().items.at(-1)?.action?.onClick;

    act(() => oldUndo?.());
    expect(
      useResumeStore.getState().resume.projects.find((item) => item.id === 'project-a')?.summary,
    ).toBe('AI project summary');
    expect(useResumeStore.getState().resume.personal.summary).toBe('AI summary');

    act(() => currentUndo?.());
    act(() => currentUndo?.());
    expect(
      useResumeStore.getState().resume.projects.find((item) => item.id === 'project-a')?.summary,
    ).toBe('Builds a scheduling tool');
    expect(useResumeStore.getState().resume.personal.summary).toBe('AI summary');
  });

  it('blocks over-budget input before calling the provider and allows a shortened retry', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'Short suggestion',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'x'.repeat(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS + 1);
    });
    openSummary(result.current);

    await act(async () => result.current.generate('en'));
    expect(result.current.session?.errorCode).toBe('input_too_long');
    expect(result.current.session?.inputCodeUnits).toBe(
      AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS + 1,
    );
    expect(complete).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resume.personal.summary).toBe(
      'x'.repeat(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS + 1),
    );
    expect(useFeedbackStore.getState().items).toHaveLength(0);

    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.personal.summary = 'Shortened source';
      });
    });
    await act(async () => result.current.generate('en'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.current.session?.status).toBe('suggested');
  });

  it('allows an input exactly at the character budget', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>().mockResolvedValue({
      content: 'Short suggestion',
    });
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'x'.repeat(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS);
    });
    openSummary(result.current);

    await act(async () => result.current.generate('en'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.current.session?.status).toBe('suggested');
  });

  it('blocks Highlights whose combined JSON size exceeds the character budget', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>();
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    useResumeStore.getState().updateResume((draft) => {
      draft.experience[0]!.highlights = ['x'.repeat(5993), 'y'.repeat(5993)];
    });
    act(() =>
      result.current.open(
        { kind: 'experience-highlights', itemId: 'experience-a' },
        document.createElement('button'),
      ),
    );

    await act(async () => result.current.generate('en'));
    expect(result.current.session?.errorCode).toBe('input_too_long');
    expect(result.current.session?.inputCodeUnits).toBeGreaterThan(
      AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS,
    );
    expect(complete).not.toHaveBeenCalled();
  });

  it('blocks an empty field without calling the provider', async () => {
    const complete = vi.fn<AIEnhancementProviderClient['complete']>();
    const { result } = renderHook(() => useAIResumeEnhancement(createProvider(complete)), {
      wrapper: testProviders,
    });
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = '';
    });
    openSummary(result.current);

    await act(async () => result.current.generate('en'));
    expect(result.current.session?.errorCode).toBe('empty_source');
    expect(complete).not.toHaveBeenCalled();
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
