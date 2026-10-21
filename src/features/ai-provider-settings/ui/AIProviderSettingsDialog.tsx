import { useI18n } from '@shared/i18n';
import { type RefObject, useCallback, useEffect, useId, useRef, useState } from 'react';

import type { useAIProviderSettings } from '../model/useAIProviderSettings';

type AIProviderSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  settings: ReturnType<typeof useAIProviderSettings>;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const AIProviderSettingsDialog = ({
  open,
  onClose,
  settings,
  triggerRef,
}: AIProviderSettingsDialogProps) => {
  const { t, locale } = useI18n();
  const [showApiKey, setShowApiKey] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const baseUrlId = useId();
  const apiKeyId = useId();
  const modelId = useId();
  const baseUrlHelpId = useId();
  const apiKeyHelpId = useId();
  const modelHelpId = useId();
  const closeDialog = useCallback(() => {
    setShowApiKey(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = triggerRef.current;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
    getFocusableElements()[1]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [closeDialog, open, triggerRef]);

  if (!open) return null;

  const statusMessage = (() => {
    if (settings.testState.status === 'testing') return t('aiProvider.testing');
    if (settings.testState.status === 'success') {
      const time = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(settings.testState.testedAt);
      return t('aiProvider.success', { model: settings.testState.model, time });
    }
    if (settings.testState.status === 'cancelled') return t('aiProvider.cancelled');
    if (settings.testState.status === 'failure') {
      return `${t('aiProvider.failureTitle')}: ${t(
        `aiProvider.errors.${settings.testState.errorCode}`,
        { status: settings.testState.statusCode ?? '' },
      )}`;
    }

    switch (settings.connectionStatus) {
      case 'not_configured': {
        return t('aiProvider.notConfigured');
      }
      case 'incomplete': {
        return t('aiProvider.incomplete');
      }
      case 'invalid': {
        return settings.validationErrorCode
          ? t(`aiProvider.errors.${settings.validationErrorCode}`)
          : t('aiProvider.invalid');
      }
      case 'ready': {
        return settings.isSaved ? t('aiProvider.saved') : t('aiProvider.ready');
      }
      default: {
        return '';
      }
    }
  })();

  return (
    <div className="fixed inset-0 z-[60] flex min-h-dvh items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-5 dark:bg-black/70 sm:items-center sm:px-6">
      <div
        ref={dialogRef}
        className="my-auto max-h-[calc(100dvh-2.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-provider-settings-title"
        aria-describedby="ai-provider-settings-description"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="ai-provider-settings-title"
              className="text-xl font-semibold text-slate-900 dark:text-white"
            >
              {t('aiProvider.title')}
            </h2>
            <p
              id="ai-provider-settings-description"
              className="mt-1 text-sm text-slate-600 dark:text-slate-300"
            >
              {t('aiProvider.description')}
            </p>
          </div>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={closeDialog}
            aria-label={t('aiProvider.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor={baseUrlId}
              className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              {t('aiProvider.baseUrlLabel')}
            </label>
            <input
              id={baseUrlId}
              type="url"
              autoComplete="url"
              value={settings.form.baseUrl}
              onChange={(event) => settings.updateField('baseUrl', event.currentTarget.value)}
              placeholder="https://example.com/v1"
              aria-describedby={baseUrlHelpId}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <p
              id={baseUrlHelpId}
              className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              {t('aiProvider.baseUrlHelp')}
            </p>
          </div>

          <div>
            <label
              htmlFor={apiKeyId}
              className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              {t('aiProvider.apiKeyLabel')}
            </label>
            <div className="flex gap-2">
              <input
                id={apiKeyId}
                type={showApiKey ? 'text' : 'password'}
                autoComplete="new-password"
                spellCheck={false}
                value={settings.form.apiKey}
                onChange={(event) => settings.updateField('apiKey', event.currentTarget.value)}
                aria-describedby={apiKeyHelpId}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setShowApiKey((visible) => !visible)}
                aria-label={t(showApiKey ? 'aiProvider.hideKey' : 'aiProvider.showKey')}
                aria-pressed={showApiKey}
              >
                {t(showApiKey ? 'aiProvider.hideKey' : 'aiProvider.showKey')}
              </button>
            </div>
            <p
              id={apiKeyHelpId}
              className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              {t('aiProvider.apiKeyHelp')}
            </p>
          </div>

          <div>
            <label
              htmlFor={modelId}
              className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              {t('aiProvider.modelLabel')}
            </label>
            <input
              id={modelId}
              type="text"
              autoComplete="off"
              value={settings.form.model}
              onChange={(event) => settings.updateField('model', event.currentTarget.value)}
              placeholder="deepseek-chat"
              aria-describedby={modelHelpId}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <p
              id={modelHelpId}
              className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              {t('aiProvider.modelHelp')}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
          <p>{t('aiProvider.trustNote')}</p>
          <p>{t('aiProvider.probeCost')}</p>
          <p>{t('aiProvider.futureNote')}</p>
        </div>

        <div
          className="mt-4 min-h-10 rounded-lg text-sm text-slate-700 dark:text-slate-200"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusMessage}
        </div>

        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:flex-wrap sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              setShowApiKey(false);
              settings.clear();
            }}
          >
            {t('aiProvider.clear')}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={settings.saveForSession}
            disabled={!settings.canSave || settings.testState.status === 'testing'}
          >
            {settings.isSaved ? t('aiProvider.saved') : t('aiProvider.save')}
          </button>
          {settings.testState.status === 'testing' ? (
            <button type="button" className={secondaryButtonClass} onClick={settings.cancelTest}>
              {t('aiProvider.cancelTest')}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500"
              onClick={() => void settings.testConnection()}
              disabled={!settings.canTest}
            >
              {t('aiProvider.test')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIProviderSettingsDialog;
