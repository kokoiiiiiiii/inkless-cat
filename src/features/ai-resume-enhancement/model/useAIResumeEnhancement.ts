import { useResumeStore } from '@entities/resume';
import {
  type ChatCompletionResult,
  type ChatMessage,
  type CompleteOptions,
  type ProviderConfig,
  type ProviderConnectionStatus,
  ProviderError,
  type StreamCompleteOptions,
} from '@shared/api/ai';
import { useI18n } from '@shared/i18n';
import { useAppFeedback } from '@shared/ui/feedback';
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';

import { buildEnhancementPrompt } from '../lib/buildEnhancementPrompt';
import {
  AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS,
  measureEnhancementInputCodeUnits,
} from '../lib/inputBudget';
import {
  areEnhancementValuesEqual,
  displayEnhancementValue,
  readEnhancementTarget,
  writeEnhancementTarget,
} from '../lib/targetResolver';
import {
  type EnhancementValidationError,
  getEnhancementOutputCodeUnitLimit,
  validateEditedCandidate,
  validateEnhancementResult,
} from '../lib/validateEnhancementResult';
import type {
  AIEnhancementErrorCode,
  AIEnhancementFieldValue,
  AIEnhancementLocale,
  AIEnhancementMode,
  AIEnhancementSession,
  AIEnhancementTarget,
} from './types';

export type AIEnhancementProviderClient = {
  configuration: Readonly<ProviderConfig> | null;
  isConfigured: boolean;
  connectionStatus: ProviderConnectionStatus;
  complete: (messages: ChatMessage[], options?: CompleteOptions) => Promise<ChatCompletionResult>;
  streamComplete: (
    messages: ChatMessage[],
    options: StreamCompleteOptions,
  ) => Promise<ChatCompletionResult>;
};

type ActiveRequest = {
  id: number;
  sessionId: number;
  controller: AbortController;
  target: AIEnhancementTarget;
  source: AIEnhancementFieldValue;
  workspaceGeneration: number;
  providerConfiguration: Readonly<ProviderConfig> | null;
};

type UndoSnapshot = {
  id: number;
  target: AIEnhancementTarget;
  before: AIEnhancementFieldValue;
  applied: AIEnhancementFieldValue;
  workspaceGeneration: number;
  valid: boolean;
  invalidReason?: 'field' | 'target' | 'workspace';
};

export type AIResumeEnhancementController = {
  session: AIEnhancementSession | null;
  isConfigured: boolean;
  connectionStatus: ProviderConnectionStatus;
  openerRef: MutableRefObject<HTMLButtonElement | null>;
  open: (target: AIEnhancementTarget, opener: HTMLButtonElement) => void;
  close: () => void;
  setMode: (mode: AIEnhancementMode) => void;
  setCandidate: (candidate: string) => void;
  generate: (locale: AIEnhancementLocale) => Promise<void>;
  cancelGeneration: () => void;
  apply: () => void;
};

const copyValue = (value: AIEnhancementFieldValue): AIEnhancementFieldValue =>
  Array.isArray(value) ? [...value] : value;

const validationErrorToSessionCode = (error: EnhancementValidationError): AIEnhancementErrorCode =>
  error;

const providerSignatureChanged = (
  initial: Readonly<ProviderConfig> | null,
  current: Readonly<ProviderConfig> | null,
) => initial !== current;

