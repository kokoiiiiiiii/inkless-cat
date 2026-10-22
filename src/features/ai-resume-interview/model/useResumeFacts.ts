import { ProviderError } from '@shared/api/ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  confirmFactEntityLink as confirmFactEntityLinkOperation,
  createFactEntityLink,
  type CreateFactEntityLinkResult,
  type FactEntityLink,
  type FactEntitySeparation,
  keepFactEntitiesSeparate,
  validateFactEntityLinks,
} from './factEntityLinks';
import type { FactCandidate, FactKind, FactValueByKind, ResumeFact } from './facts';
import {
  buildFactExtractionMessages,
  createResumeFact,
  FACT_EXTRACTION_TIMEOUT_MS,
  FactExtractionError,
  getAnswerFingerprint,
  getAnswerId,
  getFactSource,
  invalidateStaleFacts,
  isFactCurrent,
  markConflicts,
  parseFactExtractionResponse,
  resolveFactConflicts,
  selectFactExtractionInput,
} from './facts';
import type { AIInterviewProviderClient, InterviewSession } from './types';

export type FactExtractionState = 'idle' | 'extracting' | 'failed' | 'cancelled' | 'timeout';

export type ResumeFactsController = {
  facts: ResumeFact[];
  entityLinks: FactEntityLink[];
  entitySeparations: FactEntitySeparation[];
  pendingCount: number;
  confirmedCount: number;
  conflictCount: number;
  staleCount: number;
  extractionState: FactExtractionState;
  errorCode: string | null;
  includedAnswerIds: string[];
  omittedAnswerCount: number;
  inputCodeUnits: number;
  extract: () => Promise<void>;
  cancelExtraction: () => void;
  updateFact: (factId: string, value: FactValueByKind[FactKind]) => void;
  confirmFact: (factId: string) => void;
  rejectFact: (factId: string) => void;
  removeFact: (factId: string) => void;
  addManualFact: (candidate: FactCandidate) => void;
  linkEntityFacts: (factIds: string[]) => CreateFactEntityLinkResult;
  unlinkEntityFacts: (entityId: string) => void;
  confirmEntityLink: (entityId: string) => boolean;
  keepEntityFactsSeparate: (factIds: string[]) => boolean;
};

const getProviderIdentity = (provider: AIInterviewProviderClient) => ({
  configuration: provider.configuration,
  streamComplete: provider.streamComplete,
});

