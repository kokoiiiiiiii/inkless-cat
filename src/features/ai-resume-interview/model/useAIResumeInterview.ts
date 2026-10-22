import { ProviderError } from '@shared/api/ai';
import { useI18n } from '@shared/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';

import { buildInterviewPrompt, MAX_INTERVIEW_ANSWER_CODE_UNITS } from '../lib/buildInterviewPrompt';
import { getInterviewProgress } from '../lib/interviewProgress';
import {
  createRuleQuestion,
  getNextInterviewPhase,
  localizeInterviewQuestion,
  MAX_AI_FOLLOW_UPS_PER_PHASE,
  MAX_AI_REQUEST_ATTEMPTS_PER_PHASE,
} from '../lib/interviewRules';
import {
  MAX_INTERVIEW_QUESTION_CODE_UNITS,
  validateInterviewQuestion,
} from '../lib/validateInterviewQuestion';
import type {
  AIInterviewProviderClient,
  InterviewAnswer,
  InterviewError,
  InterviewQuestion,
  InterviewSession,
} from './types';
import { INTERVIEW_PHASES } from './types';

type ActiveRequest = {
  id: number;
  sessionId: string;
  sessionGeneration: number;
  providerGeneration: number;
  providerConfiguration: AIInterviewProviderClient['configuration'];
  controller: AbortController;
};

export type PendingInterviewEdit = {
  questionId: string;
  affectedQuestionCount: number;
  affectedAnswerCount: number;
};

type EditRecoverySnapshot = {
  session: InterviewSession;
  answerDraft: string;
  providerGeneration: number;
  providerConfiguration: AIInterviewProviderClient['configuration'];
  branchGeneration: number;
};

export type AIResumeInterviewController = {
  session: InterviewSession | null;
  progress: ReturnType<typeof getInterviewProgress> | null;
  answerDraft: string;
  pendingEdit: PendingInterviewEdit | null;
  canUndoEdit: boolean;
  setAnswerDraft: (value: string) => void;
  start: (mode: 'ai' | 'template') => void;
  submitAnswer: () => void;
  skipQuestion: () => void;
  skipPhase: () => void;
  nextPhase: () => void;
  editAnswer: (questionId: string) => boolean;
  cancelEditAnswer: () => void;
  confirmEditAnswer: () => void;
  undoEditAnswer: () => void;
  approvePrivacyAndSend: () => void;
  continueWithTemplate: () => void;
  retryQuestion: () => void;
  cancelGeneration: () => void;
  cancelInterview: () => void;
  finishInterview: () => void;
  pause: () => void;
};

const getSessionId = (sequence: number) => {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `interview-${Date.now()}-${sequence}`;
  } catch {
    return `interview-${Date.now()}-${sequence}`;
  }
};

const getProviderError = (error: unknown): InterviewError => {
  if (error instanceof ProviderError) {
    return {
      code: 'provider_error',
      providerErrorCode: error.code,
      ...(error.statusCode === undefined ? {} : { providerStatusCode: error.statusCode }),
    };
  }
  return { code: 'provider_error' };
};

