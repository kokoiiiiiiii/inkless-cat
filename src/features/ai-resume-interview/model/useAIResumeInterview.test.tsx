import { createEmptyResume, useResumeStore } from '@entities/resume';
import { I18nProvider, useI18n } from '@shared/i18n';
import { RESUME_STORE_PERSIST_KEY } from '@shared/lib/storage';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIInterviewProviderClient } from './types';
import { useAIResumeInterview } from './useAIResumeInterview';

const configuration = { baseUrl: 'https://provider.example/v1', model: 'interview-test' } as const;

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const createProvider = (
  streamComplete: AIInterviewProviderClient['streamComplete'] = vi
    .fn<AIInterviewProviderClient['streamComplete']>()
    .mockResolvedValue({ content: 'Which part did you personally own?' }),
  providerConfiguration: AIInterviewProviderClient['configuration'] = configuration,
  isConfigured = true,
): AIInterviewProviderClient => ({
  configuration: providerConfiguration,
  isConfigured,
  connectionStatus: isConfigured ? 'ready' : 'not_configured',
  streamComplete,
});

const startWithDraft = (
  result: { current: ReturnType<typeof useAIResumeInterview> },
  mode: 'ai' | 'template',
  answer: string,
) => {
  act(() => {
    result.current.start(mode);
    result.current.setAnswerDraft(answer);
    result.current.submitAnswer();
  });
};

const approveAndFlush = async (result: { current: ReturnType<typeof useAIResumeInterview> }) => {
  await act(async () => {
    result.current.approvePrivacyAndSend();
    await Promise.resolve();
  });
};

