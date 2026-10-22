import { useI18n } from '@shared/i18n';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  MAX_INTERVIEW_ANSWER_CODE_UNITS,
  MAX_INTERVIEW_ANSWER_DRAFT_CODE_UNITS,
} from '../lib/buildInterviewPrompt';
import {
  localizeInterviewQuestion,
  MAX_AI_FOLLOW_UPS_PER_PHASE,
  MAX_AI_REQUEST_ATTEMPTS_PER_PHASE,
} from '../lib/interviewRules';
import type { AIInterviewProviderClient, InterviewPhase, InterviewQuestion } from '../model/types';
import { useAIResumeInterview } from '../model/useAIResumeInterview';
import { useResumeFacts } from '../model/useResumeFacts';
import FactVerificationPanel from './FactVerificationPanel';
import ResumeGenerationPanel from './ResumeGenerationPanel';

type AIResumeInterviewRuntimeProps = {
  open: boolean;
  provider: AIInterviewProviderClient;
  openerRef: RefObject<HTMLButtonElement | null>;
  onPause: () => void;
  onOpenProviderSettings: () => void;
};

const closeButtonClass =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 motion-reduce:transition-none';
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400 motion-reduce:transition-none';
const fieldClass =
  'min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900';

const phaseKeys: Record<InterviewPhase, string> = {
  targetRole: 'aiInterview.phases.targetRole',
  basics: 'aiInterview.phases.basics',
  work: 'aiInterview.phases.work',
  projects: 'aiInterview.phases.projects',
  education: 'aiInterview.phases.education',
  skills: 'aiInterview.phases.skills',
  review: 'aiInterview.phases.review',
};