export const useAIResumeEnhancement = (
  provider: AIEnhancementProviderClient,
): AIResumeEnhancementController => {
  const { t } = useI18n();
  const { showInfo, showUndo } = useAppFeedback();
  const [session, setSession] = useState<AIEnhancementSession | null>(null);
  const sessionRef = useRef<AIEnhancementSession | null>(null);
  const activeRequestRef = useRef<ActiveRequest | null>(null);
  const undoSnapshotRef = useRef<UndoSnapshot | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const sessionSequence = useRef(0);
  const requestSequence = useRef(0);
  const undoSequence = useRef(0);
  const previewBufferRef = useRef<{
    requestId: number;
    sessionId: number;
    parts: string[];
  } | null>(null);
  const previewFlushTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const updateSession = useCallback(
    (
      next:
        | AIEnhancementSession
        | null
        | ((current: AIEnhancementSession | null) => AIEnhancementSession | null),
    ) => {
      const resolved = typeof next === 'function' ? next(sessionRef.current) : next;
      sessionRef.current = resolved;
      setSession(resolved);
    },
    [],
  );

  const clearPreviewTimer = useCallback(() => {
    if (previewFlushTimerRef.current !== null) {
      globalThis.clearTimeout(previewFlushTimerRef.current);
      previewFlushTimerRef.current = null;
    }
  }, []);

  const flushPreview = useCallback(
    (requestId: number) => {
      clearPreviewTimer();
      const buffer = previewBufferRef.current;
      const active = activeRequestRef.current;
      if (!buffer || buffer.requestId !== requestId || active?.id !== requestId) return;
      if (sessionRef.current?.id !== buffer.sessionId || active.controller.signal.aborted) return;
      const preview = buffer.parts.join('');
      updateSession((current) =>
        current?.id === buffer.sessionId && current.status === 'streaming'
          ? { ...current, preview }
          : current,
      );
    },
    [clearPreviewTimer, updateSession],
  );

  const discardPreview = useCallback(
    (requestId?: number) => {
      clearPreviewTimer();
      if (requestId === undefined || previewBufferRef.current?.requestId === requestId) {
        previewBufferRef.current = null;
      }
    },
    [clearPreviewTimer],
  );

  const abortActiveRequest = useCallback(() => {
    requestSequence.current += 1;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    discardPreview();
  }, [discardPreview]);

  const failActiveRequest = useCallback(
    (errorCode: AIEnhancementErrorCode) => {
      const active = activeRequestRef.current;
      if (!active) return;
      requestSequence.current += 1;
      active.controller.abort();
      activeRequestRef.current = null;
      discardPreview(active.id);
      updateSession((current) =>
        current?.id === active.sessionId
          ? {
              ...current,
              status: 'error',
              preview: '',
              candidate: '',
              errorCode,
              providerErrorCode: undefined,
            }
          : current,
      );
    },
    [discardPreview, updateSession],
  );

  const open = useCallback(
    (target: AIEnhancementTarget, opener: HTMLButtonElement) => {
      abortActiveRequest();
      openerRef.current = opener;
      const current = useResumeStore.getState();
      const resolved = readEnhancementTarget(current.resume, target);
      if (resolved.status !== 'found') return;
      sessionSequence.current += 1;
      updateSession({
        id: sessionSequence.current,
        target,
        original: copyValue(resolved.value),
        originalText: displayEnhancementValue(resolved.value),
        workspaceGeneration: current.workspaceGeneration,
        mode: 'professional',
        status: 'idle',
        preview: '',
        candidate: '',
      });
    },
    [abortActiveRequest, updateSession],
  );

  const close = useCallback(() => {
    abortActiveRequest();
    updateSession(null);
  }, [abortActiveRequest, updateSession]);

  const setMode = useCallback(
    (mode: AIEnhancementMode) => {
      updateSession((current) =>
        current
          ? {
              ...current,
              mode,
              status: 'idle',
              preview: '',
              candidate: '',
              errorCode: undefined,
              providerErrorCode: undefined,
              inputCodeUnits: undefined,
            }
          : current,
      );
    },
    [updateSession],
  );

  const setCandidate = useCallback(
    (candidate: string) => {
      updateSession((current) => (current ? { ...current, candidate } : current));
    },
    [updateSession],
  );

  const generate = useCallback(
    async (locale: AIEnhancementLocale) => {
      const currentSession = sessionRef.current;
      if (
        !currentSession ||
        currentSession.status === 'streaming' ||
        currentSession.status === 'validating' ||
        !provider.isConfigured
      )
        return;
      abortActiveRequest();

      const latest = useResumeStore.getState();
      const resolved = readEnhancementTarget(latest.resume, currentSession.target);
      if (resolved.status !== 'found') {
        updateSession((current) =>
          current?.id === currentSession.id
            ? {
                ...current,
                status: 'error',
                preview: '',
                candidate: '',
                errorCode: 'target_missing',
              }
            : current,
        );
        return;
      }
      if (!displayEnhancementValue(resolved.value).trim()) {
        updateSession((current) =>
          current?.id === currentSession.id
            ? { ...current, status: 'error', preview: '', candidate: '', errorCode: 'empty_source' }
            : current,
        );
        return;
      }

      const source = copyValue(resolved.value);
      const inputCodeUnits = measureEnhancementInputCodeUnits(source);
      if (inputCodeUnits > AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS) {
        updateSession((current) =>
          current?.id === currentSession.id
            ? {
                ...current,
                original: source,
                originalText: displayEnhancementValue(source),
                workspaceGeneration: latest.workspaceGeneration,
                status: 'error',
                preview: '',
                candidate: '',
                errorCode: 'input_too_long',
                providerErrorCode: undefined,
                providerStatusCode: undefined,
                inputCodeUnits,
              }
            : current,
        );
        return;
      }

      const requestId = ++requestSequence.current;
      const controller = new AbortController();
      const activeRequest: ActiveRequest = {
        id: requestId,
        sessionId: currentSession.id,
        controller,
        target: currentSession.target,
        source,
        workspaceGeneration: latest.workspaceGeneration,
        providerConfiguration: provider.configuration,
      };
      activeRequestRef.current = activeRequest;
      previewBufferRef.current = { requestId, sessionId: currentSession.id, parts: [] };
      updateSession((current) =>
        current?.id === currentSession.id
          ? {
              ...current,
              original: source,
              originalText: displayEnhancementValue(source),
              workspaceGeneration: latest.workspaceGeneration,
              status: 'streaming',
              preview: '',
              candidate: '',
              errorCode: undefined,
              providerErrorCode: undefined,
              inputCodeUnits: undefined,
            }
          : current,
      );

      try {
        const result = await provider.streamComplete(
          buildEnhancementPrompt({
            target: currentSession.target,
            mode: currentSession.mode,
            locale,
            source,
          }),
          {
            signal: controller.signal,
            maxOutputCodeUnits: getEnhancementOutputCodeUnitLimit(currentSession.target, source),
            onDelta: (delta) => {
              const active = activeRequestRef.current;
              const buffer = previewBufferRef.current;
              if (
                !delta ||
                controller.signal.aborted ||
                active?.id !== requestId ||
                active.controller !== controller ||
                sessionRef.current?.id !== currentSession.id ||
                buffer?.requestId !== requestId
              ) {
                return;
              }
              buffer.parts.push(delta);
              if (previewFlushTimerRef.current === null) {
                previewFlushTimerRef.current = globalThis.setTimeout(
                  () => flushPreview(requestId),
                  40,
                );
              }
            },
          },
        );
        if (
          activeRequestRef.current?.id !== requestId ||
          sessionRef.current?.id !== currentSession.id
        ) {
          return;
        }
        clearPreviewTimer();
        updateSession((current) =>
          current?.id === currentSession.id && current.status === 'streaming'
            ? {
                ...current,
                status: 'validating',
                preview:
                  previewBufferRef.current?.requestId === requestId
                    ? previewBufferRef.current.parts.join('')
                    : current.preview,
              }
            : current,
        );

        const state = useResumeStore.getState();
        if (state.workspaceGeneration !== latest.workspaceGeneration) {
          failActiveRequest('workspace_changed');
          return;
        }
        const currentTarget = readEnhancementTarget(state.resume, currentSession.target);
        if (currentTarget.status !== 'found') {
          failActiveRequest('target_missing');
          return;
        }
        if (!areEnhancementValuesEqual(currentTarget.value, source)) {
          failActiveRequest('source_changed');
          return;
        }

        const validation = validateEnhancementResult(result.content, currentSession.target, source);
        if (!validation.ok) {
          activeRequestRef.current = null;
          discardPreview(requestId);
          updateSession((current) =>
            current?.id === currentSession.id
              ? {
                  ...current,
                  status: 'error',
                  preview: '',
                  candidate: '',
                  errorCode: validationErrorToSessionCode(validation.error),
                }
              : current,
          );
          return;
        }

        activeRequestRef.current = null;
        discardPreview(requestId);
        updateSession((current) =>
          current?.id === currentSession.id
            ? {
                ...current,
                status: 'suggested',
                preview: '',
                candidate: displayEnhancementValue(validation.value),
                errorCode: undefined,
                providerErrorCode: undefined,
              }
            : current,
        );
      } catch (error) {
        if (
          activeRequestRef.current?.id !== requestId ||
          sessionRef.current?.id !== currentSession.id
        ) {
          return;
        }
        activeRequestRef.current = null;
        discardPreview(requestId);
        if (error instanceof ProviderError && error.code === 'cancelled') {
          const changed = providerSignatureChanged(
            activeRequest.providerConfiguration,
            provider.configuration,
          );
          updateSession((current) =>
            current?.id === currentSession.id
              ? {
                  ...current,
                  status: changed ? 'error' : 'cancelled',
                  preview: '',
                  candidate: '',
                  ...(changed
                    ? { errorCode: 'provider_changed' as const }
                    : { errorCode: undefined }),
                }
              : current,
          );
        } else if (error instanceof ProviderError) {
          updateSession((current) =>
            current?.id === currentSession.id
              ? {
                  ...current,
                  status: 'error',
                  preview: '',
                  candidate: '',
                  errorCode: 'provider_error',
                  providerErrorCode: error.code,
                  providerStatusCode: error.statusCode,
                }
              : current,
          );
        } else {
          updateSession((current) =>
            current?.id === currentSession.id
              ? {
                  ...current,
                  status: 'error',
                  preview: '',
                  candidate: '',
                  errorCode: 'provider_error',
                }
              : current,
          );
        }
      } finally {
        if (activeRequestRef.current?.id === requestId) activeRequestRef.current = null;
      }
    },
    [
      abortActiveRequest,
      clearPreviewTimer,
      discardPreview,
      failActiveRequest,
      flushPreview,
      provider,
      updateSession,
    ],
  );

  const cancelGeneration = useCallback(() => {
    if (!activeRequestRef.current) return;
    abortActiveRequest();
    updateSession((current) =>
      current
        ? { ...current, status: 'cancelled', preview: '', candidate: '', errorCode: undefined }
        : current,
    );
  }, [abortActiveRequest, updateSession]);

  const undo = useCallback(
    (snapshotId: number) => {
      const snapshot = undoSnapshotRef.current;
      if (!snapshot || snapshot.id !== snapshotId) return;
      undoSnapshotRef.current = null;

      const state = useResumeStore.getState();
      if (
        state.workspaceGeneration !== snapshot.workspaceGeneration ||
        snapshot.invalidReason === 'workspace'
      ) {
        showInfo(t('aiEnhancement.undoUnavailable'));
        return;
      }
      const current = readEnhancementTarget(state.resume, snapshot.target);
      if (
        !snapshot.valid ||
        current.status !== 'found' ||
        !areEnhancementValuesEqual(current.value, snapshot.applied)
      ) {
        showInfo(t('aiEnhancement.undoConflict'));
        return;
      }

      let restored = false;
      state.updateResume((draft) => {
        const draftTarget = readEnhancementTarget(draft, snapshot.target);
        if (
          state.workspaceGeneration === snapshot.workspaceGeneration &&
          draftTarget.status === 'found' &&
          areEnhancementValuesEqual(draftTarget.value, snapshot.applied)
        ) {
          restored = writeEnhancementTarget(draft, snapshot.target, snapshot.before);
        }
      });
      showInfo(restored ? t('aiEnhancement.undoComplete') : t('aiEnhancement.undoConflict'));
    },
    [showInfo, t],
  );

  const apply = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== 'suggested') return;
    const validation = validateEditedCandidate(
      currentSession.candidate,
      currentSession.target,
      currentSession.original,
    );
    if (!validation.ok) {
      updateSession((current) =>
        current?.id === currentSession.id
          ? {
              ...current,
              status: 'error',
              errorCode: validationErrorToSessionCode(validation.error),
            }
          : current,
      );
      return;
    }

    const state = useResumeStore.getState();
    if (state.workspaceGeneration !== currentSession.workspaceGeneration) {
      updateSession((current) =>
        current?.id === currentSession.id
          ? { ...current, status: 'error', errorCode: 'workspace_changed' }
          : current,
      );
      return;
    }
    const currentTarget = readEnhancementTarget(state.resume, currentSession.target);
    if (currentTarget.status !== 'found') {
      updateSession((current) =>
        current?.id === currentSession.id
          ? { ...current, status: 'error', errorCode: 'target_missing' }
          : current,
      );
      return;
    }
    if (!areEnhancementValuesEqual(currentTarget.value, currentSession.original)) {
      updateSession((current) =>
        current?.id === currentSession.id
          ? { ...current, status: 'error', errorCode: 'source_changed' }
          : current,
      );
      return;
    }

    let applied = false;
    state.updateResume((draft) => {
      const draftTarget = readEnhancementTarget(draft, currentSession.target);
      if (
        state.workspaceGeneration === currentSession.workspaceGeneration &&
        draftTarget.status === 'found' &&
        areEnhancementValuesEqual(draftTarget.value, currentSession.original)
      ) {
        applied = writeEnhancementTarget(draft, currentSession.target, validation.value);
      }
    });
    if (!applied) {
      updateSession((current) =>
        current?.id === currentSession.id
          ? { ...current, status: 'error', errorCode: 'source_changed' }
          : current,
      );
      return;
    }

    const undoSnapshot: UndoSnapshot = {
      id: ++undoSequence.current,
      target: currentSession.target,
      before: copyValue(currentSession.original),
      applied: copyValue(validation.value),
      workspaceGeneration: currentSession.workspaceGeneration,
      valid: true,
    };
    undoSnapshotRef.current = undoSnapshot;
    close();
    showUndo(t('aiEnhancement.applied'), () => undo(undoSnapshot.id), 12_000);
  }, [close, showUndo, t, undo, updateSession]);

  useEffect(() => {
    const unsubscribe = useResumeStore.subscribe((state) => {
      const active = activeRequestRef.current;
      if (active) {
        if (state.workspaceGeneration === active.workspaceGeneration) {
          const current = readEnhancementTarget(state.resume, active.target);
          const sourceChanged =
            current.status !== 'found' || !areEnhancementValuesEqual(current.value, active.source);
          if (sourceChanged) {
            failActiveRequest(current.status === 'found' ? 'source_changed' : 'target_missing');
          }
        } else {
          failActiveRequest('workspace_changed');
        }
      }

      const snapshot = undoSnapshotRef.current;
      if (!snapshot || !snapshot.valid) return;
      if (state.workspaceGeneration !== snapshot.workspaceGeneration) {
        snapshot.valid = false;
        snapshot.invalidReason = 'workspace';
        return;
      }
      const current = readEnhancementTarget(state.resume, snapshot.target);
      if (current.status !== 'found') {
        snapshot.valid = false;
        snapshot.invalidReason = 'target';
      } else if (!areEnhancementValuesEqual(current.value, snapshot.applied)) {
        snapshot.valid = false;
        snapshot.invalidReason = 'field';
      }
    });
    return unsubscribe;
  }, [failActiveRequest]);

  useEffect(() => {
    const active = activeRequestRef.current;
    if (active && providerSignatureChanged(active.providerConfiguration, provider.configuration)) {
      requestSequence.current += 1;
      active.controller.abort();
      activeRequestRef.current = null;
      discardPreview(active.id);
      updateSession((current) =>
        current && current.id === active.sessionId
          ? {
              ...current,
              status: 'error',
              preview: '',
              candidate: '',
              errorCode: 'provider_changed',
            }
          : current,
      );
    }
  }, [discardPreview, provider.configuration, updateSession]);

  useEffect(
    () => () => {
      abortActiveRequest();
      sessionRef.current = null;
      undoSnapshotRef.current = null;
    },
    [abortActiveRequest],
  );

  return {
    session,
    isConfigured: provider.isConfigured,
    connectionStatus: provider.connectionStatus,
    openerRef,
    open,
    close,
    setMode,
    setCandidate,
    generate,
    cancelGeneration,
    apply,
  };
};
