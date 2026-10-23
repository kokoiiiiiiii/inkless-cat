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
      result.current.setAnswerDraft('I independently built the API.');
      result.current.submitAnswer();
    });
    const originalQuestions = result.current.session?.questions.map((question) => ({
      ...question,
    }));
    const originalAnswers = result.current.session?.answers.map((answer) => ({ ...answer }));
    const originalGeneration = result.current.session?.generation;

    act(() => expect(result.current.editAnswer(firstQuestionId ?? '')).toBe(true));
    expect(result.current.session?.questions).toEqual(originalQuestions);
    expect(result.current.session?.answers).toEqual(originalAnswers);
    expect(result.current.session?.generation).toBe(originalGeneration);
    expect(result.current.pendingEdit?.affectedAnswerCount).toBe(1);

    act(() => result.current.confirmEditAnswer());

    expect(result.current.session?.currentPhase).toBe('targetRole');
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);
    expect(result.current.answerDraft).toBe('Backend engineer');
    expect(result.current.session?.generation).toBe((originalGeneration ?? 0) + 1);
    expect(result.current.pendingEdit).toBeNull();
    expect(result.current.canUndoEdit).toBe(true);
  });

  it('edits normally when no later user answer can be affected', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));
    const firstQuestionId = result.current.session?.currentQuestion?.id;

    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
    });
    const generation = result.current.session?.generation;

    act(() => expect(result.current.editAnswer(firstQuestionId ?? '')).toBe(false));

    expect(result.current.session?.currentPhase).toBe('targetRole');
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);
    expect(result.current.answerDraft).toBe('Backend engineer');
    expect(result.current.session?.generation).toBe((generation ?? 0) + 1);
    expect(result.current.pendingEdit).toBeNull();
    expect(result.current.canUndoEdit).toBe(false);
  });

  it('keeps the full session unchanged until the user confirms an affected branch edit', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));
    const firstQuestionId = result.current.session?.currentQuestion?.id;

    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
      result.current.setAnswerDraft('I independently built the API.');
      result.current.submitAnswer();
    });
    const original = result.current.session;
    const originalQuestions = original?.questions.map((question) => ({ ...question }));
    const originalAnswers = original?.answers.map((answer) => ({ ...answer }));
    const originalGeneration = original?.generation;

    act(() => expect(result.current.editAnswer(firstQuestionId ?? '')).toBe(true));

    expect(result.current.session?.questions).toEqual(originalQuestions);
    expect(result.current.session?.answers).toEqual(originalAnswers);
    expect(result.current.session?.generation).toBe(originalGeneration);
    expect(result.current.pendingEdit).toEqual({
      questionId: firstQuestionId,
      affectedQuestionCount: 2,
      affectedAnswerCount: 1,
    });

    act(() => result.current.cancelEditAnswer());

    expect(result.current.session?.questions).toEqual(originalQuestions);
    expect(result.current.session?.answers).toEqual(originalAnswers);
    expect(result.current.session?.generation).toBe(originalGeneration);
    expect(result.current.pendingEdit).toBeNull();
  });

  it('restores the original session once without writing branch recovery to the Resume Store', () => {
    const beforeResume = JSON.stringify(useResumeStore.getState().resume);
    const beforeStorage = localStorage.getItem(RESUME_STORE_PERSIST_KEY);
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));
    const firstQuestionId = result.current.session?.currentQuestion?.id;
    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
      result.current.setAnswerDraft('I independently built the API.');
      result.current.submitAnswer();
    });
    const originalQuestions = result.current.session?.questions.map((question) => ({
      ...question,
    }));
    const originalAnswers = result.current.session?.answers.map((answer) => ({ ...answer }));
    const originalGeneration = result.current.session?.generation ?? 0;

    act(() => {
      result.current.editAnswer(firstQuestionId ?? '');
      result.current.confirmEditAnswer();
    });

    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);
    expect(result.current.session?.generation).toBe(originalGeneration + 1);
    expect(result.current.answerDraft).toBe('Backend engineer');
    expect(result.current.canUndoEdit).toBe(true);

    act(() => result.current.undoEditAnswer());

    expect(result.current.session?.questions).toEqual(originalQuestions);
    expect(result.current.session?.answers).toEqual(originalAnswers);
    expect(result.current.session?.generation).toBe(originalGeneration + 2);
    expect(result.current.canUndoEdit).toBe(false);
    expect(JSON.stringify(useResumeStore.getState().resume)).toBe(beforeResume);
    expect(localStorage.getItem(RESUME_STORE_PERSIST_KEY)).toBe(beforeStorage);
  });

  it('invalidates local branch recovery when a new session replaces it', () => {
    const { result } = renderHook(() => useAIResumeInterview(createProvider()), { wrapper });
    act(() => result.current.start('template'));
    const questionId = result.current.session?.currentQuestion?.id;
    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
      result.current.setAnswerDraft('I built the API.');
      result.current.submitAnswer();
      result.current.editAnswer(questionId ?? '');
      result.current.confirmEditAnswer();
    });
    expect(result.current.canUndoEdit).toBe(true);

    act(() => result.current.start('template'));
    const newSessionId = result.current.session?.id;
    act(() => result.current.undoEditAnswer());

    expect(result.current.session?.id).toBe(newSessionId);
    expect(result.current.session?.answers).toHaveLength(0);
    expect(result.current.canUndoEdit).toBe(false);
  });

  it('invalidates branch recovery when the provider changes', async () => {
    let activeProvider = createProvider();
    const { result, rerender } = renderHook(() => useAIResumeInterview(activeProvider), {
      wrapper,
    });
    act(() => result.current.start('template'));
    const questionId = result.current.session?.currentQuestion?.id;
    act(() => {
      result.current.setAnswerDraft('Backend engineer');
      result.current.submitAnswer();
      result.current.setAnswerDraft('I built the API.');
      result.current.submitAnswer();
      result.current.editAnswer(questionId ?? '');
      result.current.confirmEditAnswer();
    });
    expect(result.current.canUndoEdit).toBe(true);

    activeProvider = createProvider(vi.fn(), {
      baseUrl: 'https://other.example/v1',
      model: 'new-model',
    });
    rerender();
    await waitFor(() => expect(result.current.session?.error?.code).toBe('provider_changed'));
    act(() => result.current.undoEditAnswer());

    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);
    expect(result.current.session?.error?.code).toBe('provider_changed');
    expect(result.current.canUndoEdit).toBe(false);
  });

  it('restores answer history without reviving a request from the recovered branch', async () => {
    const staleRequest = makeDeferred();
    let staleSignal: AbortSignal | undefined;
    const streamComplete = vi
      .fn<AIInterviewProviderClient['streamComplete']>()
      .mockResolvedValueOnce({ content: 'Which part did you personally own?' })
      .mockImplementationOnce((_messages, options) => {
        staleSignal = options.signal;
        return staleRequest.promise;
      });
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'Backend engineer');
    const questionId = result.current.session?.currentQuestion?.id;
    await approveAndFlush(result);
    await waitFor(() => expect(result.current.session?.questions).toHaveLength(2));
    act(() => {
      result.current.setAnswerDraft('I worked with the MES team.');
      result.current.submitAnswer();
    });
    await waitFor(() => expect(streamComplete).toHaveBeenCalledTimes(2));
    const oldQuestions = result.current.session?.questions.map((question) => ({ ...question }));
    const oldAnswers = result.current.session?.answers.map((answer) => ({ ...answer }));

    act(() => {
      result.current.editAnswer(questionId ?? '');
      result.current.confirmEditAnswer();
    });
    expect(staleSignal?.aborted).toBe(true);
    act(() => result.current.undoEditAnswer());

    expect(result.current.session?.questions).toEqual(oldQuestions);
    expect(result.current.session?.answers).toEqual(oldAnswers);
    expect(result.current.session?.requestId).toBeNull();
    expect(result.current.session?.requestStatus).toBe('cancelled');
    expect(result.current.session?.status).toBe('asking');

    await act(async () => {
      staleRequest.resolve({ content: 'Stale request must not return?' });
      await Promise.resolve();
    });
    expect(result.current.session?.questions).toEqual(oldQuestions);
    expect(result.current.session?.currentQuestion?.content).not.toContain('Stale request');
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
    expect(result.current.session?.followUpCounts.targetRole ?? 0).toBe(0);
    expect(result.current.session?.followUpRequestCounts.targetRole).toBe(1);
    expect(streamComplete).toHaveBeenCalledTimes(1);

    for (let attempt = 2; attempt <= 4; attempt += 1) {
      act(() => result.current.retryQuestion());
      await waitFor(() => expect(streamComplete).toHaveBeenCalledTimes(attempt));
      await waitFor(() => expect(result.current.session?.error?.code).toBe('provider_error'));
      expect(result.current.session?.followUpRequestCounts.targetRole).toBe(attempt);
      expect(result.current.session?.followUpCounts.targetRole ?? 0).toBe(0);
    }
    act(() => result.current.retryQuestion());
    expect(streamComplete).toHaveBeenCalledTimes(4);
  });

  it('waits for a branch-edit confirmation before aborting AI and excludes stale answers from the new prompt', async () => {
    const lateRequest = makeDeferred();
    const replacementRequest = makeDeferred();
    let requestIndex = 0;
    let lateSignal: AbortSignal | undefined;
    const streamComplete = vi.fn<AIInterviewProviderClient['streamComplete']>(
      (messages, options) => {
        const index = requestIndex++;
        if (index === 0) return Promise.resolve({ content: 'Which part did you personally own?' });
        if (index === 1) {
          lateSignal = options.signal;
          return lateRequest.promise;
        }
        if (index === 2) return replacementRequest.promise;
        return Promise.resolve({ content: 'Which result can you describe?' });
      },
    );
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'Backend engineer');
    const targetRoleQuestionId = result.current.session?.currentQuestion?.id;
    await approveAndFlush(result);
    await waitFor(() => expect(result.current.session?.questions).toHaveLength(2));

    act(() => {
      result.current.setAnswerDraft('I worked with the MES team on integration.');
      result.current.submitAnswer();
    });
    await waitFor(() => expect(streamComplete).toHaveBeenCalledTimes(2));
    const originalQuestions = result.current.session?.questions.map((question) => ({
      ...question,
    }));
    const originalAnswers = result.current.session?.answers.map((answer) => ({ ...answer }));
    const originalGeneration = result.current.session?.generation;

    act(() => expect(result.current.editAnswer(targetRoleQuestionId ?? '')).toBe(true));

    expect(lateSignal?.aborted).toBe(false);
    expect(result.current.session?.questions).toEqual(originalQuestions);
    expect(result.current.session?.answers).toEqual(originalAnswers);
    expect(result.current.session?.generation).toBe(originalGeneration);

    act(() => result.current.confirmEditAnswer());
    expect(lateSignal?.aborted).toBe(true);
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.answers).toHaveLength(0);

    act(() => {
      result.current.setAnswerDraft('Site reliability engineer');
      result.current.submitAnswer();
    });
    await waitFor(() => expect(streamComplete).toHaveBeenCalledTimes(3));
    const newPrompt = streamComplete.mock.calls[2]?.[0]?.[1]?.content ?? '';
    expect(newPrompt).toContain('Site reliability engineer');
    expect(newPrompt).not.toContain('MES team on integration');

    await act(async () => {
      lateRequest.resolve({ content: 'Stale question from the removed branch?' });
      await Promise.resolve();
    });
    expect(result.current.session?.questions).toHaveLength(1);
    expect(result.current.session?.questions.at(-1)?.content).not.toContain('Stale question');
    act(() => result.current.cancelGeneration());
  });

  it('recounts successful follow-ups from the retained branch without resetting request limits', async () => {
    const streamComplete = vi
      .fn<AIInterviewProviderClient['streamComplete']>()
      .mockResolvedValueOnce({ content: 'Which part did you personally own?' })
      .mockResolvedValueOnce({ content: 'How did you coordinate the shared work?' })
      .mockResolvedValueOnce({ content: 'Which result can you describe?' });
    const { result } = renderHook(() => useAIResumeInterview(createProvider(streamComplete)), {
      wrapper,
    });
    startWithDraft(result, 'ai', 'Backend engineer');
    const targetRoleQuestionId = result.current.session?.currentQuestion?.id;
    await approveAndFlush(result);
    await waitFor(() => expect(result.current.session?.questions).toHaveLength(2));

    act(() => {
      result.current.setAnswerDraft('I coordinated the shared team work.');
      result.current.submitAnswer();
    });
    await waitFor(() => expect(result.current.session?.questions).toHaveLength(3));
    expect(result.current.session?.followUpCounts.targetRole).toBe(2);
    expect(result.current.session?.followUpRequestCounts.targetRole).toBe(2);

    act(() => {
      result.current.editAnswer(targetRoleQuestionId ?? '');
      result.current.confirmEditAnswer();
    });
    expect(result.current.session?.followUpCounts.targetRole ?? 0).toBe(0);
    expect(result.current.session?.followUpRequestCounts.targetRole).toBe(2);

    act(() => {
      result.current.setAnswerDraft('Senior backend engineer');
      result.current.submitAnswer();
    });
    await waitFor(() => expect(result.current.session?.questions).toHaveLength(2));
    expect(result.current.session?.questions.at(-1)?.content).toBe(
      'Which result can you describe?',
    );
    expect(result.current.session?.followUpCounts.targetRole).toBe(1);
    expect(result.current.session?.followUpRequestCounts.targetRole).toBe(3);
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
