/* eslint-disable tailwindcss/no-custom-classname -- This panel uses its own scoped stylesheet. */
import './AIEnhancementInlinePanel.css';

import { useResumeStore } from '@entities/resume';
import { useI18n } from '@shared/i18n';
import { useCallback, useMemo, useRef, useState } from 'react';

import { diffText } from '../lib/diffText';
import { readEnhancementTarget } from '../lib/targetResolver';
import { validateEditedCandidate } from '../lib/validateEnhancementResult';
import { useAIResumeEnhancementContext } from '../model/AIResumeEnhancementContext';
import type {
  AIEnhancementFieldValue,
  AIEnhancementSession,
  AIEnhancementTarget,
} from '../model/types';

type SummaryTarget = Extract<AIEnhancementTarget, { kind: 'personal-summary' }>;
type SelectionRange = {
  start: number;
  end: number;
  direction: 'forward' | 'backward' | 'none';
};
type TerminalState = 'ACCEPTED' | 'REJECTED' | null;

type AIEnhancementInlinePanelProps = {
  target: SummaryTarget;
  fieldLabel: string;
  sourceValue: AIEnhancementFieldValue | null;
  sourceRevision: number;
  workspaceGeneration: number;
  selectionRange: SelectionRange | null;
  onAccept: (session: AIEnhancementSession) => boolean;
  onReject: () => void;
  onDone: () => void;
  onConfigureProvider: () => void;
};

const displayValue = (value: AIEnhancementFieldValue | null): string =>
  Array.isArray(value) ? value.join('\n') : (value ?? '');

const valuesEqual = (
  left: AIEnhancementFieldValue | null,
  right: AIEnhancementFieldValue,
): boolean => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => item === right[index]);
  }
  return typeof left === 'string' && typeof right === 'string' && left === right;
};