const makeDeferred = () => {
  let resolve!: (value: { content: string }) => void;
  const promise = new Promise<{ content: string }>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('useAIResumeInterview', () => {
  beforeEach(() => {
    useResumeStore.getState().resetState(createEmptyResume());
    useResumeStore.persist?.clearStorage();
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a session with the first target-role question and accepts a template answer', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });

    act(() => result.current.start('template'));

    expect(result.current.session).toMatchObject({
      id: expect.any(String),
      generation: 1,
      currentPhase: 'targetRole',
      currentQuestion: {
        phase: 'targetRole',
        source: 'template',
        ruleKind: 'initial',
      },
      status: 'asking',
      requestStatus: 'idle',
    });

    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
    });

    expect(result.current.session?.answers[0]?.text).toBe('Backend engineer');
    expect(result.current.session?.currentQuestion).toMatchObject({
      phase: 'targetRole',
      source: 'template',
      ruleKind: 'fallback',
    });
  });

  it('updates guide questions when the interface language changes without replacing the session', () => {
    const provider = createProvider();
    const { result } = renderHook(
      () => {
        const i18n = useI18n();
        return { i18n, interview: useAIResumeInterview(provider) };
      },
      { wrapper },
    );

    act(() => {
      result.current.i18n.setLocale('zh-CN');
      result.current.interview.start('template');
    });
    const sessionId = result.current.interview.session?.id;
    expect(result.current.interview.session?.currentQuestion?.content).toContain('你希望应聘');

    act(() => result.current.i18n.setLocale('en'));

    expect(result.current.interview.session?.id).toBe(sessionId);
    expect(result.current.interview.session?.currentQuestion?.content).toContain('What role');

    act(() => result.current.i18n.setLocale('zh-CN'));

    expect(result.current.interview.session?.id).toBe(sessionId);
    expect(result.current.interview.session?.currentQuestion?.content).toContain('你希望应聘');
  });

  it('skips a question and a phase, then advances through the interview stages', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));

    act(() => result.current.skipQuestion());
    expect(result.current.session?.currentQuestion?.ruleKind).toBe('fallback');

    act(() => result.current.skipPhase());
    expect(result.current.session?.currentPhase).toBe('basics');
    expect(result.current.session?.skippedPhases).toContain('targetRole');

    act(() => result.current.nextPhase());
    expect(result.current.session?.currentPhase).toBe('work');
  });

  it('returns to an earlier answer and removes later questions and answers', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));
    const firstQuestionId = result.current.session?.currentQuestion?.id;

    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
      result.current.setAnswerDraft('I build APIs.');
      result.current.submitAnswer();
    });
    expect(result.current.session?.currentPhase).toBe('basics');
    expect(result.current.session?.answers).toHaveLength(2);

    act(() => result.current.editAnswer(firstQuestionId ?? ''));

    expect(result.current.session?.currentPhase).toBe('targetRole');
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);
    expect(result.current.answerDraft).toBe('Backend engineer');
    expect(result.current.session?.generation).toBe(2);
  });

  it('ends in a review stage before marking the interview complete', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));

    for (const phase of [
      'targetRole',
      'basics',
      'work',
      'projects',
      'education',
      'skills',
    ] as const) {
      expect(result.current.session?.currentPhase).toBe(phase);
      act(() => result.current.skipPhase());
    }

    expect(result.current.session?.currentPhase).toBe('review');
    expect(result.current.session?.currentQuestion).toBeNull();
    act(() => result.current.finishInterview());
    expect(result.current.session?.status).toBe('completed');
  });

  it('does not use a stale draft to submit the same click twice after moving to a new question', () => {
    const streamComplete = vi.fn<AIInterviewProviderClient['streamComplete']>();
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    act(() => result.current.start('template'));

    act(() => {
      result.current.setAnswerDraft('Same answer');
      result.current.submitAnswer();
      result.current.submitAnswer();
    });

    expect(result.current.session?.answers).toHaveLength(1);
    expect(result.current.session?.answers[0]?.text).toBe('Same answer');
    expect(streamComplete).not.toHaveBeenCalled();
  });

  it('requires explicit privacy consent before the first AI request and asks a contextual follow-up', async () => {
    const streamComplete = vi
      .fn<AIInterviewProviderClient['streamComplete']>()
      .mockResolvedValueOnce({ content: 'Which part did you personally own?' })
      .mockResolvedValueOnce({ content: 'How did you work with the MES team?' });
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });

    startWithDraft(result, 'ai', 'Backend engineer');
    expect(result.current.session?.privacyConsentPending).toBe(true);
    expect(streamComplete).not.toHaveBeenCalled();
    await approveAndFlush(result);
    await waitFor(() =>
      expect(result.current.session?.currentQuestion?.content).toBe(
        'Which part did you personally own?',
      ),
    );
    expect(result.current.session?.mode).toBe('ai');
    expect(result.current.session?.followUpCounts.targetRole).toBe(1);

    act(() => {
      result.current.setAnswerDraft(
        'I built the industrial IoT backend independently; MES was team work.',
      );
      result.current.submitAnswer();
    });
    expect(result.current.session?.answers).toHaveLength(2);
    expect(result.current.session?.status).toBe('generating_question');
    await waitFor(() => expect(streamComplete).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.session?.currentQuestion?.content).toBe(
        'How did you work with the MES team?',
      ),
    );

    const latestMessages = streamComplete.mock.calls[1]?.[0] ?? [];
    expect(latestMessages[1]?.content).toContain('industrial IoT backend independently');
    expect(latestMessages[1]?.content).toContain('MES was team work');
    expect(result.current.session?.questions.at(-1)?.source).toBe('ai');
  });

  it('preserves answers after provider failure and offers a bounded manual retry path', async () => {
    const streamComplete = vi
      .fn<AIInterviewProviderClient['streamComplete']>()
      .mockRejectedValue(new Error('network failed'));
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'Backend engineer');
    await approveAndFlush(result);
    await waitFor(() => expect(result.current.session?.error?.code).toBe('provider_error'));
    expect(result.current.session?.answers[0]?.text).toBe('Backend engineer');
    expect(result.current.session?.followUpCounts.targetRole).toBe(1);

    act(() => result.current.retryQuestion());
    await waitFor(() => expect(streamComplete).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.session?.error?.code).toBe('provider_error'));
    act(() => result.current.retryQuestion());
    expect(streamComplete).toHaveBeenCalledTimes(2);
    expect(result.current.session?.followUpCounts.targetRole).toBe(2);
  });

  it('rejects invalid model questions without losing the answer and permits guide questions', async () => {
    const streamComplete = vi.fn<AIInterviewProviderClient['streamComplete']>().mockResolvedValue({
      content: 'What did you build? What changed?',
    });
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'I built a scheduling tool.');
    await approveAndFlush(result);
    await waitFor(() => expect(result.current.session?.error?.code).toBe('invalid_question'));

    expect(result.current.session?.answers[0]?.text).toBe('I built a scheduling tool.');
    expect(result.current.session?.questions).toHaveLength(1);
    act(() => result.current.continueWithTemplate());
    expect(result.current.session?.mode).toBe('template');
    expect(result.current.session?.currentQuestion?.ruleKind).toBe('fallback');
  });

  it('cancels a request while preserving its answer and ignores a late response', async () => {
    const deferred = makeDeferred();
    let signal: AbortSignal | undefined;
    const streamComplete = vi.fn((_messages, options) => {
      signal = options.signal;
      return deferred.promise;
    });
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'Backend engineer');
    await approveAndFlush(result);

    expect(signal?.aborted).toBe(false);
    act(() => result.current.cancelGeneration());
    expect(signal?.aborted).toBe(true);
    expect(result.current.session?.requestStatus).toBe('cancelled');
    expect(result.current.session?.answers[0]?.text).toBe('Backend engineer');

    await act(async () => {
      deferred.resolve({ content: 'A late question that must be ignored?' });
      await Promise.resolve();
    });
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.currentQuestion?.content).not.toContain('late question');
  });

  it('aborts requests and rejects stale output when the Provider configuration changes', async () => {
    const deferred = makeDeferred();
    let signal: AbortSignal | undefined;
    const streamComplete = vi.fn((_messages, options) => {
      signal = options.signal;
      return deferred.promise;
    });
    let provider = createProvider(streamComplete);
    const { result, rerender } = renderHook(() => useAIResumeInterview(provider), { wrapper });
    startWithDraft(result, 'ai', 'Backend engineer');
    await approveAndFlush(result);

    provider = createProvider(streamComplete, {
      baseUrl: 'https://other.example/v1',
      model: 'new',
    });
    rerender();
    await waitFor(() => expect(result.current.session?.error?.code).toBe('provider_changed'));
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      deferred.resolve({ content: 'Stale provider question?' });
      await Promise.resolve();
    });
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.privacyAcknowledged).toBe(false);
  });

  it('isolates an earlier session from a late response after starting a new session', async () => {
    const deferred = makeDeferred();
    let signal: AbortSignal | undefined;
    const streamComplete = vi.fn((_messages, options) => {
      signal = options.signal;
      return deferred.promise;
    });
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'Old session answer');
    await approveAndFlush(result);
    const oldSessionId = result.current.session?.id;

    act(() => result.current.start('template'));
    const newSessionId = result.current.session?.id;
    expect(newSessionId).not.toBe(oldSessionId);
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      deferred.resolve({ content: 'A question for the old session?' });
      await Promise.resolve();
    });
    expect(result.current.session?.id).toBe(newSessionId);
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);
  });

  it('aborts active work on unmount', async () => {
    const deferred = makeDeferred();
    let signal: AbortSignal | undefined;
    const streamComplete = vi.fn((_messages, options) => {
      signal = options.signal;
      return deferred.promise;
    });
    const { result, unmount } = renderHook(
      () => useAIResumeInterview(createProvider(streamComplete)),
      { wrapper },
    );
    startWithDraft(result, 'ai', 'Backend engineer');
    await approveAndFlush(result);

    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('uses guide questions without network access when no Provider is configured', () => {
    const streamComplete = vi.fn<AIInterviewProviderClient['streamComplete']>();
    const { result } = renderHook(
      () => useAIResumeInterview(createProvider(streamComplete, null, false)),
      { wrapper },
    );
    act(() => result.current.start('ai'));
    expect(result.current.session?.mode).toBe('template');
    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
    });

    expect(streamComplete).not.toHaveBeenCalled();
    expect(result.current.session?.answers[0]?.text).toBe('Backend engineer');
    expect(result.current.session?.currentQuestion?.source).toBe('template');
  });

  it('keeps the formal Resume Store and browser storage unchanged', () => {
    const streamComplete = vi.fn<AIInterviewProviderClient['streamComplete']>();
    const beforeResume = JSON.stringify(useResumeStore.getState().resume);
    const beforeStorage = localStorage.getItem(RESUME_STORE_PERSIST_KEY);
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'template', 'Private interview-only answer');

    expect(JSON.stringify(useResumeStore.getState().resume)).toBe(beforeResume);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(beforeStorage);
    expect(
      Array.from({ length: localStorage.length })
        .map((_, index) => localStorage.key(index))
        .join(' '),
    ).not.toContain('interview');
  });
});
