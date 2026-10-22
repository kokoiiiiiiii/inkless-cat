import { useI18n } from '@shared/i18n';
import { LazyChunkBoundary } from '@shared/ui/LazyChunkBoundary';
import type { ReactNode, RefObject } from 'react';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';

import { AIResumeInterviewContext } from './AIResumeInterviewContext';
import type { AIInterviewProviderClient } from './types';

const AIResumeInterviewRuntime = lazy(() => import('../ui/AIResumeInterviewRuntime'));

type AIResumeInterviewProviderProps = {
  children: ReactNode;
  provider: AIInterviewProviderClient;
  onOpenProviderSettings: () => void;
  settingsTriggerRef?: RefObject<HTMLButtonElement | null>;
};

export const AIResumeInterviewProvider = ({
  children,
  provider,
  onOpenProviderSettings,
}: AIResumeInterviewProviderProps) => {
  const { loadAIInterviewTranslations, t } = useI18n();
  const [runtimeCreated, setRuntimeCreated] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const loadAndOpen = useCallback(async () => {
    if (!openerRef.current) return;
    setIsPreparing(true);
    setLoadFailed(false);
    try {
      await loadAIInterviewTranslations();
      setRuntimeCreated(true);
      setOpen(true);
    } catch {
      setLoadFailed(true);
    } finally {
      setIsPreparing(false);
    }
  }, [loadAIInterviewTranslations]);

  const launch = useCallback(
    (opener: HTMLButtonElement) => {
      openerRef.current = opener;
      void loadAndOpen();
    },
    [loadAndOpen],
  );

  const pause = useCallback(() => setOpen(false), []);

  const openSettings = useCallback(() => {
    setOpen(false);
    onOpenProviderSettings();
  }, [onOpenProviderSettings]);

  const contextValue = useMemo(() => ({ open: launch }), [launch]);

  return (
    <AIResumeInterviewContext.Provider value={contextValue}>
      {children}
      {isPreparing && (
        <span className="sr-only" aria-live="polite" role="status">
          {t('common.loadingFeature')}
        </span>
      )}
      {loadFailed && (
        <div
          className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border border-rose-300 bg-white p-4 text-sm text-slate-900 shadow-xl dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
          role="alert"
        >
          <p>{t('common.featureFailedLoad')}</p>
          <button
            className="mt-2 font-semibold underline"
            type="button"
            onClick={() => void loadAndOpen()}
          >
            {t('common.reloadPage')}
          </button>
        </div>
      )}
      {runtimeCreated && (
        <LazyChunkBoundary
          renderError={(reload) => (
            <div
              className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border border-rose-300 bg-white p-4 text-sm text-slate-900 shadow-xl dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
              role="alert"
            >
              <p>{t('common.featureFailedLoad')}</p>
              <button className="mt-2 font-semibold underline" type="button" onClick={reload}>
                {t('common.reloadPage')}
              </button>
            </div>
          )}
        >
          <Suspense
            fallback={
              <span className="sr-only" aria-live="polite" role="status">
                {t('common.loadingFeature')}
              </span>
            }
          >
            <AIResumeInterviewRuntime
              open={open}
              provider={provider}
              openerRef={openerRef}
              onPause={pause}
              onOpenProviderSettings={openSettings}
            />
          </Suspense>
        </LazyChunkBoundary>
      )}
    </AIResumeInterviewContext.Provider>
  );
};
