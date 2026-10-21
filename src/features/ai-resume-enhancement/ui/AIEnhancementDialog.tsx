import { useI18n } from '@shared/i18n';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS } from '../lib/inputBudget';
import { validateEditedCandidate } from '../lib/validateEnhancementResult';
import { useAIResumeEnhancementContext } from '../model/AIResumeEnhancementContext';
import type { AIEnhancementErrorCode, AIEnhancementMode } from '../model/types';

const closeButtonClass =
  'inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-400 motion-reduce:transition-none';
const fieldClass =
  'mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

const getFieldLabel = (kind: string, t: (key: string) => string) => {
  switch (kind) {
    case 'personal-summary': {
      return t('aiEnhancement.fields.personalSummary');
    }
    case 'experience-highlights': {
      return t('aiEnhancement.fields.experienceHighlights');
    }
    default: {
      return t('aiEnhancement.fields.projectSummary');
    }
  }
};

const AIEnhancementDialog = () => {
  const { t, locale } = useI18n();
  const {
    session,
    isConfigured,
    connectionStatus,
    openerRef,
    close,
    setMode,
    setCandidate,
    generate,
    cancelGeneration,
    apply,
  } = useAIResumeEnhancementContext();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isOpen = session !== null;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = openerRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    let isComposing = false;
    const focusableSelector =
      'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) =>
          element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null,
      );
    getFocusableElements()[0]?.focus();
    document.body.style.overflow = 'hidden';

    const handleCompositionStart = () => {
      isComposing = true;
    };
    const handleCompositionEnd = () => {
      isComposing = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (event.isComposing || event.keyCode === 229 || isComposing) return;
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements();
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (!dialog.contains(document.activeElement)) {
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('compositionstart', handleCompositionStart, true);
      document.removeEventListener('compositionend', handleCompositionEnd, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      opener?.focus();
    };
  }, [close, isOpen, openerRef]);

  if (!session) return null;

  const fieldLabel = getFieldLabel(session.target.kind, t);
  const modeKeys: AIEnhancementMode[] = ['professional', 'concise', 'expand', 'outcome'];
  const candidateValidation = validateEditedCandidate(
    session.candidate,
    session.target,
    session.original,
  );
  const isGenerating = session.status === 'generating';
  const errorMessage = (() => {
    if (session.providerErrorCode) {
      return t(`aiProvider.errors.${session.providerErrorCode}`, {
        status: session.providerStatusCode ?? '',
      });
    }
    if (session.errorCode === 'provider_error') {
      return t('aiEnhancement.errors.provider_error');
    }
    if (session.errorCode) {
      return t(`aiEnhancement.errors.${session.errorCode as AIEnhancementErrorCode}`);
    }
    return '';
  })();

  return createPortal(
    <div className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-950/50 px-2 py-2 dark:bg-black/70 sm:px-6 sm:py-5">
      <div
        ref={dialogRef}
        className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[calc(100dvh-2.5rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('aiEnhancement.title')}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {fieldLabel}
            </p>
          </div>
          <button
            type="button"
            className={closeButtonClass}
            onClick={close}
            aria-label={t('aiEnhancement.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isConfigured ? (
            <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
              {t(`aiEnhancement.providerStatus.${connectionStatus}`)}
            </p>
          ) : (
            <p
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              {t('aiEnhancement.providerNotConfigured')}
            </p>
          )}

          <div className="mt-4 grid gap-4">
            <div>
              <label
                htmlFor={`${titleId}-mode`}
                className="text-sm font-medium text-slate-800 dark:text-slate-100"
              >
                {t('aiEnhancement.modeLabel')}
              </label>
              <select
                id={`${titleId}-mode`}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={session.mode}
                disabled={isGenerating}
                onChange={(event) => setMode(event.currentTarget.value as AIEnhancementMode)}
              >
                {modeKeys.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`aiEnhancement.modes.${mode}.label`)}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t(`aiEnhancement.modes.${session.mode}.description`)}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {t('aiEnhancement.original')}
              </h3>
              <div className="mt-2 max-h-48 min-h-20 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                {session.originalText || t('aiEnhancement.emptyOriginal')}
              </div>
            </div>

            {session.status === 'suggested' && (
              <div>
                <label
                  htmlFor={`${titleId}-candidate`}
                  className="text-sm font-medium text-slate-800 dark:text-slate-100"
                >
                  {t('aiEnhancement.suggestion')}
                </label>
                <textarea
                  id={`${titleId}-candidate`}
                  className={fieldClass}
                  rows={session.target.kind === 'experience-highlights' ? 6 : 5}
                  value={session.candidate}
                  onChange={(event) => setCandidate(event.currentTarget.value)}
                />
                {!candidateValidation.ok && (
                  <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-300" role="alert">
                    {t(`aiEnhancement.errors.${candidateValidation.error}`)}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {t('aiEnhancement.manualEditHint')}
                </p>
              </div>
            )}

            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              {t('aiEnhancement.privacyNotice')}
            </p>

            {isGenerating && (
              <p
                className="text-sm text-slate-700 dark:text-slate-200"
                role="status"
                aria-live="polite"
              >
                {t('aiEnhancement.generating')}
              </p>
            )}
            {session.status === 'cancelled' && (
              <p
                className="text-sm text-slate-700 dark:text-slate-200"
                role="status"
                aria-live="polite"
              >
                {t('aiEnhancement.cancelled')}
              </p>
            )}
            {session.status === 'error' && errorMessage && (
              <div className="space-y-1 break-words">
                <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                  {errorMessage}
                </p>
                {session.errorCode === 'input_too_long' && (
                  <p
                    className="text-xs text-slate-600 dark:text-slate-300"
                    role="status"
                    aria-live="polite"
                  >
                    {t('aiEnhancement.inputBudget', {
                      current: session.inputCodeUnits ?? 0,
                      limit: AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS,
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/95 sm:px-6 sm:py-4">
          <button type="button" className={secondaryButtonClass} onClick={close}>
            {t('aiEnhancement.keepOriginal')}
          </button>
          {isGenerating ? (
            <button type="button" className={secondaryButtonClass} onClick={cancelGeneration}>
              {t('aiEnhancement.cancelRequest')}
            </button>
          ) : (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={!isConfigured || !session.originalText.trim()}
              onClick={() => void generate(locale === 'en' ? 'en' : 'zh-CN')}
            >
              {session.status === 'suggested' ||
              session.status === 'error' ||
              session.status === 'cancelled'
                ? t('aiEnhancement.regenerate')
                : t('aiEnhancement.generate')}
            </button>
          )}
          {session.status === 'suggested' && (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={!candidateValidation.ok}
              onClick={apply}
            >
              {t('aiEnhancement.apply')}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default AIEnhancementDialog;
