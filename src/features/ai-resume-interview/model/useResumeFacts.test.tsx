import { I18nProvider } from '@shared/i18n';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AIInterviewProviderClient, InterviewSession } from './types';
import { useResumeFacts } from './useResumeFacts';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const makeSession = (overrides: Partial<InterviewSession> = {}): InterviewSession => ({
  id: 'session-1',
  generation: 1,
  currentPhase: 'review',
  currentQuestion: null,
  questions: [
    {
      id: 'q-role',
      phase: 'targetRole',
      content: 'What role are you seeking?',
      source: 'template',
      followUpIndex: 0,
      createdAt: 1,
    },
  ],
  answers: [
    {
      id: 'a-role',
      questionId: 'q-role',
      text: 'Backend engineer',
      skipped: false,
      createdAt: 2,
      updatedAt: 2,
    },
  ],
  mode: 'template',
  privacyAcknowledged: false,
  followUpCounts: {},
  followUpRequestCounts: {},
  fallbackUsed: {},
  skippedPhases: [],
  questionSequence: 1,
  status: 'asking',
  requestStatus: 'idle',
  requestId: null,
  providerGeneration: 0,
  previewQuestion: '',
  privacyConsentPending: false,
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
});

const validResponse = {
  facts: [
    {
      kind: 'targetRole',
      sourceQuestionId: 'q-role',
      sourceAnswerId: 'a-role',
      value: 'Backend engineer',
    },
  ],
};

const createProvider = (
  streamComplete: AIInterviewProviderClient['streamComplete'] = vi
    .fn<AIInterviewProviderClient['streamComplete']>()
    .mockResolvedValue({ content: JSON.stringify(validResponse) }),
  configuration?: AIInterviewProviderClient['configuration'],
  isConfigured = true,
): AIInterviewProviderClient => ({
  configuration: configuration ?? {
    baseUrl: 'https://provider.example/v1',
    model: 'test-model',
  },
  isConfigured,
  connectionStatus: isConfigured ? 'ready' : 'not_configured',
  streamComplete,
});