const AIEnhancementInlinePanel = ({
  target,
  fieldLabel,
  sourceValue,
  sourceRevision,
  workspaceGeneration,
  selectionRange,
  onAccept,
  onReject,
  onDone,
  onConfigureProvider,
}: AIEnhancementInlinePanelProps) => {
  const { t, locale } = useI18n();
  const controller = useAIResumeEnhancementContext();
  const currentResume = useResumeStore((state) => state.resume);
  const currentWorkspaceGeneration = useResumeStore((state) => state.workspaceGeneration);
  const generateButtonRef = useRef<HTMLButtonElement | null>(null);
  const [terminalState, setTerminalState] = useState<TerminalState>(null);
  const [terminalValue, setTerminalValue] = useState<string | null>(null);
  const [requestSourceRevision, setRequestSourceRevision] = useState<number | null>(null);
  const { session } = controller;
  const inlineSession = session?.target.kind === target.kind ? session : null;
  const lifecycleStatus = inlineSession?.status as string | undefined;
  const currentTarget = readEnhancementTarget(currentResume, target);
  const currentSourceValue = currentTarget.status === 'found' ? currentTarget.value : null;
  const controllerTerminalState: TerminalState =
    lifecycleStatus === 'accepted'
      ? 'ACCEPTED'
      : lifecycleStatus === 'rejected'
        ? 'REJECTED'
        : null;
  const isGenerating =
    inlineSession?.status === 'streaming' || inlineSession?.status === 'validating';
  const sourceText = displayValue(currentSourceValue ?? sourceValue);
  const isStale = Boolean(
    inlineSession &&
      (inlineSession.errorCode === 'source_changed' ||
        inlineSession.errorCode === 'workspace_changed' ||
        inlineSession.errorCode === 'target_missing' ||
        (controllerTerminalState === null &&
          (inlineSession.workspaceGeneration !== currentWorkspaceGeneration ||
            currentSourceValue === null ||
            !valuesEqual(currentSourceValue, inlineSession.original)))),
  );
  const candidateValidation = useMemo(
    () =>
      inlineSession?.status === 'suggested'
        ? validateEditedCandidate(inlineSession.candidate, target, inlineSession.original)
        : null,
    [inlineSession, target],
  );
  const diff = useMemo(
    () =>
      inlineSession?.status === 'suggested'
        ? diffText(inlineSession.originalText, inlineSession.candidate)
        : [],
    [inlineSession],
  );
  const state =
    controllerTerminalState ??
    terminalState ??
    (isStale
      ? 'STALE'
      : isGenerating
        ? 'GENERATING'
        : inlineSession?.status === 'suggested'
          ? 'SUGGESTION_READY'
          : inlineSession?.status === 'cancelled'
            ? 'CANCELLED'
            : inlineSession?.status === 'error'
              ? 'FAILED'
              : 'IDLE');
  const canDecide =
    inlineSession?.status === 'suggested' &&
    !isStale &&
    !isGenerating &&
    Boolean(candidateValidation?.ok);
  const acceptedValue =
    terminalValue ??
    (controllerTerminalState === 'ACCEPTED' ? (inlineSession?.candidate ?? null) : null);

  const handleGenerate = useCallback(() => {
    const opener = generateButtonRef.current;
    if (!opener || isGenerating || !sourceText.trim()) return;
    if (!controller.isConfigured) {
      onConfigureProvider();
      return;
    }

    setTerminalState(null);
    setTerminalValue(null);
    setRequestSourceRevision(sourceRevision);
    if (!inlineSession || inlineSession.presentation !== 'inline') {
      controller.open(target, opener, {
        presentation: 'inline',
        sourceRevision,
        selectionRange,
      });
    }
    void controller.generate(locale === 'en' ? 'en' : 'zh-CN');
  }, [
    controller,
    isGenerating,
    locale,
    onConfigureProvider,
    selectionRange,
    sourceRevision,
    sourceText,
    target,
  ]);

  const handleAccept = useCallback(() => {
    if (
      !inlineSession ||
      inlineSession.status !== 'suggested' ||
      isStale ||
      !candidateValidation?.ok
    ) {
      return;
    }

    if (onAccept(inlineSession)) {
      setTerminalValue(inlineSession.candidate);
      setTerminalState('ACCEPTED');
    }
  }, [candidateValidation, inlineSession, isStale, onAccept]);

  const handleReject = useCallback(() => {
    if (!inlineSession || !canDecide) return;
    onReject();
    setTerminalValue(null);
    setTerminalState('REJECTED');
  }, [canDecide, inlineSession, onReject]);

  const errorMessage = (() => {
    if (inlineSession?.providerErrorCode) {
      return t(`aiProvider.errors.${inlineSession.providerErrorCode}`, {
        status: inlineSession.providerStatusCode ?? '',
      });
    }
    if (inlineSession?.errorCode) {
      return t(`aiEnhancement.errors.${inlineSession.errorCode}`);
    }
    return '';
  })();

  const statusMessage = (() => {
    switch (state) {
      case 'GENERATING': {
        return inlineSession?.status === 'validating'
          ? t('aiEnhancement.validating')
          : t('aiEnhancement.generating');
      }
      case 'SUGGESTION_READY': {
        return t('aiEnhancement.suggestionReady');
      }
      case 'ACCEPTED': {
        return t('editor.pcStudio.aiAccepted');
      }
      case 'REJECTED': {
        return t('editor.pcStudio.aiRejected');
      }
      case 'CANCELLED': {
        return t('aiEnhancement.cancelled');
      }
      case 'STALE': {
        return t('editor.pcStudio.aiStale');
      }
      case 'FAILED': {
        return errorMessage;
      }
      default: {
        return '';
      }
    }
  })();

  return (
    <section
      className="ai-enhancement-inline"
      aria-label={fieldLabel}
      data-testid="pc-ai-inline-panel"
      data-ai-state={state}
      data-source-revision={sourceRevision}
      data-workspace-generation={workspaceGeneration}
      data-request-source-revision={requestSourceRevision ?? ''}
      data-selection-start={selectionRange?.start ?? ''}
      data-selection-end={selectionRange?.end ?? ''}
      data-selection-direction={selectionRange?.direction ?? ''}
    >
      <header className="ai-enhancement-inline__header">
        <div>
          <span className="ai-enhancement-inline__eyebrow">{t('aiEnhancement.title')}</span>
          <h3>{fieldLabel}</h3>
        </div>
        <span className="ai-enhancement-inline__source-label">{t('aiEnhancement.original')}</span>
      </header>

      <div className="ai-enhancement-inline__source" data-testid="pc-ai-inline-source">
        <strong>{t('aiEnhancement.original')}</strong>
        <p>
          {(inlineSession?.originalText ?? displayValue(sourceValue)) ||
            t('aiEnhancement.emptyOriginal')}
        </p>
      </div>
      <div className="ai-enhancement-inline__stale-source" data-testid="pc-ai-current-source">
        <span>{t('editor.pcStudio.currentField')}</span>
        <p>{sourceText || t('aiEnhancement.emptyOriginal')}</p>
      </div>

      {!controller.isConfigured && (
        <div className="ai-enhancement-inline__setup" role="status">
          <p>{t('aiEnhancement.providerNotConfigured')}</p>
          <button type="button" onClick={onConfigureProvider}>
            {t('editor.pcStudio.configureProvider')}
          </button>
        </div>
      )}

      {isGenerating && inlineSession && (
        <div className="ai-enhancement-inline__progress">
          <div className="ai-enhancement-inline__section-heading">
            <h4>{t('aiEnhancement.livePreview')}</h4>
          </div>
          <pre className="ai-enhancement-inline__stream" data-testid="pc-ai-inline-stream">
            {inlineSession.preview || t('aiEnhancement.waitingForContent')}
          </pre>
        </div>
      )}

      {inlineSession?.status === 'suggested' && (
        <div className={`ai-enhancement-inline__suggestion${isStale ? ' is-stale' : ''}`}>
          <span className="ai-enhancement-inline__suggestion-label">
            {t('aiEnhancement.suggestion')}
          </span>
          <label className="ai-enhancement-inline__draft-label" htmlFor="ai-enhancement-draft">
            {t('aiEnhancement.suggestion')}
          </label>
          <textarea
            id="ai-enhancement-draft"
            className="ai-enhancement-inline__candidate"
            data-testid="pc-ai-inline-candidate"
            value={inlineSession.candidate}
            onChange={(event) => controller.setCandidate(event.currentTarget.value)}
            spellCheck
            rows={8}
            aria-label={t('aiEnhancement.suggestion')}
          />
          <div
            className="ai-enhancement-inline__diff"
            aria-label="Text changes"
            data-testid="pc-ai-inline-diff"
          >
            {diff.map((part, index) =>
              part.kind === 'same' ? (
                <span key={index}>{part.text}</span>
              ) : part.kind === 'insert' ? (
                <ins key={index}>{part.text}</ins>
              ) : (
                <del key={index}>{part.text}</del>
              ),
            )}
          </div>
          {candidateValidation && !candidateValidation.ok && !isStale && (
            <p className="ai-enhancement-inline__validation" role="alert">
              {t(`aiEnhancement.errors.${candidateValidation.error}`)}
            </p>
          )}
        </div>
      )}

      {state === 'STALE' && (
        <p className="ai-enhancement-inline__status is-stale" role="alert">
          {statusMessage}
        </p>
      )}
      {state !== 'STALE' && statusMessage && (
        <p
          className={`ai-enhancement-inline__status${state === 'FAILED' ? ' is-error' : ''}`}
          role={state === 'FAILED' ? 'alert' : 'status'}
          aria-live={state === 'GENERATING' ? 'polite' : undefined}
        >
          {statusMessage}
        </p>
      )}

      {state === 'STALE' && inlineSession?.status === 'suggested' && (
        <div className="ai-enhancement-inline__stale-source">
          <span>{t('editor.pcStudio.currentField')}</span>
          <p>{sourceText}</p>
        </div>
      )}

      {state === 'ACCEPTED' && acceptedValue && (
        <div className="ai-enhancement-inline__accepted" data-testid="pc-ai-inline-accepted">
          <p>{acceptedValue}</p>
        </div>
      )}

      <div className="ai-enhancement-inline__actions">
        {isGenerating ? (
          <button
            type="button"
            className="ai-enhancement-inline__secondary"
            onClick={controller.cancelGeneration}
          >
            {t('aiEnhancement.cancelRequest')}
          </button>
        ) : (
          <button
            ref={generateButtonRef}
            type="button"
            className="ai-enhancement-inline__primary"
            onClick={handleGenerate}
            disabled={!sourceText.trim()}
            data-testid="pc-ai-inline-generate"
          >
            {inlineSession?.status === 'suggested' ||
            inlineSession?.status === 'error' ||
            state === 'STALE'
              ? t('aiEnhancement.regenerate')
              : t('aiEnhancement.generate')}
          </button>
        )}

        {inlineSession &&
          state !== 'ACCEPTED' &&
          state !== 'REJECTED' &&
          !isGenerating &&
          inlineSession.status !== 'cancelled' && (
            <button
              type="button"
              className="ai-enhancement-inline__secondary"
              onClick={handleReject}
              disabled={!canDecide}
              data-testid="pc-ai-inline-reject"
            >
              {t('aiEnhancement.keepOriginal')}
            </button>
          )}

        {(inlineSession?.status === 'suggested' || state === 'STALE') && (
          <button
            type="button"
            className="ai-enhancement-inline__apply"
            onClick={handleAccept}
            disabled={!canDecide}
            data-testid="pc-ai-inline-apply"
          >
            {t('aiEnhancement.apply')}
          </button>
        )}
        {(state === 'ACCEPTED' || state === 'REJECTED') && (
          <button
            type="button"
            className="ai-enhancement-inline__secondary"
            onClick={onDone}
            data-testid="pc-ai-inline-done"
          >
            {t('aiEnhancement.close')}
          </button>
        )}
      </div>

      <p className="ai-enhancement-inline__privacy">{t('aiEnhancement.privacyNotice')}</p>
    </section>
  );
};

export default AIEnhancementInlinePanel;
