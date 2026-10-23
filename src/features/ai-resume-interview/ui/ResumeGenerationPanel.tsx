import {
  type ActiveSectionKey,
  deriveSectionsFromResume,
  type ResumeData,
  resumeSchema,
  useResumeStore,
} from '@entities/resume';
import { ResumePreview } from '@features/resume-preview';
import { type TranslationKey, useI18n } from '@shared/i18n';
import { clone } from '@shared/lib';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FactEntityLink, FactEntitySeparation } from '../model/factEntityLinks';
import type { ResumeFact } from '../model/facts';
import {
  buildResumeDraftFromFacts,
  getCurrentConfirmedFacts,
  getResumeDraftBasisKey,
  type ResumeGenerationResult,
} from '../model/resumeGeneration';
import {
  applyResumePolishSuggestion,
  buildResumePolishFields,
  buildResumePolishRequest,
  createResumePolishSuggestions,
  MAX_RESUME_POLISH_OUTPUT_CODE_UNITS,
  parseResumePolishResponse,
  type ResumePolishSuggestion,
} from '../model/resumeGenerationPolish';
import type { AIInterviewProviderClient, InterviewSession } from '../model/types';

type ResumeGenerationPanelProps = {
  session: InterviewSession | null;
  facts: ResumeFact[];
  entityLinks?: FactEntityLink[];
  entitySeparations?: FactEntitySeparation[];
  provider: AIInterviewProviderClient;
  active?: boolean;
};

type GeneratedDraft = {
  sessionId: string | null;
  basisKey: string;
  providerStreamComplete: AIInterviewProviderClient['streamComplete'];
  resume: ResumeData;
  includedFactIds: string[];
  recordFactIds: ResumeGenerationResult['recordFactIds'];
  entityWarnings: ResumeGenerationResult['entityWarnings'];
  generationError: string | null;
};

type ResumeSnapshot = {
  resume: ResumeData;
  activeSections: ActiveSectionKey[];
  workspaceGeneration: number;
  workspaceRevision: number;
};

type ReplacementConfirmation = {
  workspaceSnapshot: ResumeSnapshot;
  draftFingerprint: string;
  basisKey: string;
  providerStreamComplete: AIInterviewProviderClient['streamComplete'];
  draftVersion: number;
};

type ResumePolishState = 'idle' | 'requesting' | 'suggested' | 'failed' | 'cancelled';

type ActivePolishRequest = {
  id: number;
  controller: AbortController;
  basisKey: string;
  draftFingerprint: string;
  providerConfiguration: AIInterviewProviderClient['configuration'];
  providerStreamComplete: AIInterviewProviderClient['streamComplete'];
};

const inputClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const textAreaClass = `${inputClass} min-h-20 resize-y leading-6`;
const buttonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 motion-reduce:transition-none';
const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:text-slate-950 motion-reduce:transition-none';

const snapshotMatches = (current: ResumeSnapshot, snapshot: ResumeSnapshot) =>
  current.workspaceGeneration === snapshot.workspaceGeneration &&
  current.workspaceRevision === snapshot.workspaceRevision &&
  JSON.stringify(current.resume) === JSON.stringify(snapshot.resume) &&
  JSON.stringify(current.activeSections) === JSON.stringify(snapshot.activeSections);

const getCurrentStoreSnapshot = (): ResumeSnapshot => {
  const state = useResumeStore.getState();
  return {
    resume: clone(state.resume),
    activeSections: clone(state.activeSections),
    workspaceGeneration: state.workspaceGeneration,
    workspaceRevision: state.workspaceRevision,
  };
};