const deferred = () => {
  let resolve!: (value: { content: string }) => void;
  const promise = new Promise<{ content: string }>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

afterEach(() => cleanup());

describe('useResumeFacts', () => {
  it('only calls the provider after an explicit extraction action and keeps candidates unconfirmed', async () => {
    const streamComplete = vi
      .fn<AIInterviewProviderClient['streamComplete']>()
      .mockResolvedValue({ content: JSON.stringify(validResponse) });
    const provider = createProvider(streamComplete);
    const session = makeSession();
    const { result } = renderHook(() => useResumeFacts(session, provider, 'en'), { wrapper });

    expect(streamComplete).not.toHaveBeenCalled();
    await act(async () => result.current.extract());

    expect(streamComplete).toHaveBeenCalledTimes(1);
    expect(streamComplete.mock.calls[0]?.[0][1]?.content).toContain('Backend engineer');
    expect(
      streamComplete.mock.calls[0]?.[0].map((message) => message.content).join(' '),
    ).not.toContain('secret-api-key');
    expect(result.current.facts[0]?.status).toBe('pending');
    expect(result.current.pendingCount).toBe(1);
  });

  it('does not send or write facts when no provider is configured', async () => {
    const streamComplete = vi.fn<AIInterviewProviderClient['streamComplete']>();
    const { result } = renderHook(
      () => useResumeFacts(makeSession(), createProvider(streamComplete, null, false), 'en'),
      { wrapper },
    );

    await act(async () => result.current.extract());

    expect(streamComplete).not.toHaveBeenCalled();
    expect(result.current.facts).toEqual([]);
    expect(result.current.errorCode).toBe('provider_not_configured');
  });

  it('drops a delayed response after provider configuration changes', async () => {
    const request = deferred();
    const firstProvider = createProvider(vi.fn().mockReturnValue(request.promise));
    const secondProvider = createProvider(vi.fn(), {
      baseUrl: 'https://other.example/v1',
      model: 'other-model',
    });
    const props = { session: makeSession(), provider: firstProvider };
    const { result, rerender } = renderHook(
      ({ session, provider }) => useResumeFacts(session, provider, 'en'),
      { initialProps: props, wrapper },
    );

    act(() => void result.current.extract());
    expect(result.current.extractionState).toBe('extracting');
    rerender({ ...props, provider: secondProvider });
    await act(async () => {
      request.resolve({ content: JSON.stringify(validResponse) });
      await request.promise;
    });

    expect(result.current.facts).toEqual([]);
  });

  it('drops a delayed response when a source answer changes during extraction', async () => {
    const request = deferred();
    const provider = createProvider(vi.fn().mockReturnValue(request.promise));
    const originalSession = makeSession();
    const changedSession = makeSession({
      answers: [
        {
          id: 'a-role',
          questionId: 'q-role',
          text: 'Backend and platform engineer',
          skipped: false,
          createdAt: 2,
          updatedAt: 3,
        },
      ],
    });
    const props = { session: originalSession, provider };
    const { result, rerender } = renderHook(
      ({ session, provider: activeProvider }) => useResumeFacts(session, activeProvider, 'en'),
      { initialProps: props, wrapper },
    );

    act(() => void result.current.extract());
    rerender({ ...props, session: changedSession });
    await act(async () => {
      request.resolve({ content: JSON.stringify(validResponse) });
      await request.promise;
    });

    expect(result.current.facts).toEqual([]);
  });

  it('cancels extraction without allowing an abort-ignoring provider response to write', async () => {
    const request = deferred();
    const provider = createProvider(vi.fn().mockReturnValue(request.promise));
    const { result } = renderHook(() => useResumeFacts(makeSession(), provider, 'en'), { wrapper });

    act(() => void result.current.extract());
    act(() => result.current.cancelExtraction());
    await act(async () => {
      request.resolve({ content: JSON.stringify(validResponse) });
      await request.promise;
    });

    expect(result.current.facts).toEqual([]);
    expect(result.current.extractionState).toBe('cancelled');
  });

  it('clears in-memory facts when the interview session restarts', async () => {
    const props = { session: makeSession(), provider: createProvider() };
    const { result, rerender } = renderHook(
      ({ session, provider }) => useResumeFacts(session, provider, 'en'),
      { initialProps: props, wrapper },
    );
    await act(async () => result.current.extract());
    expect(result.current.facts).toHaveLength(1);

    rerender({ ...props, session: makeSession({ id: 'session-2' }) });

    expect(result.current.facts).toEqual([]);
  });

  it('lets the user resolve conflicting values and leaves the competing value rejected', async () => {
    const conflictSession = makeSession({
      questions: [
        ...makeSession().questions,
        {
          id: 'q-role-follow-up',
          phase: 'targetRole',
          content: 'Has your target role changed?',
          source: 'template',
          followUpIndex: 1,
          createdAt: 3,
        },
      ],
      answers: [
        ...makeSession().answers,
        {
          id: 'a-role-follow-up',
          questionId: 'q-role-follow-up',
          text: 'Product manager',
          skipped: false,
          createdAt: 4,
          updatedAt: 4,
        },
      ],
    });
    const response = {
      facts: [
        validResponse.facts[0],
        {
          kind: 'targetRole',
          sourceQuestionId: 'q-role-follow-up',
          sourceAnswerId: 'a-role-follow-up',
          value: 'Product manager',
        },
      ],
    };
    const provider = createProvider(
      vi.fn().mockResolvedValue({ content: JSON.stringify(response) }),
    );
    const { result } = renderHook(() => useResumeFacts(conflictSession, provider, 'en'), {
      wrapper,
    });

    await act(async () => result.current.extract());
    expect(result.current.facts.map((fact) => fact.status)).toEqual(['conflict', 'conflict']);

    act(() => result.current.confirmFact(result.current.facts[0]?.id ?? ''));

    expect(result.current.facts.map((fact) => fact.status)).toEqual(['confirmed', 'rejected']);
  });

  it('resolves a work location field while preserving the other candidate’s independent duties', async () => {
    const workSession = makeSession({
      questions: [
        ...makeSession().questions,
        {
          id: 'q-work-one',
          phase: 'work',
          content: 'Where did you work and what did you do?',
          source: 'template',
          followUpIndex: 0,
          createdAt: 3,
        },
        {
          id: 'q-work-two',
          phase: 'work',
          content: 'Can you clarify the same role?',
          source: 'template',
          followUpIndex: 1,
          createdAt: 5,
        },
      ],
      answers: [
        ...makeSession().answers,
        {
          id: 'a-work-one',
          questionId: 'q-work-one',
          text: 'At Acme I worked as an Engineer in Seattle, where I personally built the reporting API.',
          skipped: false,
          createdAt: 4,
          updatedAt: 4,
        },
        {
          id: 'a-work-two',
          questionId: 'q-work-two',
          text: 'At Acme I worked as an Engineer in Vancouver, where we collaborated on the rollout.',
          skipped: false,
          createdAt: 6,
          updatedAt: 6,
        },
      ],
    });
    const response = {
      facts: [
        {
          kind: 'experience',
          sourceQuestionId: 'q-work-one',
          sourceAnswerId: 'a-work-one',
          value: {
            company: 'Acme',
            role: 'Engineer',
            location: 'Seattle',
            individualResponsibilities: ['I personally built the reporting API'],
          },
        },
        {
          kind: 'experience',
          sourceQuestionId: 'q-work-two',
          sourceAnswerId: 'a-work-two',
          value: {
            company: 'Acme',
            role: 'Engineer',
            location: 'Vancouver',
            teamResponsibilities: ['we collaborated on the rollout'],
          },
        },
      ],
    };
    const provider = createProvider(
      vi.fn().mockResolvedValue({ content: JSON.stringify(response) }),
    );
    const { result } = renderHook(() => useResumeFacts(workSession, provider, 'en'), { wrapper });

    await act(async () => result.current.extract());
    const [selected, competing] = result.current.facts;
    expect(result.current.facts.map((fact) => fact.status)).toEqual(['conflict', 'conflict']);

    act(() => result.current.confirmFact(selected?.id ?? ''));

    expect(result.current.confirmedCount).toBe(1);
    expect(result.current.facts[0]).toMatchObject({
      status: 'confirmed',
      value: {
        location: 'Seattle',
        individualResponsibilities: ['I personally built the reporting API'],
      },
    });
    expect(result.current.facts[1]).toMatchObject({
      status: 'pending',
      sourceAnswerId: 'a-work-two',
      value: {
        company: 'Acme',
        role: 'Engineer',
        teamResponsibilities: ['we collaborated on the rollout'],
      },
    });
    expect((result.current.facts[1]?.value as Record<string, unknown>).location).toBeUndefined();
    expect(competing?.sourceAnswerId).toBe('a-work-two');
  });

  it('does not confirm a fact after its source answer changes', async () => {
    const props = { session: makeSession(), provider: createProvider() };
    const { result, rerender } = renderHook(
      ({ session, provider }) => useResumeFacts(session, provider, 'en'),
      { initialProps: props, wrapper },
    );
    await act(async () => result.current.extract());
    const changedSession = makeSession({
      answers: [
        {
          id: 'a-role',
          questionId: 'q-role',
          text: 'Backend and platform engineer',
          skipped: false,
          createdAt: 2,
          updatedAt: 3,
        },
      ],
    });
    rerender({ ...props, session: changedSession });

    act(() => result.current.confirmFact(result.current.facts[0]?.id ?? ''));

    expect(result.current.facts[0]?.status).toBe('stale');
    expect(result.current.confirmedCount).toBe(0);
  });

  it('rejects malformed model output without storing partial facts', async () => {
    const provider = createProvider(
      vi.fn().mockResolvedValue({
        content: JSON.stringify({
          facts: [{ ...validResponse.facts[0], inventedCompany: 'Fake Ltd' }],
        }),
      }),
    );
    const { result } = renderHook(() => useResumeFacts(makeSession(), provider, 'en'), { wrapper });

    await act(async () => result.current.extract());

    expect(result.current.facts).toEqual([]);
    expect(result.current.extractionState).toBe('failed');
    expect(result.current.errorCode).toBe('invalid_schema');
  });
});
