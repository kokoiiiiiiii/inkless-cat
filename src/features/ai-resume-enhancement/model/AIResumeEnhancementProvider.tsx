import { useI18n } from '@shared/i18n';
import { LazyChunkBoundary } from '@shared/ui/LazyChunkBoundary';
import type { ReactNode } from 'react';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';

import { AIResumeEnhancementLauncherContext } from './AIResumeEnhancementLauncherContext';
import type { AIEnhancementProviderClient } from './useAIResumeEnhancement';
import type {
  AIResumeEnhancementLaunchOptions,
  AIResumeEnhancementLaunchRequest,
} from './AIResumeEnhancementLauncherContext';
import type { AIEnhancementTarget } from './types';

const AIResumeEnhancementRuntime = lazy(() => import('../ui/AIResumeEnhancementRuntime'));

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
  const [request, setRequest] = useState<AIResumeEnhancementLaunchRequest | null>(null);
  const [pendingRequest, setPendingRequest] = useState<Omit<
    AIResumeEnhancementLaunchRequest,
    'id'
  > | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestSequence = useRef(0);
  const loadAndOpen = useCallback(
    async (nextRequest: Omit<AIResumeEnhancementLaunchRequest, 'id'>) => {
      const requestId = ++requestSequence.current;
      setPendingRequest(nextRequest);
      setIsPreparing(true);
      setLoadFailed(false);
      try {
        await Promise.all([loadAIEnhancementTranslations(), loadAIProviderTranslations()]);
        if (requestSequence.current !== requestId) return;
        setRequest({ ...nextRequest, id: requestId });
        setRuntimeCreated(true);
        setPendingRequest(null);
      } catch {
        if (requestSequence.current === requestId) setLoadFailed(true);
      } finally {
        if (requestSequence.current === requestId) setIsPreparing(false);
      }
    },
    [loadAIEnhancementTranslations, loadAIProviderTranslations],
  );
  const open = useCallback(
    (
      target: AIEnhancementTarget,
      opener: HTMLButtonElement,
      options: AIResumeEnhancementLaunchOptions = {},
    ) => {
      void loadAndOpen({ ...options, target, opener });
    },
    [loadAndOpen],
  );
  const closeInline = useCallback(
    (mountNode?: HTMLElement | null) => {
      const matchesMount = (
        candidate: { presentation?: 'dialog' | 'inline'; mountNode?: HTMLElement } | null,
      ) =>
        candidate?.presentation === 'inline' && (!mountNode || candidate.mountNode === mountNode);
      const closesPending = matchesMount(pendingRequest);
      const closesRequest = matchesMount(request);
      if (!closesPending && !closesRequest) return;

      requestSequence.current += 1;
      if (closesPending) setPendingRequest(null);
      if (closesRequest) setRequest(null);
      setIsPreparing(false);
      setLoadFailed(false);
    },
    [pendingRequest, request],
  );
  const contextValue = useMemo(() => ({ open, closeInline }), [closeInline, open]);

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