const ResumeGenerationPanel = ({
  session,
  facts,
  entityLinks = [],
  entitySeparations = [],
  provider,
  active = true,
}: ResumeGenerationPanelProps) => {
  const { t, locale } = useI18n();
  const sessionId = session?.id ?? null;
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [replacementSnapshot, setReplacementSnapshot] = useState<ReplacementConfirmation | null>(
    null,
  );
  const [replacementAcknowledged, setReplacementAcknowledged] = useState(false);
  const [message, setMessageState] = useState<string | null>(null);
  const [messageSessionId, setMessageSessionId] = useState(sessionId);
  const [undoSnapshot, setUndoSnapshot] = useState<ResumeSnapshot | null>(null);
  const [appliedSnapshot, setAppliedSnapshot] = useState<ResumeSnapshot | null>(null);
  const [showPolishReview, setShowPolishReview] = useState(false);
  const [polishState, setPolishState] = useState<ResumePolishState>('idle');
  const [polishError, setPolishError] = useState<string | null>(null);
  const [polishSuggestions, setPolishSuggestions] = useState<ResumePolishSuggestion[]>([]);
  const activePolishRequestRef = useRef<ActivePolishRequest | null>(null);
  const polishRequestSequenceRef = useRef(0);
  const replacementSnapshotRef = useRef<ReplacementConfirmation | null>(null);
  const replacementAcknowledgedRef = useRef(false);
  const draftVersionRef = useRef(0);
  const previousSessionIdRef = useRef(sessionId);

  const setMessage = useCallback(
    (nextMessage: string | null) => {
      setMessageState(nextMessage);
      setMessageSessionId(sessionId);
    },
    [sessionId],
  );
  const visibleMessage = messageSessionId === sessionId ? message : null;

  const currentFacts = useMemo(() => getCurrentConfirmedFacts(session, facts), [facts, session]);
  const basisKey = getResumeDraftBasisKey(
    session,
    facts,
    {
      configuration: provider.configuration,
      isConfigured: provider.isConfigured,
      connectionStatus: provider.connectionStatus,
    },
    { links: entityLinks, separations: entitySeparations },
  );
  const isDraftCurrent = Boolean(
    draft &&
      draft.sessionId === sessionId &&
      draft.basisKey === basisKey &&
      draft.providerStreamComplete === provider.streamComplete,
  );
  const hasDraftForCurrentSession = draft?.sessionId === sessionId;
  const draftFingerprint = draft ? JSON.stringify(draft.resume) : '';
  const polishFields = useMemo(() => (draft ? buildResumePolishFields(draft.resume) : []), [draft]);
  const currentPolishContextRef = useRef({
    basisKey,
    draftFingerprint,
    providerConfiguration: provider.configuration,
    providerStreamComplete: provider.streamComplete,
  });
  currentPolishContextRef.current = {
    basisKey,
    draftFingerprint,
    providerConfiguration: provider.configuration,
    providerStreamComplete: provider.streamComplete,
  };
  const validation = draft ? resumeSchema.safeParse(draft.resume) : null;
  const draftIsValid = Boolean(validation?.success && !draft?.generationError);
  const missingFields = draft
    ? getMissingFields(draft.resume, (key) =>
        t(`aiInterview.generation.missing.${key}` as TranslationKey),
      )
    : [];
  const unresolvedConflicts = facts.filter(
    (fact) => fact.status === 'conflict' && fact.conflictFields && fact.conflictFields.length > 0,
  );

  const isConfirmationForCurrentDraft = useCallback(
    (confirmation: ReplacementConfirmation | null) => {
      if (!confirmation) return false;
      const current = currentPolishContextRef.current;
      return (
        confirmation.draftVersion === draftVersionRef.current &&
        confirmation.draftFingerprint === current.draftFingerprint &&
        confirmation.basisKey === current.basisKey &&
        confirmation.providerStreamComplete === current.providerStreamComplete
      );
    },
    [],
  );
  const hasCurrentReplacementConfirmation =
    Boolean(replacementSnapshot) && isConfirmationForCurrentDraft(replacementSnapshot);

  const clearReplacementConfirmation = useCallback(
    (announce = false) => {
      const hadConfirmation = replacementSnapshotRef.current !== null;
      replacementSnapshotRef.current = null;
      replacementAcknowledgedRef.current = false;
      setReplacementSnapshot(null);
      setReplacementAcknowledged(false);
      if (announce && hadConfirmation) {
        setMessage(t('aiInterview.generation.replacementNeedsReview'));
      }
    },
    [setMessage, t],
  );

  useEffect(() => {
    if (sessionId === null || previousSessionIdRef.current === sessionId) return;
    previousSessionIdRef.current = sessionId;
    activePolishRequestRef.current?.controller.abort();
    activePolishRequestRef.current = null;
    polishRequestSequenceRef.current += 1;
    draftVersionRef.current += 1;
    replacementSnapshotRef.current = null;
    replacementAcknowledgedRef.current = false;
    setDraft(null);
    setReplacementSnapshot(null);
    setReplacementAcknowledged(false);
    setMessage(null);
    setShowPolishReview(false);
    setPolishState('idle');
    setPolishError(null);
    setPolishSuggestions([]);
  }, [sessionId, setMessage]);

  useEffect(() => {
    const active = activePolishRequestRef.current;
    if (!active) return;
    const current = currentPolishContextRef.current;
    if (
      active.basisKey === current.basisKey &&
      active.draftFingerprint === current.draftFingerprint &&
      active.providerConfiguration === current.providerConfiguration &&
      active.providerStreamComplete === current.providerStreamComplete
    ) {
      return;
    }
    active.controller.abort();
    activePolishRequestRef.current = null;
    setPolishSuggestions([]);
    setPolishState('cancelled');
    setPolishError(t('aiInterview.generation.polishCancelled'));
  }, [basisKey, draftFingerprint, provider.configuration, provider.streamComplete, t]);

  useEffect(() => {
    const confirmation = replacementSnapshotRef.current;
    if (confirmation && !isConfirmationForCurrentDraft(confirmation)) {
      clearReplacementConfirmation(true);
    }
  }, [
    basisKey,
    clearReplacementConfirmation,
    draftFingerprint,
    isConfirmationForCurrentDraft,
    provider.configuration,
    provider.streamComplete,
  ]);

  useEffect(() => {
    setShowPolishReview(false);
    setPolishSuggestions([]);
    setPolishState('idle');
    setPolishError(null);
  }, [basisKey, provider.configuration, provider.streamComplete]);

  useEffect(() => {
    if (active) return;
    const request = activePolishRequestRef.current;
    if (!request) return;
    request.controller.abort();
    activePolishRequestRef.current = null;
    setPolishState('cancelled');
    setPolishError(t('aiInterview.generation.polishCancelled'));
  }, [active, t]);

  useEffect(
    () => () => {
      activePolishRequestRef.current?.controller.abort();
      activePolishRequestRef.current = null;
    },
    [],
  );

  const buildDraft = () => {
    const hadConfirmation = replacementSnapshotRef.current !== null;
    draftVersionRef.current += 1;
    clearReplacementConfirmation();
    if (hadConfirmation) setMessage(t('aiInterview.generation.replacementNeedsReview'));
    activePolishRequestRef.current?.controller.abort();
    activePolishRequestRef.current = null;
    setShowPolishReview(false);
    setPolishSuggestions([]);
    setPolishState('idle');
    setPolishError(null);
    const result = buildResumeDraftFromFacts(
      session,
      facts,
      locale,
      entityLinks,
      entitySeparations,
    );
    setDraft({
      sessionId,
      basisKey,
      providerStreamComplete: provider.streamComplete,
      resume: result.resume,
      includedFactIds: result.includedFactIds,
      recordFactIds: result.recordFactIds,
      entityWarnings: result.entityWarnings,
      generationError: result.validationError,
    });
    setMessage(
      result.validationError
        ? t('aiInterview.generation.schemaError')
        : hadConfirmation
          ? t('aiInterview.generation.replacementNeedsReview')
          : null,
    );
  };

  const updateDraft = (updater: (resume: ResumeData) => ResumeData) => {
    const hadConfirmation = replacementSnapshotRef.current !== null;
    draftVersionRef.current += 1;
    clearReplacementConfirmation();
    if (hadConfirmation) setMessage(t('aiInterview.generation.replacementNeedsReview'));
    const active = activePolishRequestRef.current;
    if (active) {
      active.controller.abort();
      activePolishRequestRef.current = null;
    }
    setShowPolishReview(false);
    setPolishSuggestions([]);
    setPolishState('idle');
    setPolishError(null);
    setDraft((current) => (current ? { ...current, resume: updater(current.resume) } : current));
  };

  const cancelPolish = () => {
    const active = activePolishRequestRef.current;
    if (!active) return;
    active.controller.abort();
    activePolishRequestRef.current = null;
    setPolishState('cancelled');
    setPolishError(t('aiInterview.generation.polishCancelled'));
  };

  const requestPolishSuggestions = async () => {
    if (
      !draft ||
      !isDraftCurrent ||
      !draftIsValid ||
      !provider.isConfigured ||
      !provider.configuration ||
      polishState === 'requesting'
    ) {
      return;
    }
    const request = buildResumePolishRequest(polishFields, locale);
    if (!request.ok) {
      setPolishState('failed');
      setPolishError(
        request.error === 'no_text'
          ? t('aiInterview.generation.polishNoText')
          : t('aiInterview.generation.polishInputTooLong'),
      );
      return;
    }

    const requestId = ++polishRequestSequenceRef.current;
    const controller = new AbortController();
    activePolishRequestRef.current?.controller.abort();
    activePolishRequestRef.current = {
      id: requestId,
      controller,
      basisKey,
      draftFingerprint,
      providerConfiguration: provider.configuration,
      providerStreamComplete: provider.streamComplete,
    };
    setShowPolishReview(false);
    setPolishSuggestions([]);
    setPolishError(null);
    setPolishState('requesting');

    try {
      const response = await provider.streamComplete(request.messages, {
        signal: controller.signal,
        timeoutMs: 30_000,
        maxOutputCodeUnits: MAX_RESUME_POLISH_OUTPUT_CODE_UNITS,
        onDelta: () => {},
      });
      const current = currentPolishContextRef.current;
      const active = activePolishRequestRef.current;
      if (!active || active.id !== requestId) return;
      if (
        controller.signal.aborted ||
        current.basisKey !== basisKey ||
        current.draftFingerprint !== draftFingerprint ||
        current.providerConfiguration !== provider.configuration ||
        current.providerStreamComplete !== provider.streamComplete
      ) {
        activePolishRequestRef.current = null;
        setPolishState('cancelled');
        setPolishError(t('aiInterview.generation.polishCancelled'));
        return;
      }
      const parsed = parseResumePolishResponse(response.content, request.fields);
      if (!parsed.ok) {
        setPolishState('failed');
        setPolishError(
          parsed.error === 'protected_content_changed'
            ? t('aiInterview.generation.polishProtectedContentChanged')
            : parsed.error === 'responsibility_scope_changed'
              ? t('aiInterview.generation.polishResponsibilityChanged')
              : parsed.error === 'unsupported_claim_added'
                ? t('aiInterview.generation.polishUnsupportedClaimAdded')
                : t('aiInterview.generation.polishInvalidOutput'),
        );
        return;
      }
      setPolishSuggestions(createResumePolishSuggestions(request.fields, parsed));
      setPolishState('suggested');
    } catch {
      if (activePolishRequestRef.current?.id !== requestId) return;
      setPolishState(controller.signal.aborted ? 'cancelled' : 'failed');
      setPolishError(
        controller.signal.aborted
          ? t('aiInterview.generation.polishCancelled')
          : t('aiInterview.generation.polishRequestFailed'),
      );
    } finally {
      if (activePolishRequestRef.current?.id === requestId) {
        activePolishRequestRef.current = null;
      }
    }
  };

  const acceptPolishSuggestion = (suggestion: ResumePolishSuggestion) => {
    if (!isDraftCurrent) return;
    const hadConfirmation = replacementSnapshotRef.current !== null;
    draftVersionRef.current += 1;
    clearReplacementConfirmation();
    if (hadConfirmation) setMessage(t('aiInterview.generation.replacementNeedsReview'));
    setDraft((current) =>
      current
        ? {
            ...current,
            resume: applyResumePolishSuggestion(current.resume, suggestion),
          }
        : current,
    );
    setPolishSuggestions((current) => {
      const remaining = current.filter((item) => item.id !== suggestion.id);
      if (remaining.length === 0) setPolishState('idle');
      return remaining;
    });
  };

  const dismissPolishSuggestion = (suggestionId: string) => {
    setPolishSuggestions((current) => {
      const remaining = current.filter((item) => item.id !== suggestionId);
      if (remaining.length === 0) setPolishState('idle');
      return remaining;
    });
  };

  const getPolishFieldLabel = (field: ResumePolishSuggestion | (typeof polishFields)[number]) =>
    t(`aiInterview.generation.polishFields.${field.label}` as TranslationKey, {
      index: (field.sectionIndex ?? 0) + 1,
      item: (field.itemIndex ?? 0) + 1,
    });

  const setPersonalField = (
    key: 'fullName' | 'title' | 'email' | 'phone' | 'location' | 'summary',
    value: string,
  ) => updateDraft((resume) => ({ ...resume, personal: { ...resume.personal, [key]: value } }));

  const setExperienceField = (
    index: number,
    key: 'company' | 'role' | 'location' | 'startDate' | 'endDate' | 'highlights',
    value: string,
  ) =>
    updateDraft((resume) => ({
      ...resume,
      experience: resume.experience.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [key]: key === 'highlights' ? splitLines(value) : value }
          : item,
      ),
    }));

  const setProjectField = (
    index: number,
    key: 'name' | 'role' | 'summary' | 'link' | 'highlights',
    value: string,
  ) =>
    updateDraft((resume) => ({
      ...resume,
      projects: resume.projects.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [key]: key === 'highlights' ? splitLines(value) : value }
          : item,
      ),
    }));

  const setEducationField = (
    index: number,
    key: 'school' | 'degree' | 'startDate' | 'endDate' | 'details',
    value: string,
  ) =>
    updateDraft((resume) => ({
      ...resume,
      education: resume.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));

  const setSkills = (value: string) =>
    updateDraft((resume) => ({
      ...resume,
      skills: value.trim()
        ? [{ id: resume.skills[0]?.id ?? 'generated-skills', items: splitLines(value) }]
        : [],
    }));

  const openReplacementConfirmation = () => {
    if (!draft || !isDraftCurrent || !draftIsValid) return;
    const confirmation: ReplacementConfirmation = {
      workspaceSnapshot: getCurrentStoreSnapshot(),
      draftFingerprint,
      basisKey,
      providerStreamComplete: provider.streamComplete,
      draftVersion: draftVersionRef.current,
    };
    replacementSnapshotRef.current = confirmation;
    replacementAcknowledgedRef.current = false;
    setReplacementSnapshot(confirmation);
    setReplacementAcknowledged(false);
    setMessage(null);
  };

  const applyDraft = () => {
    const confirmation = replacementSnapshotRef.current;
    if (!confirmation) return;
    if (
      !draft ||
      !isConfirmationForCurrentDraft(confirmation) ||
      confirmation.draftFingerprint !== draftFingerprint ||
      confirmation.basisKey !== basisKey ||
      confirmation.providerStreamComplete !== provider.streamComplete ||
      !replacementAcknowledgedRef.current ||
      !isDraftCurrent ||
      !draftIsValid
    ) {
      clearReplacementConfirmation(true);
      return;
    }
    const current = getCurrentStoreSnapshot();
    if (!snapshotMatches(current, confirmation.workspaceSnapshot)) {
      clearReplacementConfirmation();
      setMessage(t('aiInterview.generation.resumeChanged'));
      return;
    }
    const parsed = resumeSchema.safeParse(draft.resume);
    if (!parsed.success) {
      clearReplacementConfirmation();
      setMessage(t('aiInterview.generation.schemaError'));
      return;
    }
    setUndoSnapshot(current);
    useResumeStore.getState().replaceState(parsed.data, deriveSectionsFromResume(parsed.data));
    setAppliedSnapshot(getCurrentStoreSnapshot());
    clearReplacementConfirmation();
    setMessage(t('aiInterview.generation.applied'));
  };

  const undoApply = () => {
    if (!undoSnapshot || !appliedSnapshot) return;
    const current = getCurrentStoreSnapshot();
    if (!snapshotMatches(current, appliedSnapshot)) {
      setMessage(t('aiInterview.generation.undoUnavailable'));
      setUndoSnapshot(null);
      setAppliedSnapshot(null);
      return;
    }
    useResumeStore.getState().replaceState(undoSnapshot.resume, undoSnapshot.activeSections);
    setUndoSnapshot(null);
    setAppliedSnapshot(null);
    setMessage(t('aiInterview.generation.undone'));
  };

  const cancelReplacement = () => {
    clearReplacementConfirmation();
  };

  const editField = (
    label: string,
    value: string | undefined,
    onChange: (value: string) => void,
    multiline = false,
    description?: string,
  ) => (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      {description && <span className="text-[11px] font-normal text-slate-500">{description}</span>}
      {multiline ? (
        <textarea
          className={textAreaClass}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );

  return (
    <section
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
      aria-labelledby="resume-generation-heading"
      data-testid="resume-generation-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            id="resume-generation-heading"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            {t('aiInterview.generation.title')}
          </h4>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">
            {t('aiInterview.generation.description')}
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={currentFacts.length === 0}
          onClick={buildDraft}
        >
          {hasDraftForCurrentSession
            ? t('aiInterview.generation.rebuild')
            : t('aiInterview.generation.build')}
        </button>
      </div>

      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        {t('aiInterview.generation.deterministicNotice', { count: currentFacts.length })}
      </p>

      {unresolvedConflicts.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <h5 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {t('aiInterview.generation.conflictsTitle', { count: unresolvedConflicts.length })}
          </h5>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-950 dark:text-amber-100">
            {unresolvedConflicts.map((fact) => (
              <li key={fact.id}>
                {t(`aiInterview.facts.kinds.${fact.kind}` as TranslationKey)}:{' '}
                {fact.conflictFields
                  ?.map((field) =>
                    fact.kind === 'targetRole' && field === 'value'
                      ? t('aiInterview.facts.fields.targetRole')
                      : t(
                          `aiInterview.facts.fields.${fact.kind === 'project' && field === 'name' ? 'projectName' : field}` as TranslationKey,
                        ),
                  )
                  .join(', ')}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-amber-900 dark:text-amber-200">
            {t('aiInterview.generation.conflictsExcluded')}
          </p>
        </div>
      )}

      {!hasDraftForCurrentSession && currentFacts.length === 0 && (
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t('aiInterview.generation.noConfirmedFacts')}
        </p>
      )}

      {visibleMessage && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {visibleMessage}
        </p>
      )}

      {undoSnapshot && appliedSnapshot && (
        <div className="mt-3">
          <button type="button" className={buttonClass} onClick={undoApply}>
            {t('aiInterview.generation.undo')}
          </button>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t('aiInterview.generation.undoNotice')}
          </p>
        </div>
      )}

      {draft && draft.sessionId === sessionId && (
        <div
          className="mt-4 space-y-4"
          data-testid="generated-resume-draft"
          data-source-fact-ids={JSON.stringify(draft.recordFactIds)}
        >
          {!isDraftCurrent && (
            <p
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            >
              {t('aiInterview.generation.staleDraft')}
            </p>
          )}

          {draft.entityWarnings.length > 0 && (
            <div
              role="status"
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <p className="font-semibold">
                {t('aiInterview.generation.entityWarningsTitle', {
                  count: draft.entityWarnings.length,
                })}
              </p>
              <p className="mt-1">{t('aiInterview.generation.entityWarningsDescription')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {draft.entityWarnings.map((warning, index) => (
                  <li
                    key={`${warning.kind}-${warning.reason}-${warning.factIds.join('-')}-${index}`}
                  >
                    {t(`aiInterview.facts.kinds.${warning.kind}` as TranslationKey)} —{' '}
                    {warning.reason === 'field-conflict'
                      ? t('aiInterview.generation.entityFieldConflict')
                      : t('aiInterview.generation.entityIdentityAmbiguous')}{' '}
                    ({warning.factIds.join(', ')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('aiInterview.generation.missingTitle', { count: missingFields.length })}
            </h5>
            {missingFields.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {missingFields.map((field) => (
                  <li
                    key={field}
                    className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
                  >
                    {field}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
                {t('aiInterview.generation.noMissing')}
              </p>
            )}
          </div>

          <section
            className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
            aria-labelledby="resume-polish-heading"
          >
            <h5
              id="resume-polish-heading"
              className="text-sm font-semibold text-slate-900 dark:text-white"
            >
              {t('aiInterview.generation.polishTitle')}
            </h5>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {t('aiInterview.generation.polishDescription')}
            </p>
            {!provider.isConfigured && (
              <p
                className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300"
                role="status"
              >
                {t('aiInterview.generation.polishProviderMissing')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={
                  !isDraftCurrent ||
                  !draftIsValid ||
                  !provider.isConfigured ||
                  !provider.configuration ||
                  polishFields.length === 0 ||
                  polishState === 'requesting'
                }
                onClick={() => {
                  setShowPolishReview((visible) => !visible);
                  setPolishError(null);
                }}
              >
                {showPolishReview
                  ? t('aiInterview.generation.polishCloseReview')
                  : t('aiInterview.generation.polishReviewText')}
              </button>
              {polishState === 'requesting' && (
                <button type="button" className={buttonClass} onClick={cancelPolish}>
                  {t('aiInterview.generation.polishCancel')}
                </button>
              )}
            </div>

            {showPolishReview && provider.configuration && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <p>
                  {t('aiInterview.generation.polishConsent', {
                    count: polishFields.length,
                    model: provider.configuration.model,
                    endpoint: provider.configuration.baseUrl,
                  })}
                </p>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-white/70 p-2 dark:bg-black/20">
                  {polishFields.map((field) => (
                    <li key={field.id} className="break-words">
                      <strong>
                        {t(`aiInterview.generation.polishFields.${field.label}` as TranslationKey, {
                          index: (field.sectionIndex ?? 0) + 1,
                          item: (field.itemIndex ?? 0) + 1,
                        })}
                      </strong>
                      <p>{field.requestText}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={!isDraftCurrent || !draftIsValid || polishState === 'requesting'}
                    onClick={() => void requestPolishSuggestions()}
                  >
                    {t('aiInterview.generation.polishSend')}
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={polishState === 'requesting'}
                    onClick={() => setShowPolishReview(false)}
                  >
                    {t('aiInterview.generation.cancel')}
                  </button>
                </div>
              </div>
            )}

            {polishState === 'requesting' && (
              <p
                className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300"
                role="status"
                aria-live="polite"
              >
                {t('aiInterview.generation.polishRequesting')}
              </p>
            )}
            {polishError && (
              <p
                className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                role="alert"
              >
                {polishError}
              </p>
            )}
            {polishSuggestions.length > 0 && (
              <div className="mt-3 space-y-3" aria-labelledby="resume-polish-suggestions-heading">
                <div>
                  <h6
                    id="resume-polish-suggestions-heading"
                    className="text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {t('aiInterview.generation.polishSuggestionsTitle', {
                      count: polishSuggestions.length,
                    })}
                  </h6>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {t('aiInterview.generation.polishSuggestionsNotice')}
                  </p>
                </div>
                {polishSuggestions.map((suggestion) => (
                  <article
                    key={suggestion.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <h6 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {getPolishFieldLabel(suggestion)}
                    </h6>
                    <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t('aiInterview.generation.polishOriginal')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700 dark:text-slate-200">
                      {suggestion.originalText}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-brand-800 dark:text-brand-200">
                      {t('aiInterview.generation.polishSuggestion')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-800 dark:text-slate-100">
                      {suggestion.suggestedText}
                    </p>
                    <p
                      className={
                        suggestion.risk === 'safe_formatting'
                          ? 'mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300'
                          : 'mt-2 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-950 dark:bg-amber-950/60 dark:text-amber-100'
                      }
                    >
                      {suggestion.risk === 'safe_formatting'
                        ? t('aiInterview.generation.polishRiskFormatting')
                        : t('aiInterview.generation.polishRiskNeedsReview')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={primaryButtonClass}
                        disabled={!isDraftCurrent}
                        onClick={() => acceptPolishSuggestion(suggestion)}
                      >
                        {t('aiInterview.generation.polishUseSuggestion')}
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => dismissPolishSuggestion(suggestion.id)}
                      >
                        {t('aiInterview.generation.polishKeepOriginal')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {(!validation?.success || draft.generationError) && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {t('aiInterview.generation.schemaError')}
            </p>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950/50">
            <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              {t('aiInterview.generation.previewTitle')}
            </h5>
            <div className="max-h-[420px] overflow-auto rounded-lg bg-white p-2 shadow-inner dark:bg-slate-900">
              <ResumePreview
                resume={draft.resume}
                activeSections={deriveSectionsFromResume(draft.resume)}
                templateStyle="modern"
              />
            </div>
          </div>

          <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-white">
              {t('aiInterview.generation.editTitle')}
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {editField(
                t('aiInterview.generation.fields.name'),
                draft.resume.personal.fullName,
                (value) => setPersonalField('fullName', value),
              )}
              {editField(
                t('aiInterview.generation.fields.title'),
                draft.resume.personal.title,
                (value) => setPersonalField('title', value),
              )}
              {editField(
                t('aiInterview.generation.fields.email'),
                draft.resume.personal.email,
                (value) => setPersonalField('email', value),
              )}
              {editField(
                t('aiInterview.generation.fields.phone'),
                draft.resume.personal.phone,
                (value) => setPersonalField('phone', value),
              )}
              {editField(
                t('aiInterview.generation.fields.location'),
                draft.resume.personal.location,
                (value) => setPersonalField('location', value),
              )}
              {editField(
                t('aiInterview.generation.fields.summary'),
                draft.resume.personal.summary,
                (value) => setPersonalField('summary', value),
                true,
              )}
            </div>
            {draft.resume.experience.map((item, index) => (
              <fieldset
                key={item.id}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2"
              >
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('aiInterview.generation.experience', { index: index + 1 })}
                </legend>
                {editField(t('aiInterview.generation.fields.company'), item.company, (value) =>
                  setExperienceField(index, 'company', value),
                )}
                {editField(t('aiInterview.generation.fields.role'), item.role, (value) =>
                  setExperienceField(index, 'role', value),
                )}
                {editField(t('aiInterview.generation.fields.location'), item.location, (value) =>
                  setExperienceField(index, 'location', value),
                )}
                {editField(t('aiInterview.generation.fields.startDate'), item.startDate, (value) =>
                  setExperienceField(index, 'startDate', value),
                )}
                {editField(t('aiInterview.generation.fields.endDate'), item.endDate, (value) =>
                  setExperienceField(index, 'endDate', value),
                )}
                {editField(
                  t('aiInterview.generation.fields.highlights'),
                  item.highlights.join('\n'),
                  (value) => setExperienceField(index, 'highlights', value),
                  true,
                  t('aiInterview.generation.responsibilityBoundary'),
                )}
              </fieldset>
            ))}
            {draft.resume.projects.map((item, index) => (
              <fieldset
                key={item.id}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2"
              >
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('aiInterview.generation.project', { index: index + 1 })}
                </legend>
                {editField(t('aiInterview.generation.fields.project'), item.name, (value) =>
                  setProjectField(index, 'name', value),
                )}
                {editField(t('aiInterview.generation.fields.role'), item.role, (value) =>
                  setProjectField(index, 'role', value),
                )}
                {editField(t('aiInterview.generation.fields.link'), item.link, (value) =>
                  setProjectField(index, 'link', value),
                )}
                {editField(
                  t('aiInterview.generation.fields.summary'),
                  item.summary,
                  (value) => setProjectField(index, 'summary', value),
                  true,
                )}
                {editField(
                  t('aiInterview.generation.fields.highlights'),
                  item.highlights.join('\n'),
                  (value) => setProjectField(index, 'highlights', value),
                  true,
                  t('aiInterview.generation.responsibilityBoundary'),
                )}
              </fieldset>
            ))}
            {draft.resume.education.map((item, index) => (
              <fieldset
                key={item.id}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2"
              >
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('aiInterview.generation.education', { index: index + 1 })}
                </legend>
                {editField(t('aiInterview.generation.fields.school'), item.school, (value) =>
                  setEducationField(index, 'school', value),
                )}
                {editField(t('aiInterview.generation.fields.degree'), item.degree, (value) =>
                  setEducationField(index, 'degree', value),
                )}
                {editField(t('aiInterview.generation.fields.startDate'), item.startDate, (value) =>
                  setEducationField(index, 'startDate', value),
                )}
                {editField(t('aiInterview.generation.fields.endDate'), item.endDate, (value) =>
                  setEducationField(index, 'endDate', value),
                )}
                {editField(
                  t('aiInterview.generation.fields.details'),
                  item.details,
                  (value) => setEducationField(index, 'details', value),
                  true,
                )}
              </fieldset>
            ))}
            {editField(
              t('aiInterview.generation.fields.skills'),
              draft.resume.skills.flatMap((group) => group.items).join('\n'),
              setSkills,
              true,
            )}
          </details>

          {hasCurrentReplacementConfirmation ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
              <h5 className="text-sm font-semibold text-rose-950 dark:text-rose-100">
                {t('aiInterview.generation.replaceTitle')}
              </h5>
              <p className="mt-1 text-xs leading-5 text-rose-900 dark:text-rose-200">
                {t('aiInterview.generation.replaceNotice')}
              </p>
              <label className="mt-3 flex min-h-11 items-start gap-3 text-sm leading-5 text-rose-950 dark:text-rose-100">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-rose-400 accent-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  checked={replacementAcknowledged}
                  onChange={(event) => {
                    replacementAcknowledgedRef.current = event.target.checked;
                    setReplacementAcknowledged(event.target.checked);
                  }}
                />
                <span>{t('aiInterview.generation.replaceAcknowledgement')}</span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClass} onClick={cancelReplacement}>
                  {t('aiInterview.generation.cancel')}
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={!replacementAcknowledged || !isDraftCurrent || !draftIsValid}
                  onClick={applyDraft}
                >
                  {t('aiInterview.generation.confirmReplace')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={!isDraftCurrent || !draftIsValid}
                onClick={openReplacementConfirmation}
              >
                {t('aiInterview.generation.prepareReplace')}
              </button>
            </div>
          )}
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t('aiInterview.generation.includedFacts', { count: draft.includedFactIds.length })}
          </p>
        </div>
      )}
    </section>
  );
};

const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getMissingFields = (resume: ResumeData, translate: (key: string) => string): string[] => {
  const missing: string[] = [];
  if (!resume.personal.fullName?.trim()) missing.push(translate('name'));
  if (!resume.personal.title?.trim()) missing.push(translate('title'));
  if (!resume.personal.email?.trim() && !resume.personal.phone?.trim())
    missing.push(translate('contact'));
  if (!resume.personal.summary?.trim()) missing.push(translate('summary'));
  if (resume.experience.length === 0) missing.push(translate('experience'));
  else {
    if (resume.experience.some((item) => !item.company?.trim()))
      missing.push(translate('experienceCompany'));
    if (resume.experience.some((item) => !item.role?.trim()))
      missing.push(translate('experienceRole'));
    if (resume.experience.some((item) => !item.startDate?.trim() && !item.endDate?.trim()))
      missing.push(translate('experienceDates'));
  }
  if (resume.projects.length === 0) missing.push(translate('projects'));
  else if (resume.projects.some((item) => !item.name?.trim()))
    missing.push(translate('projectName'));
  if (resume.education.length === 0) missing.push(translate('education'));
  else {
    if (resume.education.some((item) => !item.school?.trim()))
      missing.push(translate('educationSchool'));
    if (resume.education.some((item) => !item.degree?.trim()))
      missing.push(translate('educationDegree'));
  }
  if (resume.skills.every((group) => group.items.length === 0)) missing.push(translate('skills'));
  return missing;
};

export default ResumeGenerationPanel;
