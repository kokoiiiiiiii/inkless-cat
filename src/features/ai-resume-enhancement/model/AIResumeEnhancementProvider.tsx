import { useI18n } from '@shared/i18n';
import { LazyChunkBoundary } from '@shared/ui/LazyChunkBoundary';
import type { ReactNode } from 'react';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';

import { AIResumeEnhancementLauncherContext } from './AIResumeEnhancementLauncherContext';
import type { AIEnhancementTarget } from './types';
import type { AIEnhancementProviderClient } from './useAIResumeEnhancement';

const AIResumeEnhancementRuntime = lazy(() => import('../ui/AIResumeEnhancementRuntime'));

type LaunchRequest = {
  id: number;
  target: AIEnhancementTarget;
  opener: HTMLButtonElement;
};

type AIResumeEnhancementProviderProps = {
  children: ReactNode;
  provider: AIEnhancementProviderClient;
};

export const AIResumeEnhancementProvider = ({
  children,
  provider,
}: AIResumeEnhancementProviderProps) => {
  const { loadAIEnhancementTranslations, loadAIProviderTranslations, t } = useI18n();
  const [runtimeCreated, setRuntimeCreated] = useState(false);
  const [request, setRequest] = useState<LaunchRequest | null>(null);
  const [pendingRequest, setPendingRequest] = useState<Omit<LaunchRequest, 'id'> | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestSequence = useRef(0);
  const loadAndOpen = useCallback(
    async (nextRequest: Omit<LaunchRequest, 'id'>) => {
      setPendingRequest(nextRequest);
      setIsPreparing(true);
      setLoadFailed(false);
      try {
        await Promise.all([loadAIEnhancementTranslations(), loadAIProviderTranslations()]);
        setRequest({ ...nextRequest, id: ++requestSequence.current });
        setRuntimeCreated(true);
        setPendingRequest(null);
      } catch {
        setLoadFailed(true);
      } finally {
        setIsPreparing(false);
      }
    },
    [loadAIEnhancementTranslations, loadAIProviderTranslations],
  );
  const open = useCallback(
    (target: AIEnhancementTarget, opener: HTMLButtonElement) => {
      void loadAndOpen({ target, opener });
    },
    [loadAndOpen],
  );
  const contextValue = useMemo(() => ({ open }), [open]);

  return (
    <AIResumeEnhancementLauncherContext.Provider value={contextValue}>
      {children}
      {isPreparing && (
        <span className="sr-only" role="status">
          {t('common.loadingFeature')}
        </span>
      )}
      {loadFailed && pendingRequest && (
        <div
          className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border border-rose-300 bg-white p-4 text-sm text-slate-900 shadow-xl dark:border-rose-800 dark:bg-slate-950 dark:text-slate-100"
          role="alert"
        >
          <p>{t('common.featureFailedLoad')}</p>
          <button
            className="mt-2 rounded-md font-semibold underline"
            type="button"
            onClick={() => void loadAndOpen(pendingRequest)}
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
              <button
                className="mt-2 rounded-md font-semibold underline"
                type="button"
                onClick={reload}
              >
                {t('common.reloadPage')}
              </button>
            </div>
          )}
        >
          <Suspense
            fallback={
              <span className="sr-only" role="status">
                {t('common.loadingFeature')}
              </span>
            }
          >
            <AIResumeEnhancementRuntime provider={provider} request={request} />
          </Suspense>
        </LazyChunkBoundary>
      )}
    </AIResumeEnhancementLauncherContext.Provider>
  );
};