export const useAIResumeInterview = (
  provider: AIInterviewProviderClient,
): AIResumeInterviewController => {
  const { t, locale, dictionaryRevision } = useI18n();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const sessionRef = useRef<InterviewSession | null>(null);
  const [answerDraft, setAnswerDraftState] = useState('');
  const answerDraftRef = useRef('');
  const [pendingEdit, setPendingEditState] = useState<PendingInterviewEdit | null>(null);
  const pendingEditRef = useRef<PendingInterviewEdit | null>(null);
  const [canUndoEdit, setCanUndoEdit] = useState(false);
  const editRecoveryRef = useRef<EditRecoverySnapshot | null>(null);
  const activeRequestRef = useRef<ActiveRequest | null>(null);
  const sessionSequence = useRef(0);
  const requestSequence = useRef(0);
  const providerGenerationRef = useRef(0);
  const providerConfigurationRef = useRef(provider.configuration);
  const pendingConsentConfigurationRef = useRef(provider.configuration);
  const previousLocaleRef = useRef(locale);
  const previewBufferRef = useRef<{ requestId: number; parts: string[] } | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const updateSession = useCallback(
    (
      next:
        | InterviewSession
        | null
        | ((current: InterviewSession | null) => InterviewSession | null),
    ) => {
      const resolved = typeof next === 'function' ? next(sessionRef.current) : next;
      sessionRef.current = resolved;
      setSession(resolved);
    },
    [],
  );

  const setPendingEdit = useCallback((next: PendingInterviewEdit | null) => {
    pendingEditRef.current = next;
    setPendingEditState(next);
  }, []);

  const clearEditRecovery = useCallback(() => {
    editRecoveryRef.current = null;
    setCanUndoEdit(false);
  }, []);

  const setAnswerDraft = useCallback((value: string) => {
    answerDraftRef.current = value;
    setAnswerDraftState(value);
  }, []);

  useEffect(() => {
    if (previousLocaleRef.current === locale) return;
    previousLocaleRef.current = locale;
    setPendingEdit(null);
    clearEditRecovery();
    updateSession((current) => {
      if (!current) return current;
      const questions = current.questions.map((question) => localizeInterviewQuestion(question, t));
      const byId = new Map(questions.map((question) => [question.id, question]));
      const currentQuestion = current.currentQuestion
        ? (byId.get(current.currentQuestion.id) ?? current.currentQuestion)
        : null;
      if (
        questions.every((question, index) => question === current.questions[index]) &&
        currentQuestion === current.currentQuestion
      ) {
        return current;
      }
      return { ...current, questions, currentQuestion, updatedAt: Date.now() };
    });
  }, [clearEditRecovery, dictionaryRevision, locale, setPendingEdit, t, updateSession]);

  const clearPreview = useCallback(() => {
    if (previewTimerRef.current !== null) {
      globalThis.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    previewBufferRef.current = null;
  }, []);

  const abortActiveRequest = useCallback(() => {
    requestSequence.current += 1;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    clearPreview();
  }, [clearPreview]);

  const cancelGeneration = useCallback(() => {
    const active = activeRequestRef.current;
    if (!active) return;
    abortActiveRequest();
    updateSession((current) =>
      current?.id === active.sessionId && current.generation === active.sessionGeneration
        ? {
            ...current,
            status: 'asking',
            requestStatus: 'cancelled',
            requestId: null,
            previewQuestion: '',
            error: undefined,
            updatedAt: Date.now(),
          }
        : current,
    );
  }, [abortActiveRequest, updateSession]);

  const makeQuestion = useCallback(
    (
      sessionValue: InterviewSession,
      content: string,
      source: 'template' | 'ai',
      followUpIndex = 0,
    ) =>
      ({
        id: `${sessionValue.id}:question:${sessionValue.questionSequence + 1}`,
        phase: sessionValue.currentPhase,
        content,
        source,
        followUpIndex,
        ...(source === 'template'
          ? { ruleKind: followUpIndex === 0 ? 'fallback' : 'initial' }
          : {}),
        createdAt: Date.now(),
      }) satisfies InterviewQuestion,
    [],
  );

  const advanceToNextPhase = useCallback(
    (current: InterviewSession, options?: { skipped?: boolean }) => {
      const now = Date.now();
      const nextPhase = getNextInterviewPhase(current.currentPhase);
      const skippedPhases =
        options?.skipped &&
        !current.answers.some((answer) => {
          const answeredQuestion = current.questions.find(
            (question) => question.id === answer.questionId,
          );
          return answeredQuestion?.phase === current.currentPhase && !answer.skipped;
        })
          ? [...new Set([...current.skippedPhases, current.currentPhase])]
          : current.skippedPhases;

      if (!nextPhase) {
        return {
          ...current,
          currentPhase: 'review' as const,
          currentQuestion: null,
          skippedPhases,
          status: 'asking' as const,
          requestStatus: 'idle' as const,
          requestId: null,
          previewQuestion: '',
          privacyConsentPending: false,
          error: undefined,
          updatedAt: now,
        };
      }
      if (nextPhase === 'review') {
        return {
          ...current,
          currentPhase: nextPhase,
          currentQuestion: null,
          skippedPhases,
          status: 'asking' as const,
          requestStatus: 'idle' as const,
          requestId: null,
          previewQuestion: '',
          privacyConsentPending: false,
          error: undefined,
          updatedAt: now,
        };
      }

      const nextQuestion = createRuleQuestion({
        sessionId: current.id,
        sequence: current.questionSequence + 1,
        phase: nextPhase,
        kind: 'initial',
        translate: t,
        now,
      });
      return {
        ...current,
        currentPhase: nextPhase,
        currentQuestion: nextQuestion,
        questions: [...current.questions, nextQuestion],
        questionSequence: current.questionSequence + 1,
        skippedPhases,
        status: 'asking' as const,
        requestStatus: 'idle' as const,
        requestId: null,
        previewQuestion: '',
        privacyConsentPending: false,
        error: undefined,
        updatedAt: now,
      };
    },
    [t],
  );

  const advanceWithTemplate = useCallback(
    (current: InterviewSession) => {
      if (current.currentPhase === 'review') return current;
      if (!current.fallbackUsed[current.currentPhase]) {
        const question = createRuleQuestion({
          sessionId: current.id,
          sequence: current.questionSequence + 1,
          phase: current.currentPhase,
          kind: 'fallback',
          translate: t,
        });
        return {
          ...current,
          questions: [...current.questions, question],
          currentQuestion: question,
          questionSequence: current.questionSequence + 1,
          fallbackUsed: { ...current.fallbackUsed, [current.currentPhase]: true },
          status: 'asking' as const,
          requestStatus: 'idle' as const,
          requestId: null,
          previewQuestion: '',
          privacyConsentPending: false,
          error: undefined,
          updatedAt: Date.now(),
        };
      }
      return advanceToNextPhase(current);
    },
    [advanceToNextPhase, t],
  );

  const generateQuestion = useCallback(
    async (base: InterviewSession) => {
      if (!provider.isConfigured || !provider.configuration) {
        updateSession((current) =>
          current?.id === base.id && current.generation === base.generation
            ? {
                ...current,
                status: 'error',
                requestStatus: 'failed',
                requestId: null,
                error: { code: 'provider_not_configured' },
                updatedAt: Date.now(),
              }
            : current,
        );
        return;
      }
      if (
        (base.followUpRequestCounts[base.currentPhase] ?? 0) >= MAX_AI_REQUEST_ATTEMPTS_PER_PHASE
      ) {
        return;
      }
      const currentQuestion = base.currentQuestion;
      if (!currentQuestion) return;

      abortActiveRequest();
      const requestId = ++requestSequence.current;
      const controller = new AbortController();
      const providerGeneration = providerGenerationRef.current;
      const active: ActiveRequest = {
        id: requestId,
        sessionId: base.id,
        sessionGeneration: base.generation,
        providerGeneration,
        providerConfiguration: provider.configuration,
        controller,
      };
      activeRequestRef.current = active;
      previewBufferRef.current = { requestId, parts: [] };
      const targetRole = base.answers
        .map((answer) => ({
          answer,
          question: base.questions.find((question) => question.id === answer.questionId),
        }))
        .find(({ answer, question }) => question?.phase === 'targetRole' && !answer.skipped)
        ?.answer?.text;

      const requesting = {
        ...base,
        followUpRequestCounts: {
          ...base.followUpRequestCounts,
          [base.currentPhase]: (base.followUpRequestCounts[base.currentPhase] ?? 0) + 1,
        },
        status: 'generating_question' as const,
        requestStatus: 'streaming' as const,
        requestId,
        providerGeneration,
        previewQuestion: '',
        error: undefined,
        updatedAt: Date.now(),
      };
      updateSession(requesting);

      try {
        const promptQuestions = base.questions.map((question) =>
          localizeInterviewQuestion(question, t),
        );
        const result = await provider.streamComplete(
          buildInterviewPrompt({
            phase: base.currentPhase,
            locale,
            targetRole: targetRole ?? '',
            currentQuestion: localizeInterviewQuestion(currentQuestion, t),
            questions: promptQuestions,
            answers: base.answers,
          }),
          {
            signal: controller.signal,
            maxOutputCodeUnits: MAX_INTERVIEW_QUESTION_CODE_UNITS + 16,
            onDelta: (delta) => {
              const buffer = previewBufferRef.current;
              const currentActive = activeRequestRef.current;
              if (
                !delta ||
                controller.signal.aborted ||
                currentActive?.id !== requestId ||
                sessionRef.current?.id !== base.id ||
                sessionRef.current.generation !== base.generation ||
                buffer?.requestId !== requestId
              ) {
                return;
              }
              buffer.parts.push(delta);
              if (previewTimerRef.current === null) {
                previewTimerRef.current = globalThis.setTimeout(() => {
                  previewTimerRef.current = null;
                  const activeNow = activeRequestRef.current;
                  const bufferNow = previewBufferRef.current;
                  if (
                    activeNow?.id !== requestId ||
                    bufferNow?.requestId !== requestId ||
                    sessionRef.current?.id !== base.id ||
                    sessionRef.current.generation !== base.generation ||
                    controller.signal.aborted
                  ) {
                    return;
                  }
                  const previewQuestion = bufferNow.parts.join('');
                  updateSession((current) =>
                    current?.id === base.id && current.generation === base.generation
                      ? { ...current, previewQuestion }
                      : current,
                  );
                }, 50);
              }
            },
          },
        );

        const activeNow = activeRequestRef.current;
        const currentSession = sessionRef.current;
        const providerChanged =
          providerGenerationRef.current !== providerGeneration ||
          provider.configuration !== active.providerConfiguration;
        if (
          activeNow?.id !== requestId ||
          currentSession?.id !== base.id ||
          currentSession.generation !== base.generation
        ) {
          return;
        }
        if (providerChanged) {
          activeRequestRef.current = null;
          clearPreview();
          updateSession((current) =>
            current?.id === base.id
              ? {
                  ...current,
                  status: 'error',
                  requestStatus: 'cancelled',
                  requestId: null,
                  mode: provider.isConfigured ? 'undecided' : 'template',
                  privacyAcknowledged: false,
                  privacyConsentPending: false,
                  previewQuestion: '',
                  error: { code: 'provider_changed' },
                  updatedAt: Date.now(),
                }
              : current,
          );
          return;
        }

        if (previewTimerRef.current !== null) {
          globalThis.clearTimeout(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        const preview = previewBufferRef.current?.parts.join('') ?? '';
        updateSession((current) =>
          current?.id === base.id && current.generation === base.generation
            ? { ...current, requestStatus: 'validating', previewQuestion: preview }
            : current,
        );
        const validation = validateInterviewQuestion(result.content);
        if (!validation.ok) {
          activeRequestRef.current = null;
          clearPreview();
          updateSession((current) =>
            current?.id === base.id && current.generation === base.generation
              ? {
                  ...current,
                  status: 'error',
                  requestStatus: 'failed',
                  requestId: null,
                  previewQuestion: '',
                  error: { code: 'invalid_question' },
                  updatedAt: Date.now(),
                }
              : current,
          );
          return;
        }

        activeRequestRef.current = null;
        clearPreview();
        const followUpIndex = (base.followUpCounts[base.currentPhase] ?? 0) + 1;
        const nextQuestion = makeQuestion(base, validation.question, 'ai', followUpIndex);
        updateSession((current) =>
          current?.id === base.id && current.generation === base.generation
            ? {
                ...current,
                followUpCounts: {
                  ...current.followUpCounts,
                  [base.currentPhase]: (current.followUpCounts[base.currentPhase] ?? 0) + 1,
                },
                questions: [...current.questions, nextQuestion],
                currentQuestion: nextQuestion,
                questionSequence: current.questionSequence + 1,
                status: 'asking',
                requestStatus: 'completed',
                requestId: null,
                previewQuestion: '',
                error: undefined,
                updatedAt: Date.now(),
              }
            : current,
        );
      } catch (error) {
        const activeNow = activeRequestRef.current;
        const currentSession = sessionRef.current;
        if (
          activeNow?.id !== requestId ||
          currentSession?.id !== base.id ||
          currentSession.generation !== base.generation
        ) {
          return;
        }
        activeRequestRef.current = null;
        clearPreview();
        const changed =
          providerGenerationRef.current !== providerGeneration ||
          provider.configuration !== active.providerConfiguration;
        const cancelled = error instanceof ProviderError && error.code === 'cancelled';
        updateSession((current) =>
          current?.id === base.id && current.generation === base.generation
            ? {
                ...current,
                status: changed ? 'error' : cancelled ? 'cancelled' : 'error',
                requestStatus: cancelled || changed ? 'cancelled' : 'failed',
                requestId: null,
                mode: changed ? (provider.isConfigured ? 'undecided' : 'template') : current.mode,
                privacyAcknowledged: changed ? false : current.privacyAcknowledged,
                privacyConsentPending: false,
                previewQuestion: '',
                error: changed
                  ? { code: 'provider_changed' }
                  : cancelled
                    ? undefined
                    : getProviderError(error),
                updatedAt: Date.now(),
              }
            : current,
        );
      } finally {
        if (activeRequestRef.current?.id === requestId) activeRequestRef.current = null;
      }
    },
    [abortActiveRequest, clearPreview, locale, makeQuestion, provider, t, updateSession],
  );

  const continueAfterAnswer = useCallback(
    (current: InterviewSession) => {
      if (current.currentPhase === 'review') return current;
      if (current.mode === 'ai' && provider.isConfigured) {
        const followUps = current.followUpCounts[current.currentPhase] ?? 0;
        if (followUps < MAX_AI_FOLLOW_UPS_PER_PHASE) {
          if (
            (current.followUpRequestCounts[current.currentPhase] ?? 0) >=
            MAX_AI_REQUEST_ATTEMPTS_PER_PHASE
          ) {
            return advanceWithTemplate(current);
          }
          void generateQuestion(current);
          return current;
        }
        return advanceToNextPhase(current);
      }
      return advanceWithTemplate(current);
    },
    [advanceToNextPhase, advanceWithTemplate, generateQuestion, provider.isConfigured],
  );

  const start = useCallback(
    (mode: 'ai' | 'template') => {
      abortActiveRequest();
      setPendingEdit(null);
      clearEditRecovery();
      sessionSequence.current += 1;
      const id = getSessionId(sessionSequence.current);
      const firstQuestion = createRuleQuestion({
        sessionId: id,
        sequence: 1,
        phase: 'targetRole',
        kind: 'initial',
        translate: t,
      });
      const now = Date.now();
      updateSession({
        id,
        generation: sessionSequence.current,
        currentPhase: 'targetRole',
        currentQuestion: firstQuestion,
        questions: [firstQuestion],
        answers: [],
        mode: mode === 'ai' && provider.isConfigured ? 'undecided' : 'template',
        privacyAcknowledged: false,
        followUpCounts: {},
        followUpRequestCounts: {},
        fallbackUsed: {},
        skippedPhases: [],
        questionSequence: 1,
        status: 'asking',
        requestStatus: 'idle',
        requestId: null,
        providerGeneration: providerGenerationRef.current,
        previewQuestion: '',
        privacyConsentPending: false,
        createdAt: now,
        updatedAt: now,
      });
      setAnswerDraft('');
    },
    [
      abortActiveRequest,
      clearEditRecovery,
      provider.isConfigured,
      setAnswerDraft,
      setPendingEdit,
      t,
      updateSession,
    ],
  );

  const submitAnswer = useCallback(() => {
    const current = sessionRef.current;
    const question = current?.currentQuestion;
    if (
      !current ||
      !question ||
      current.status === 'generating_question' ||
      current.requestStatus === 'streaming' ||
      current.requestStatus === 'validating' ||
      current.answers.some((answer) => answer.questionId === question.id)
    ) {
      return;
    }
    const rawText = answerDraftRef.current;
    if (rawText.length > MAX_INTERVIEW_ANSWER_CODE_UNITS) return;
    const text = rawText.trim();
    if (!text) return;
    clearEditRecovery();
    const now = Date.now();
    const answer: InterviewAnswer = {
      id: `${question.id}:answer`,
      questionId: question.id,
      text,
      skipped: false,
      createdAt: now,
      updatedAt: now,
    };
    const answered = {
      ...current,
      answers: [...current.answers, answer],
      status: 'answering' as const,
      updatedAt: now,
    };
    updateSession(answered);
    setAnswerDraft('');

    if (answered.mode === 'undecided' && provider.isConfigured) {
      pendingConsentConfigurationRef.current = provider.configuration;
      updateSession({ ...answered, privacyConsentPending: true, updatedAt: Date.now() });
      return;
    }
    const next = continueAfterAnswer(answered);
    if (next !== answered) updateSession(next);
  }, [
    continueAfterAnswer,
    clearEditRecovery,
    provider.configuration,
    provider.isConfigured,
    setAnswerDraft,
    updateSession,
  ]);

  const approvePrivacyAndSend = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.privacyConsentPending) return;
    if (
      !provider.isConfigured ||
      !provider.configuration ||
      provider.configuration !== pendingConsentConfigurationRef.current
    ) {
      updateSession((active) =>
        active?.id === current.id
          ? {
              ...active,
              mode: provider.isConfigured ? 'undecided' : 'template',
              privacyConsentPending: false,
              status: 'error',
              requestStatus: 'cancelled',
              error: { code: 'provider_changed' },
              updatedAt: Date.now(),
            }
          : active,
      );
      return;
    }
    const allowed = {
      ...current,
      mode: 'ai' as const,
      privacyAcknowledged: true,
      privacyConsentPending: false,
    };
    updateSession(allowed);
    continueAfterAnswer(allowed);
  }, [continueAfterAnswer, provider.configuration, provider.isConfigured, updateSession]);

  const continueWithTemplate = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    clearEditRecovery();
    abortActiveRequest();
    const withTemplate = {
      ...current,
      mode: 'template' as const,
      privacyConsentPending: false,
      status: 'asking' as const,
      requestStatus: 'idle' as const,
      requestId: null,
      previewQuestion: '',
      error: undefined,
      updatedAt: Date.now(),
    };
    updateSession(advanceWithTemplate(withTemplate));
  }, [abortActiveRequest, advanceWithTemplate, clearEditRecovery, updateSession]);

  const retryQuestion = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.currentPhase === 'review' || !current.currentQuestion) return;
    if (
      current.status === 'generating_question' ||
      current.requestStatus === 'streaming' ||
      current.requestStatus === 'validating'
    ) {
      return;
    }
    const hasLatestAnswer = current.answers.some(
      (answer) => answer.questionId === current.currentQuestion?.id && !answer.skipped,
    );
    if (!hasLatestAnswer) return;
    if (current.mode !== 'ai' || !current.privacyAcknowledged) {
      pendingConsentConfigurationRef.current = provider.configuration;
      updateSession({ ...current, privacyConsentPending: true, status: 'answering' });
      return;
    }
    if (
      (current.followUpCounts[current.currentPhase] ?? 0) >= MAX_AI_FOLLOW_UPS_PER_PHASE ||
      (current.followUpRequestCounts[current.currentPhase] ?? 0) >=
        MAX_AI_REQUEST_ATTEMPTS_PER_PHASE
    ) {
      return;
    }
    clearEditRecovery();
    void generateQuestion(current);
  }, [clearEditRecovery, generateQuestion, provider.configuration, updateSession]);

  const skipQuestion = useCallback(() => {
    const current = sessionRef.current;
    const question = current?.currentQuestion;
    if (!current || !question || current.currentPhase === 'review') return;
    clearEditRecovery();
    abortActiveRequest();
    const alreadyAnswered = current.answers.some((answer) => answer.questionId === question.id);
    const skipped = alreadyAnswered
      ? current
      : {
          ...current,
          answers: [
            ...current.answers,
            {
              id: `${question.id}:answer`,
              questionId: question.id,
              text: '',
              skipped: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        };
    const ready = {
      ...skipped,
      status: 'asking' as const,
      requestStatus: 'idle' as const,
      requestId: null,
      privacyConsentPending: false,
      previewQuestion: '',
      error: undefined,
      updatedAt: Date.now(),
    };
    updateSession(advanceWithTemplate(ready));
  }, [abortActiveRequest, advanceWithTemplate, clearEditRecovery, updateSession]);

  const skipPhase = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    clearEditRecovery();
    if (current.currentPhase === 'review') {
      updateSession({ ...current, status: 'completed', updatedAt: Date.now() });
      return;
    }
    abortActiveRequest();
    const question = current.currentQuestion;
    const alreadyAnswered =
      question && current.answers.some((answer) => answer.questionId === question.id);
    const skipped =
      question && !alreadyAnswered
        ? {
            ...current,
            answers: [
              ...current.answers,
              {
                id: `${question.id}:answer`,
                questionId: question.id,
                text: '',
                skipped: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
          }
        : current;
    updateSession(
      advanceToNextPhase(
        {
          ...skipped,
          status: 'asking',
          requestStatus: 'idle',
          requestId: null,
          privacyConsentPending: false,
          previewQuestion: '',
          error: undefined,
          updatedAt: Date.now(),
        },
        { skipped: true },
      ),
    );
  }, [abortActiveRequest, advanceToNextPhase, clearEditRecovery, updateSession]);

  const nextPhase = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    clearEditRecovery();
    if (current.currentPhase === 'review') {
      updateSession({
        ...current,
        status: 'completed',
        requestStatus: 'completed',
        updatedAt: Date.now(),
      });
      return;
    }
    abortActiveRequest();
    const question = current.currentQuestion;
    const alreadyAnswered =
      question && current.answers.some((answer) => answer.questionId === question.id);
    const next =
      question && !alreadyAnswered
        ? {
            ...current,
            answers: [
              ...current.answers,
              {
                id: `${question.id}:answer`,
                questionId: question.id,
                text: '',
                skipped: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
          }
        : current;
    updateSession(
      advanceToNextPhase({
        ...next,
        status: 'asking',
        requestStatus: 'idle',
        requestId: null,
        privacyConsentPending: false,
        previewQuestion: '',
        error: undefined,
        updatedAt: Date.now(),
      }),
    );
  }, [abortActiveRequest, advanceToNextPhase, clearEditRecovery, updateSession]);

  const applyEditAnswer = useCallback(
    (questionId: string, saveRecovery: boolean) => {
      const current = sessionRef.current;
      if (!current) return;
      const questionIndex = current.questions.findIndex((question) => question.id === questionId);
      const answerIndex = current.answers.findIndex((answer) => answer.questionId === questionId);
      const question = current.questions[questionIndex];
      if (!question || answerIndex === -1) return;
      const answer = current.answers[answerIndex];
      if (!answer) return;
      const nextGeneration = current.generation + 1;
      const existingRecovery = editRecoveryRef.current;
      const canPreserveRecovery = Boolean(
        existingRecovery &&
          existingRecovery.session.id === current.id &&
          existingRecovery.branchGeneration === current.generation &&
          existingRecovery.providerGeneration === providerGenerationRef.current &&
          existingRecovery.providerConfiguration === provider.configuration,
      );
      if (canPreserveRecovery && existingRecovery) {
        editRecoveryRef.current = { ...existingRecovery, branchGeneration: nextGeneration };
        setCanUndoEdit(true);
      } else if (saveRecovery) {
        editRecoveryRef.current = {
          session: {
            ...current,
            questions: current.questions.map((item) => ({ ...item })),
            answers: current.answers.map((item) => ({ ...item })),
            followUpCounts: { ...current.followUpCounts },
            followUpRequestCounts: { ...current.followUpRequestCounts },
            fallbackUsed: { ...current.fallbackUsed },
            skippedPhases: [...current.skippedPhases],
          },
          answerDraft: answerDraftRef.current,
          providerGeneration: providerGenerationRef.current,
          providerConfiguration: provider.configuration,
          branchGeneration: nextGeneration,
        };
        setCanUndoEdit(true);
      } else {
        clearEditRecovery();
      }
      abortActiveRequest();
      const questions = current.questions.slice(0, questionIndex + 1);
      const retainedQuestionIds = new Set(
        current.questions.slice(0, questionIndex).map((item) => item.id),
      );
      const answers = current.answers.filter((item) => retainedQuestionIds.has(item.questionId));
      const followUpCounts: InterviewSession['followUpCounts'] = {};
      const fallbackUsed: InterviewSession['fallbackUsed'] = {};
      for (const item of questions) {
        if (item.source === 'ai') {
          followUpCounts[item.phase] = (followUpCounts[item.phase] ?? 0) + 1;
        }
        if (item.source === 'template' && item.ruleKind === 'fallback') {
          fallbackUsed[item.phase] = true;
        }
      }
      updateSession({
        ...current,
        generation: nextGeneration,
        currentPhase: question.phase,
        currentQuestion: question,
        questions,
        answers,
        followUpCounts,
        fallbackUsed,
        skippedPhases: current.skippedPhases.filter(
          (phase) => INTERVIEW_PHASES.indexOf(phase) < INTERVIEW_PHASES.indexOf(question.phase),
        ),
        status: 'answering',
        requestStatus: 'idle',
        requestId: null,
        providerGeneration: providerGenerationRef.current,
        previewQuestion: '',
        privacyConsentPending: false,
        error: undefined,
        updatedAt: Date.now(),
      });
      setAnswerDraft(answer.skipped ? '' : answer.text);
    },
    [abortActiveRequest, clearEditRecovery, provider.configuration, setAnswerDraft, updateSession],
  );

  const editAnswer = useCallback(
    (questionId: string) => {
      const current = sessionRef.current;
      if (!current) return false;
      const questionIndex = current.questions.findIndex((question) => question.id === questionId);
      const answerIndex = current.answers.findIndex((answer) => answer.questionId === questionId);
      const question = current.questions[questionIndex];
      if (!question || answerIndex === -1) return false;
      const laterQuestionIds = new Set(
        current.questions.slice(questionIndex + 1).map((item) => item.id),
      );
      const affectedAnswers = current.answers.filter(
        (answer) =>
          laterQuestionIds.has(answer.questionId) && !answer.skipped && answer.text.trim(),
      ).length;
      if (affectedAnswers > 0) {
        setPendingEdit({
          questionId,
          affectedQuestionCount: Math.max(0, current.questions.length - questionIndex - 1),
          affectedAnswerCount: affectedAnswers,
        });
        return true;
      }
      setPendingEdit(null);
      applyEditAnswer(questionId, false);
      return false;
    },
    [applyEditAnswer, setPendingEdit],
  );

  const cancelEditAnswer = useCallback(() => {
    setPendingEdit(null);
  }, [setPendingEdit]);

  const confirmEditAnswer = useCallback(() => {
    const requested = pendingEditRef.current;
    if (!requested) return;
    setPendingEdit(null);
    applyEditAnswer(requested.questionId, true);
  }, [applyEditAnswer, setPendingEdit]);

  const undoEditAnswer = useCallback(() => {
    const recovery = editRecoveryRef.current;
    const current = sessionRef.current;
    if (
      !recovery ||
      !current ||
      current.id !== recovery.session.id ||
      current.generation !== recovery.branchGeneration ||
      providerGenerationRef.current !== recovery.providerGeneration ||
      provider.configuration !== recovery.providerConfiguration ||
      activeRequestRef.current
    ) {
      clearEditRecovery();
      return;
    }
    const hadInFlightRequest =
      recovery.session.status === 'generating_question' ||
      recovery.session.requestStatus === 'streaming' ||
      recovery.session.requestStatus === 'validating';
    updateSession({
      ...recovery.session,
      generation: current.generation + 1,
      status: hadInFlightRequest ? 'asking' : recovery.session.status,
      requestStatus: hadInFlightRequest ? 'cancelled' : recovery.session.requestStatus,
      requestId: null,
      providerGeneration: providerGenerationRef.current,
      previewQuestion: '',
      updatedAt: Date.now(),
    });
    setAnswerDraft(recovery.answerDraft);
    clearEditRecovery();
  }, [clearEditRecovery, provider.configuration, setAnswerDraft, updateSession]);

  const cancelInterview = useCallback(() => {
    abortActiveRequest();
    setPendingEdit(null);
    clearEditRecovery();
    const current = sessionRef.current;
    if (!current) return;
    updateSession({
      ...current,
      generation: current.generation + 1,
      currentQuestion: null,
      questions: [],
      answers: [],
      followUpCounts: {},
      followUpRequestCounts: {},
      fallbackUsed: {},
      skippedPhases: [],
      mode: 'template',
      privacyAcknowledged: false,
      status: 'cancelled',
      requestStatus: 'cancelled',
      requestId: null,
      previewQuestion: '',
      privacyConsentPending: false,
      error: undefined,
      updatedAt: Date.now(),
    });
    setAnswerDraft('');
  }, [abortActiveRequest, clearEditRecovery, setAnswerDraft, setPendingEdit, updateSession]);

  const finishInterview = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.currentPhase !== 'review') return;
    clearEditRecovery();
    updateSession({
      ...current,
      status: 'completed',
      requestStatus: 'completed',
      requestId: null,
      updatedAt: Date.now(),
    });
  }, [clearEditRecovery, updateSession]);

  const pause = useCallback(() => {
    if (activeRequestRef.current) cancelGeneration();
  }, [cancelGeneration]);

  useEffect(() => {
    if (providerConfigurationRef.current === provider.configuration) return;
    providerConfigurationRef.current = provider.configuration;
    providerGenerationRef.current += 1;
    setPendingEdit(null);
    clearEditRecovery();
    const active = activeRequestRef.current;
    if (active) {
      active.controller.abort();
      activeRequestRef.current = null;
    }
    clearPreview();
    const current = sessionRef.current;
    if (!current) return;
    updateSession({
      ...current,
      mode: provider.isConfigured ? 'undecided' : 'template',
      privacyAcknowledged: false,
      privacyConsentPending: false,
      providerGeneration: providerGenerationRef.current,
      status: 'error',
      requestStatus: 'cancelled',
      requestId: null,
      previewQuestion: '',
      error: { code: 'provider_changed' },
      updatedAt: Date.now(),
    });
  }, [
    clearEditRecovery,
    clearPreview,
    provider.configuration,
    provider.isConfigured,
    setPendingEdit,
    updateSession,
  ]);

  useEffect(
    () => () => {
      abortActiveRequest();
    },
    [abortActiveRequest],
  );

  const progress = session ? getInterviewProgress(session) : null;

  return {
    session,
    progress,
    answerDraft,
    pendingEdit,
    canUndoEdit,
    setAnswerDraft,
    start,
    submitAnswer,
    skipQuestion,
    skipPhase,
    nextPhase,
    editAnswer,
    cancelEditAnswer,
    confirmEditAnswer,
    undoEditAnswer,
    approvePrivacyAndSend,
    continueWithTemplate,
    retryQuestion,
    cancelGeneration,
    cancelInterview,
    finishInterview,
    pause,
  };
};