const AIResumeInterviewRuntime = ({
  open,
  provider,
  openerRef,
  onPause,
  onOpenProviderSettings,
}: AIResumeInterviewRuntimeProps) => {
  const { t, locale } = useI18n();
  const controller = useAIResumeInterview(provider);
  const { session, progress } = controller;
  const factsController = useResumeFacts(session, provider, locale);
  const cancelPendingEdit = controller.cancelEditAnswer;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmationDialogRef = useRef<HTMLElement | null>(null);
  const interviewPaneRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeOnlyButtonRef = useRef<HTMLButtonElement | null>(null);
  const answerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const currentQuestionRef = useRef<HTMLHeadingElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [mobileTab, setMobileTab] = useState<'interview' | 'summary'>('interview');
  const [activeConfirmation, setActiveConfirmation] = useState<'cancel' | 'edit' | null>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const keepInterviewRef = useRef<HTMLButtonElement | null>(null);
  const keepCurrentInterviewRef = useRef<HTMLButtonElement | null>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const confirmationReturnTargetRef = useRef<'trigger' | 'answer' | 'closeOnly'>('trigger');
  const previousConfirmationRef = useRef<'cancel' | 'edit' | null>(null);
  const [answerDraftLimitExceeded, setAnswerDraftLimitExceeded] = useState(false);
  const [focusAnswerAfterEdit, setFocusAnswerAfterEdit] = useState(false);
  const isAnswerComposingRef = useRef(false);

  const isGenerating =
    session?.status === 'generating_question' ||
    session?.requestStatus === 'streaming' ||
    session?.requestStatus === 'validating';
  const currentQuestion = session?.currentQuestion ?? null;
  const currentQuestionContent = currentQuestion
    ? localizeInterviewQuestion(currentQuestion, t).content
    : '';
  const currentAnswer = currentQuestion
    ? session?.answers.find((answer) => answer.questionId === currentQuestion.id)
    : undefined;
  const canAnswer = Boolean(
    session &&
      currentQuestion &&
      !currentAnswer &&
      !isGenerating &&
      session.status !== 'completed' &&
      session.status !== 'cancelled',
  );
  const pauseInterview = controller.pause;
  const launchProviderSettings = onOpenProviderSettings;

  const closeAndPause = useCallback(() => {
    pauseInterview();
    setActiveConfirmation(null);
    onPause();
  }, [onPause, pauseInterview]);
  const openProviderSettings = useCallback(() => {
    pauseInterview();
    launchProviderSettings();
  }, [launchProviderSettings, pauseInterview]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = openerRef.current;
    let composing = false;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const getFocusable = (scope: HTMLElement) =>
      [...scope.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => {
        const style = globalThis.getComputedStyle(element);
        return (
          element.getAttribute('aria-hidden') !== 'true' &&
          !element.closest('[inert], [hidden], .hidden') &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });

    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const handleCompositionStart = () => {
      composing = true;
    };
    const handleCompositionEnd = () => {
      composing = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (event.isComposing || event.keyCode === 229 || composing) return;
        event.preventDefault();
        event.stopPropagation();
        if (activeConfirmationRef.current) {
          if (activeConfirmationRef.current === 'edit') cancelPendingEdit();
          confirmationReturnTargetRef.current = 'trigger';
          setActiveConfirmation(null);
          return;
        }
        closeAndPause();
        return;
      }
      if (event.key !== 'Tab') return;
      if (event.isComposing || event.keyCode === 229 || composing) return;
      const scope = activeConfirmationRef.current === null ? dialog : confirmationDialogRef.current;
      if (!scope) return;
      const focusable = getFocusable(scope);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (!scope.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('compositionstart', handleCompositionStart, true);
    document.addEventListener('compositionend', handleCompositionEnd, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('compositionstart', handleCompositionStart, true);
      document.removeEventListener('compositionend', handleCompositionEnd, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousBodyOverflow;
      opener?.focus();
    };
  }, [cancelPendingEdit, closeAndPause, open, openerRef]);

  useEffect(() => {
    if (activeConfirmation) {
      (activeConfirmation === 'cancel'
        ? keepInterviewRef.current
        : keepCurrentInterviewRef.current
      )?.focus();
    } else if (previousConfirmationRef.current) {
      if (confirmationReturnTargetRef.current === 'answer') {
        answerInputRef.current?.focus();
      } else if (confirmationReturnTargetRef.current === 'closeOnly') {
        closeOnlyButtonRef.current?.focus();
      } else {
        confirmationTriggerRef.current?.focus();
      }
      confirmationTriggerRef.current = null;
      confirmationReturnTargetRef.current = 'trigger';
    }
    previousConfirmationRef.current = activeConfirmation;
  }, [activeConfirmation]);

  const activeConfirmationRef = useRef(activeConfirmation);
  activeConfirmationRef.current = activeConfirmation;

  useEffect(() => {
    if (activeConfirmation === 'edit' && !controller.pendingEdit) {
      confirmationReturnTargetRef.current = 'trigger';
      setActiveConfirmation(null);
    }
  }, [activeConfirmation, controller.pendingEdit]);

  useEffect(() => {
    if (session?.status === 'asking' && currentQuestion && mobileTab === 'interview') {
      currentQuestionRef.current?.focus({ preventScroll: true });
      if (typeof interviewPaneRef.current?.scrollTo === 'function') {
        interviewPaneRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [currentQuestion, mobileTab, session?.status]);

  useEffect(() => {
    if (!focusAnswerAfterEdit || mobileTab !== 'interview') return;
    answerInputRef.current?.focus();
    setFocusAnswerAfterEdit(false);
  }, [currentQuestion, focusAnswerAfterEdit, mobileTab]);

  const allTurns = useMemo(() => {
    if (!session) return [];
    return session.questions.map((question) => ({
      question,
      answer: session.answers.find((answer) => answer.questionId === question.id),
    }));
  }, [session]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAnswer || controller.answerDraft.length > MAX_INTERVIEW_ANSWER_CODE_UNITS) return;
    controller.submitAnswer();
  };

  const requestEditAnswer = (questionId: string, trigger: HTMLButtonElement) => {
    const needsConfirmation = controller.editAnswer(questionId);
    setAnswerDraftLimitExceeded(false);
    if (needsConfirmation) {
      confirmationTriggerRef.current = trigger;
      confirmationReturnTargetRef.current = 'trigger';
      setActiveConfirmation('edit');
    } else {
      setMobileTab('interview');
      setFocusAnswerAfterEdit(true);
    }
  };

  const handleAnswerChange = (value: string) => {
    if (value.length > MAX_INTERVIEW_ANSWER_DRAFT_CODE_UNITS) {
      setAnswerDraftLimitExceeded(true);
      return;
    }
    setAnswerDraftLimitExceeded(false);
    controller.setAnswerDraft(value);
  };

  const answerDraftOverBudget = controller.answerDraft.length > MAX_INTERVIEW_ANSWER_CODE_UNITS;

  const handleAnswerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !isAnswerComposingRef.current &&
      !event.nativeEvent.isComposing &&
      event.nativeEvent.keyCode !== 229
    ) {
      event.preventDefault();
      if (canAnswer) controller.submitAnswer();
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const getStateAnnouncement = () => {
    if (!session) return '';
    if (session.requestStatus === 'validating') return t('aiInterview.validating');
    if (session.status === 'generating_question') return t('aiInterview.generating');
    if (
      session.requestStatus === 'cancelled' &&
      session.answers.some((answer) => !answer.skipped)
    ) {
      return t('aiInterview.cancelled');
    }
    if (session.privacyConsentPending) return t('aiInterview.consentTitle');
    if (session.status === 'completed') return t('aiInterview.completedTitle');
    if (session.error?.code === 'provider_error') return t('aiInterview.errors.providerError');
    if (session.error?.code === 'invalid_question') return t('aiInterview.errors.invalidQuestion');
    if (session.error?.code === 'provider_changed') return t('aiInterview.errors.providerChanged');
    if (session.status === 'asking') return currentQuestionContent;
    return '';
  };
  const stateAnnouncement = getStateAnnouncement();

  const renderSummary = () => (
    <section className="flex min-h-0 flex-col" aria-labelledby={`${titleId}-summary-heading`}>
      <div className="shrink-0">
        <h3
          id={`${titleId}-summary-heading`}
          className="text-base font-semibold text-slate-900 dark:text-white"
        >
          {t('aiInterview.summaryTitle')}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t('aiInterview.summaryDisclaimer')}
        </p>
      </div>
      {progress && (
        <ol
          className="mt-4 space-y-2"
          aria-label={t('aiInterview.progress', {
            current: progress.currentIndex + 1,
            total: progress.totalCount,
          })}
        >
          {progress.phases.map((phase) => (
            <li key={phase.phase} className="flex min-w-0 items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${phase.status === 'completed' ? 'bg-emerald-500' : phase.status === 'skipped' ? 'bg-slate-400' : phase.status === 'active' ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                {t(phaseKeys[phase.phase])}
              </span>
              <span className="shrink-0 text-slate-500 dark:text-slate-400">
                {phase.status === 'skipped'
                  ? t('aiInterview.answerSkipped')
                  : phase.status === 'completed'
                    ? `${phase.answeredCount}`
                    : phase.status === 'active'
                      ? t('aiInterview.phaseActive')
                      : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {allTurns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t('aiInterview.summaryEmpty')}
          </p>
        ) : (
          allTurns.map(({ question, answer }) => (
            <article
              key={question.id}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/60"
            >
              <p className="break-words text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t(phaseKeys[question.phase])}
              </p>
              <p className="mt-1 break-words text-sm leading-5 text-slate-800 dark:text-slate-100">
                {answer?.skipped
                  ? t('aiInterview.answerSkipped')
                  : answer?.text || t('aiInterview.emptyAnswer')}
              </p>
              {answer && !answer.skipped && session?.status !== 'cancelled' && (
                <button
                  type="button"
                  className="mt-2 min-h-9 rounded-lg px-2 text-xs font-medium text-brand-800 underline decoration-brand-300 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-brand-200"
                  onClick={(event) => requestEditAnswer(question.id, event.currentTarget)}
                >
                  {t('aiInterview.editAnswer')}
                </button>
              )}
            </article>
          ))
        )}
        {session?.skippedPhases.map((phase) => (
          <p
            key={`skipped-${phase}`}
            className="break-words rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300"
          >
            {t('aiInterview.phaseSkipped', { phase: t(phaseKeys[phase]) })}
          </p>
        ))}
        <FactVerificationPanel
          session={session}
          provider={provider}
          controller={factsController}
          onOpenProviderSettings={openProviderSettings}
        />
        <ResumeGenerationPanel
          session={session}
          facts={factsController.facts}
          entityLinks={factsController.entityLinks}
          entitySeparations={factsController.entitySeparations}
          provider={provider}
        />
      </div>
    </section>
  );

  const renderStart = () => (
    <div className="mx-auto flex w-full max-w-xl flex-col justify-center py-8 sm:py-12">
      <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
        {t('aiInterview.fromScratch')}
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {t('aiInterview.startTitle')}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {t('aiInterview.startDescription')}
      </p>
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
        <strong className="font-semibold">{t('aiInterview.sessionOnlyTitle')}</strong>
        <p className="mt-1">{t('aiInterview.sessionOnlyNotice')}</p>
      </div>
      {provider.isConfigured ? (
        <div className="dark:bg-brand-950/40 mt-4 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-brand-900 dark:text-slate-200">
          <strong className="font-semibold">{t('aiInterview.privacyTitle')}</strong>
          <p className="mt-1">{t('aiInterview.privacyNotice')}</p>
        </div>
      ) : (
        <div
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <strong className="font-semibold">{t('aiInterview.providerNotConfigured')}</strong>
          <p className="mt-1">{t('aiInterview.templateNoNetwork')}</p>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!provider.isConfigured}
          onClick={() => controller.start('ai')}
        >
          {t('aiInterview.startAi')}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => controller.start('template')}
        >
          {t('aiInterview.startTemplate')}
        </button>
      </div>
      {!provider.isConfigured && (
        <button
          type="button"
          className="mt-4 min-h-10 self-start px-2 text-sm font-medium text-brand-800 underline underline-offset-2 dark:text-brand-200"
          onClick={openProviderSettings}
        >
          {t('aiInterview.configureProvider')}
        </button>
      )}
    </div>
  );

  const renderCurrentQuestion = (question: InterviewQuestion) => {
    const isAnswered = Boolean(currentAnswer);
    const showConsent = Boolean(session?.privacyConsentPending);
    const canRetryAI = Boolean(
      provider.isConfigured &&
        session &&
        session.mode !== 'template' &&
        currentAnswer &&
        (session.followUpCounts[question.phase] ?? 0) < MAX_AI_FOLLOW_UPS_PER_PHASE &&
        (session.followUpRequestCounts[question.phase] ?? 0) < MAX_AI_REQUEST_ATTEMPTS_PER_PHASE,
    );
    const showError = Boolean(
      session?.error || (session?.requestStatus === 'cancelled' && isAnswered),
    );
    return (
      <div className="flex min-h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              {t(phaseKeys[question.phase])}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('aiInterview.questionSource.' + question.source)}
            </p>
          </div>
          <p className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t('aiInterview.progress', {
              current: (progress?.currentIndex ?? 0) + 1,
              total: progress?.totalCount ?? 7,
            })}
          </p>
        </div>
        <div className="dark:bg-brand-950/40 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-4 dark:border-brand-900 sm:px-5 sm:py-5">
          <h3
            ref={currentQuestionRef}
            tabIndex={-1}
            className="whitespace-pre-wrap break-words text-base leading-7 text-slate-900 outline-none dark:text-slate-100 sm:text-lg"
          >
            {localizeInterviewQuestion(question, t).content}
          </h3>
        </div>
        {isAnswered && currentAnswer && (
          <div className="mt-4 self-end rounded-2xl rounded-br-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            <p className="whitespace-pre-wrap break-words">
              {currentAnswer.skipped ? t('aiInterview.answerSkipped') : currentAnswer.text}
            </p>
          </div>
        )}
        {isGenerating && (
          <section
            className="mt-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
            aria-labelledby={`${titleId}-preview-heading`}
          >
            <h4
              id={`${titleId}-preview-heading`}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              {t('aiInterview.preview')}
            </h4>
            <p
              aria-hidden="true"
              className="mt-2 min-h-6 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200"
            >
              {session?.previewQuestion || t('aiInterview.waiting')}
            </p>
          </section>
        )}
        {showConsent && (
          <section
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
            aria-labelledby={`${titleId}-consent-heading`}
          >
            <h4
              id={`${titleId}-consent-heading`}
              className="font-semibold text-amber-950 dark:text-amber-100"
            >
              {t('aiInterview.consentTitle')}
            </h4>
            <p className="mt-1 text-sm leading-6 text-amber-950 dark:text-amber-100">
              {t('aiInterview.consentBody')}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={controller.approvePrivacyAndSend}
              >
                {t('aiInterview.consentAi')}
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={controller.continueWithTemplate}
              >
                {t('aiInterview.consentTemplate')}
              </button>
            </div>
          </section>
        )}
        {showError && (
          <div
            className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
            role="alert"
          >
            {session?.requestStatus === 'cancelled' && !session.error
              ? t('aiInterview.cancelled')
              : session?.error?.code === 'provider_error'
                ? t('aiInterview.errors.providerError')
                : session?.error?.code === 'invalid_question'
                  ? t('aiInterview.errors.invalidQuestion')
                  : session?.error?.code === 'provider_not_configured'
                    ? t('aiInterview.errors.providerNotConfigured')
                    : t('aiInterview.errors.providerChanged')}
          </div>
        )}
        <div className="mt-auto pt-5">
          {controller.canUndoEdit && (
            <div
              className="dark:bg-brand-950/40 mb-4 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3 text-sm leading-6 text-slate-700 dark:border-brand-900 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <p>{t('aiInterview.restoreInterviewNotice')}</p>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={controller.undoEditAnswer}
              >
                {t('aiInterview.restorePreviousInterview')}
              </button>
            </div>
          )}
          {canAnswer && (
            <form onSubmit={submit}>
              <label
                htmlFor={`${titleId}-answer`}
                className="text-sm font-medium text-slate-800 dark:text-slate-100"
              >
                {t('aiInterview.answerLabel')}
              </label>
              <textarea
                ref={answerInputRef}
                id={`${titleId}-answer`}
                className={`${fieldClass} mt-2`}
                rows={4}
                value={controller.answerDraft}
                placeholder={t('aiInterview.answerPlaceholder')}
                onChange={(event) => handleAnswerChange(event.currentTarget.value)}
                onKeyDown={handleAnswerKeyDown}
                onCompositionStart={() => {
                  isAnswerComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isAnswerComposingRef.current = false;
                }}
                aria-describedby={`${titleId}-enter-hint ${titleId}-answer-budget ${titleId}-answer-counter`}
              />
              <p
                id={`${titleId}-answer-budget`}
                className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400"
              >
                {t('aiInterview.answerBudget')}
              </p>
              <p
                id={`${titleId}-answer-counter`}
                className={`mt-1 text-xs ${answerDraftOverBudget ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {t('aiInterview.answerCounter', { count: controller.answerDraft.length })}
              </p>
              {answerDraftOverBudget && (
                <p
                  className="mt-1 text-sm leading-5 text-rose-700 dark:text-rose-300"
                  role="status"
                  aria-live="polite"
                >
                  {t('aiInterview.answerOverBudget')}
                </p>
              )}
              {answerDraftLimitExceeded && (
                <p className="mt-1 text-sm leading-5 text-rose-700 dark:text-rose-300" role="alert">
                  {t('aiInterview.answerDraftTooLong')}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p
                  id={`${titleId}-enter-hint`}
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {t('aiInterview.enterHint')}
                </p>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={
                    !controller.answerDraft.trim() ||
                    answerDraftOverBudget ||
                    answerDraftLimitExceeded
                  }
                >
                  {t('aiInterview.send')}
                </button>
              </div>
            </form>
          )}
          {!showConsent && !isGenerating && showError && (
            <div className="mt-4 flex flex-wrap gap-2">
              {canRetryAI && (
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={controller.retryQuestion}
                >
                  {session?.privacyAcknowledged
                    ? t('aiInterview.retryQuestion')
                    : t('aiInterview.chooseAiAgain')}
                </button>
              )}
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={controller.continueWithTemplate}
              >
                {t('aiInterview.continueWithTemplate')}
              </button>
              {!provider.isConfigured && (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={openProviderSettings}
                >
                  {t('aiInterview.configureProvider')}
                </button>
              )}
            </div>
          )}
          {isGenerating && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={controller.cancelGeneration}
            >
              {t('aiInterview.cancelGeneration')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderInterview = () => {
    if (!session) return renderStart();
    if (session.status === 'cancelled') {
      return (
        <div className="mx-auto flex w-full max-w-lg flex-col justify-center py-10">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('aiInterview.cancelledTitle')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('aiInterview.cancelledBody')}
          </p>
          <button
            type="button"
            className={`${primaryButtonClass} mt-5 self-start`}
            onClick={() => controller.start(provider.isConfigured ? 'ai' : 'template')}
          >
            {t('aiInterview.startNew')}
          </button>
        </div>
      );
    }
    if (session.status === 'completed') {
      return (
        <div className="mx-auto flex w-full max-w-lg flex-col justify-center py-10">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('aiInterview.completedTitle')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('aiInterview.completedBody')}
          </p>
          <button
            type="button"
            className={`${primaryButtonClass} mt-5 self-start`}
            onClick={() => controller.start(provider.isConfigured ? 'ai' : 'template')}
          >
            {t('aiInterview.startNew')}
          </button>
        </div>
      );
    }
    if (!currentQuestion) {
      return (
        <div className="mx-auto flex w-full max-w-lg flex-col justify-center py-10">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('aiInterview.summaryTitle')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('aiInterview.summaryDisclaimer')}
          </p>
        </div>
      );
    }
    return renderCurrentQuestion(currentQuestion);
  };

  const handleFooterAction = (action: 'skipQuestion' | 'skipPhase' | 'nextPhase') => {
    controller[action]();
  };

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[75] flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-950/55 px-2 py-2 dark:bg-black/75 sm:px-5 sm:py-4"
    >
      <div
        className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-hidden={activeConfirmation ? true : undefined}
        inert={activeConfirmation !== null}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 dark:border-slate-700 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl"
            >
              {t('aiInterview.title')}
            </h2>
            <p
              id={descriptionId}
              className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300"
            >
              {t('aiInterview.subtitle')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="hidden min-h-10 rounded-full px-3 text-xs font-medium text-slate-600 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-300 sm:inline-flex"
              onClick={openProviderSettings}
            >
              {t('aiInterview.configureProvider')}
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              className={closeButtonClass}
              onClick={closeAndPause}
              aria-label={t('aiInterview.close')}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {stateAnnouncement}
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/50 lg:hidden">
          <button
            type="button"
            className={`min-h-10 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${mobileTab === 'interview' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
            aria-pressed={mobileTab === 'interview'}
            onClick={() => setMobileTab('interview')}
          >
            {t('aiInterview.tabInterview')}
          </button>
          <button
            type="button"
            className={`min-h-10 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${mobileTab === 'summary' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
            aria-pressed={mobileTab === 'summary'}
            onClick={() => setMobileTab('summary')}
          >
            {t('aiInterview.tabSummary')}
          </button>
        </div>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.9fr)]">
          <main
            ref={interviewPaneRef}
            className={`${mobileTab === 'summary' ? 'hidden' : 'flex'} min-h-0 flex-col overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:flex lg:border-r lg:border-slate-200 lg:px-6 lg:py-5 dark:lg:border-slate-700`}
          >
            {renderInterview()}
          </main>
          <aside
            className={`${mobileTab === 'interview' ? 'hidden' : 'flex'} min-h-0 flex-col overflow-hidden px-4 py-4 lg:flex lg:px-5 lg:py-5`}
          >
            {renderSummary()}
          </aside>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-700 dark:bg-slate-900 sm:px-5">
          {session && session.status !== 'completed' && session.status !== 'cancelled' && (
            <>
              {currentQuestion && currentQuestion.phase !== 'review' && (
                <>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => handleFooterAction('skipQuestion')}
                  >
                    {t('aiInterview.skipQuestion')}
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => handleFooterAction('skipPhase')}
                  >
                    {t('aiInterview.skipPhase')}
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => handleFooterAction('nextPhase')}
                  >
                    {t('aiInterview.nextPhase')}
                  </button>
                </>
              )}
              {session.currentPhase === 'review' && (
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={controller.finishInterview}
                >
                  {t('aiInterview.finish')}
                </button>
              )}
              <button
                ref={cancelTriggerRef}
                type="button"
                className="ml-auto min-h-11 rounded-full px-4 text-sm font-medium text-rose-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-300"
                onClick={(event) => {
                  confirmationTriggerRef.current = event.currentTarget;
                  confirmationReturnTargetRef.current = 'trigger';
                  setActiveConfirmation('cancel');
                }}
              >
                {t('aiInterview.cancelInterview')}
              </button>
            </>
          )}
          {(!session || session.status === 'completed' || session.status === 'cancelled') && (
            <button
              ref={closeOnlyButtonRef}
              type="button"
              className="ml-auto min-h-11 rounded-full px-4 text-sm font-medium text-slate-600 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-300"
              onClick={closeAndPause}
            >
              {t('aiInterview.closeOnly')}
            </button>
          )}
        </footer>
      </div>
      {activeConfirmation && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6"
          role="presentation"
        >
          <section
            ref={confirmationDialogRef}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-confirmation-heading`}
            aria-describedby={`${titleId}-confirmation-description`}
          >
            <h3
              id={`${titleId}-confirmation-heading`}
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {activeConfirmation === 'cancel'
                ? t('aiInterview.cancelConfirmTitle')
                : t('aiInterview.editConfirmTitle')}
            </h3>
            <p
              id={`${titleId}-confirmation-description`}
              className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              {activeConfirmation === 'cancel'
                ? t('aiInterview.cancelConfirmBody')
                : t('aiInterview.editConfirmBody', {
                    questionCount: controller.pendingEdit?.affectedQuestionCount ?? 0,
                    answerCount: controller.pendingEdit?.affectedAnswerCount ?? 0,
                  })}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                ref={activeConfirmation === 'cancel' ? keepInterviewRef : keepCurrentInterviewRef}
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  if (activeConfirmation === 'edit') cancelPendingEdit();
                  confirmationReturnTargetRef.current = 'trigger';
                  setActiveConfirmation(null);
                }}
              >
                {activeConfirmation === 'cancel'
                  ? t('aiInterview.keepInterview')
                  : t('aiInterview.keepCurrentInterview')}
              </button>
              <button
                type="button"
                className={
                  activeConfirmation === 'cancel'
                    ? `${primaryButtonClass} !bg-rose-700 hover:!bg-rose-800`
                    : primaryButtonClass
                }
                onClick={() => {
                  if (activeConfirmation === 'cancel') {
                    controller.cancelInterview();
                    confirmationReturnTargetRef.current = 'closeOnly';
                  } else {
                    controller.confirmEditAnswer();
                    setMobileTab('interview');
                    confirmationReturnTargetRef.current = 'answer';
                  }
                  setActiveConfirmation(null);
                }}
              >
                {activeConfirmation === 'cancel'
                  ? t('aiInterview.confirmCancel')
                  : t('aiInterview.confirmEditAnswer')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default AIResumeInterviewRuntime;