export const useResumeFacts = (
  session: InterviewSession | null,
  provider: AIInterviewProviderClient,
  locale: 'zh-CN' | 'en',
): ResumeFactsController => {
  const [storedFacts, setStoredFacts] = useState<ResumeFact[]>([]);
  const [storedEntityLinks, setStoredEntityLinks] = useState<FactEntityLink[]>([]);
  const [entitySeparations, setEntitySeparations] = useState<FactEntitySeparation[]>([]);
  const [extractionState, setExtractionState] = useState<FactExtractionState>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [inputSummary, setInputSummary] = useState({
    answerIds: [] as string[],
    omitted: 0,
    codeUnits: 0,
  });
  const activeRequestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const requestSequenceRef = useRef(0);
  const entitySequenceRef = useRef(0);
  const previousSessionIdRef = useRef(session?.id ?? null);
  const facts = useMemo(
    () => (session ? invalidateStaleFacts(session, storedFacts) : []),
    [session, storedFacts],
  );
  const entityLinks = validateFactEntityLinks(session, facts, storedEntityLinks);
  const currentRef = useRef({
    session,
    provider: getProviderIdentity(provider),
    facts,
    entityLinks,
  });
  currentRef.current = { session, provider: getProviderIdentity(provider), facts, entityLinks };

  useEffect(() => {
    if (previousSessionIdRef.current === (session?.id ?? null)) return;
    previousSessionIdRef.current = session?.id ?? null;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setStoredFacts([]);
    setStoredEntityLinks([]);
    setEntitySeparations([]);
    setExtractionState('idle');
    setErrorCode(null);
    setInputSummary({ answerIds: [], omitted: 0, codeUnits: 0 });
  }, [session?.id]);

  useEffect(() => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest) return;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setExtractionState('cancelled');
    setErrorCode('provider_changed');
  }, [provider.configuration, provider.streamComplete]);

  useEffect(
    () => () => {
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!session) return;
    setStoredFacts((current) => {
      const next = invalidateStaleFacts(session, current);
      return next === current ? current : next;
    });
    setStoredEntityLinks((current) => {
      const next = validateFactEntityLinks(session, facts, current);
      return next.some((link, index) => link.status !== current[index]?.status) ? next : current;
    });
  }, [facts, session]);

  const extract = useCallback(async () => {
    const snapshot = currentRef.current;
    const sessionSnapshot = snapshot.session;
    if (!sessionSnapshot) {
      setErrorCode('no_answers');
      setExtractionState('failed');
      return;
    }
    if (!provider.isConfigured || !provider.configuration) {
      setErrorCode('provider_not_configured');
      setExtractionState('failed');
      return;
    }

    let input: ReturnType<typeof selectFactExtractionInput>;
    try {
      input = selectFactExtractionInput(sessionSnapshot);
    } catch (error) {
      setErrorCode(error instanceof FactExtractionError ? error.code : 'input_too_long');
      setExtractionState('failed');
      return;
    }

    const requestId = ++requestSequenceRef.current;
    const controller = new AbortController();
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = { id: requestId, controller };
    const sourceFingerprint = input.includedAnswers
      .map((answer) => `${getAnswerId(answer)}:${answer.updatedAt}:${answer.text}`)
      .join('\u0000');
    const providerIdentity = getProviderIdentity(provider);
    setInputSummary({
      answerIds: input.includedAnswers.map((answer) => getAnswerId(answer)),
      omitted: input.omittedAnswerCount,
      codeUnits: input.totalCodeUnits,
    });
    setErrorCode(null);
    setExtractionState('extracting');
    let didTimeout = false;
    const timeout = globalThis.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, FACT_EXTRACTION_TIMEOUT_MS);

    try {
      const response = await provider.streamComplete(
        buildFactExtractionMessages(sessionSnapshot, input.includedAnswers, locale),
        {
          signal: controller.signal,
          timeoutMs: FACT_EXTRACTION_TIMEOUT_MS,
          maxOutputCodeUnits: 18_000,
          onDelta: () => {},
        },
      );
      const current = currentRef.current;
      const currentIncluded = current.session?.answers
        .filter((answer) =>
          input.includedAnswers.some((item) => getAnswerId(item) === getAnswerId(answer)),
        )
        .map((answer) => `${getAnswerId(answer)}:${answer.updatedAt}:${answer.text}`)
        .join('\u0000');
      if (activeRequestRef.current?.id !== requestId) return;
      if (
        controller.signal.aborted ||
        current.session?.id !== sessionSnapshot.id ||
        currentIncluded !== sourceFingerprint ||
        current.provider.configuration !== providerIdentity.configuration ||
        current.provider.streamComplete !== providerIdentity.streamComplete
      ) {
        const providerChanged =
          current.provider.configuration !== providerIdentity.configuration ||
          current.provider.streamComplete !== providerIdentity.streamComplete;
        const sourceChanged =
          current.session?.id !== sessionSnapshot.id || currentIncluded !== sourceFingerprint;
        setExtractionState(didTimeout ? 'timeout' : 'cancelled');
        setErrorCode(
          didTimeout
            ? 'timeout'
            : providerChanged
              ? 'provider_changed'
              : sourceChanged
                ? 'source_changed'
                : 'cancelled',
        );
        return;
      }
      const nextFacts = parseFactExtractionResponse(
        response.content,
        sessionSnapshot,
        input.includedAnswers,
      );
      setStoredFacts((currentFacts) => markConflicts([...currentFacts, ...nextFacts]));
      setExtractionState('idle');
      setErrorCode(null);
    } catch (error) {
      if (activeRequestRef.current?.id !== requestId) return;
      if (didTimeout || (error instanceof ProviderError && error.code === 'timeout')) {
        setExtractionState('timeout');
        setErrorCode('timeout');
      } else if (
        controller.signal.aborted ||
        (error instanceof ProviderError && error.code === 'cancelled')
      ) {
        setExtractionState('cancelled');
        setErrorCode('cancelled');
      } else {
        setExtractionState('failed');
        setErrorCode(
          error instanceof FactExtractionError
            ? error.code
            : error instanceof ProviderError
              ? error.code
              : 'provider_error',
        );
      }
    } finally {
      globalThis.clearTimeout(timeout);
      if (activeRequestRef.current?.id === requestId) activeRequestRef.current = null;
    }
  }, [locale, provider]);

  const cancelExtraction = useCallback(() => {
    const request = activeRequestRef.current;
    if (!request) return;
    requestSequenceRef.current += 1;
    activeRequestRef.current = null;
    request.controller.abort();
    setExtractionState('cancelled');
    setErrorCode('cancelled');
  }, []);

  const updateFact = useCallback((factId: string, value: FactValueByKind[FactKind]) => {
    const currentSession = currentRef.current.session;
    setStoredFacts((current) =>
      markConflicts(
        current.map((fact) => {
          if (fact.id !== factId) return fact;
          const source = currentSession ? getFactSource(currentSession, fact) : null;
          if (!source) return { ...fact, value, status: 'stale' as const, updatedAt: Date.now() };
          return {
            ...fact,
            value,
            status: 'pending' as const,
            sourceAnswerVersion: source.answer.updatedAt,
            sourceFingerprint: getAnswerFingerprint(source.answer),
            updatedAt: Date.now(),
          };
        }),
      ),
    );
    setStoredEntityLinks((current) =>
      current.map((link) =>
        link.factIds.includes(factId) && link.status === 'active'
          ? { ...link, status: 'needs-review' as const }
          : link,
      ),
    );
  }, []);

  const confirmFact = useCallback((factId: string) => {
    setStoredFacts((current) => {
      const selected = current.find((fact) => fact.id === factId);
      const currentSession = currentRef.current.session;
      if (
        !selected ||
        selected.status === 'rejected' ||
        selected.status === 'stale' ||
        !currentSession ||
        !isFactCurrent(currentSession, selected)
      ) {
        return current;
      }
      const next = resolveFactConflicts(current, factId);
      return markConflicts(next);
    });
  }, []);

  const rejectFact = useCallback((factId: string) => {
    setStoredFacts((current) =>
      markConflicts(
        current.map((fact) =>
          fact.id === factId
            ? {
                ...fact,
                status: 'rejected' as const,
                conflictKey: undefined,
                conflictKeys: undefined,
                conflictFields: undefined,
                updatedAt: Date.now(),
              }
            : fact,
        ),
      ),
    );
    setStoredEntityLinks((current) =>
      current.map((link) =>
        link.factIds.includes(factId) && link.status === 'active'
          ? { ...link, status: 'needs-review' as const }
          : link,
      ),
    );
  }, []);

  const removeFact = useCallback((factId: string) => {
    setStoredFacts((current) => current.filter((fact) => fact.id !== factId));
    setStoredEntityLinks((current) =>
      current.map((link) =>
        link.factIds.includes(factId) ? { ...link, status: 'invalid' as const } : link,
      ),
    );
    setEntitySeparations((current) => current.filter((item) => !item.factIds.includes(factId)));
  }, []);

  const linkEntityFacts = useCallback((factIds: string[]) => {
    const snapshot = currentRef.current;
    const result = createFactEntityLink(
      snapshot.session,
      snapshot.facts,
      snapshot.entityLinks,
      factIds,
      `entity-${++entitySequenceRef.current}`,
    );
    if (result.ok) setStoredEntityLinks((current) => [...current, result.link]);
    return result;
  }, []);

  const unlinkEntityFacts = useCallback((entityId: string) => {
    setStoredEntityLinks((current) => current.filter((link) => link.entityId !== entityId));
  }, []);

  const confirmEntityLink = useCallback((entityId: string) => {
    const snapshot = currentRef.current;
    const result = confirmFactEntityLinkOperation(
      snapshot.session,
      snapshot.facts,
      snapshot.entityLinks,
      entityId,
    );
    if (!result.ok) return false;
    setStoredEntityLinks((current) =>
      current.map((link) => (link.entityId === entityId ? result.link : link)),
    );
    return true;
  }, []);

  const keepEntityFactsSeparate = useCallback((factIds: string[]) => {
    const snapshot = currentRef.current;
    const next = keepFactEntitiesSeparate(snapshot.session, snapshot.facts, factIds);
    if (next.length === 0) return false;
    setEntitySeparations((current) => {
      const byPair = new Map(
        current.map((item) => [`${item.kind}:${item.factIds.join('|')}`, item] as const),
      );
      for (const item of next) byPair.set(`${item.kind}:${item.factIds.join('|')}`, item);
      return [...byPair.values()];
    });
    return true;
  }, []);

  const addManualFact = useCallback(
    (candidate: FactCandidate) => {
      if (!session) return;
      try {
        const fact = {
          ...createResumeFact(candidate, session, 'manual'),
        };
        setStoredFacts((current) => markConflicts([...current, fact]));
      } catch {
        setErrorCode('unknown_source');
      }
    },
    [session],
  );

  return {
    facts,
    entityLinks,
    entitySeparations,
    pendingCount: facts.filter((fact) => fact.status === 'pending').length,
    confirmedCount: facts.filter((fact) => fact.status === 'confirmed').length,
    conflictCount: facts.filter((fact) => fact.status === 'conflict').length,
    staleCount: facts.filter((fact) => fact.status === 'stale').length,
    extractionState,
    errorCode,
    includedAnswerIds: inputSummary.answerIds,
    omittedAnswerCount: inputSummary.omitted,
    inputCodeUnits: inputSummary.codeUnits,
    extract,
    cancelExtraction,
    updateFact,
    confirmFact,
    rejectFact,
    removeFact,
    addManualFact,
    linkEntityFacts,
    unlinkEntityFacts,
    confirmEntityLink,
    keepEntityFactsSeparate,
  };
};
