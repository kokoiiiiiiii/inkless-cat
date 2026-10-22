import { lazy, Suspense, useEffect, useRef } from 'react';

import { AIResumeEnhancementContext } from '../model/AIResumeEnhancementContext';
import type { AIEnhancementTarget } from '../model/types';
import type { AIEnhancementProviderClient } from '../model/useAIResumeEnhancement';
import { useAIResumeEnhancement } from '../model/useAIResumeEnhancement';

const AIEnhancementDialog = lazy(() => import('./AIEnhancementDialog'));

type AIResumeEnhancementRuntimeProps = {
  provider: AIEnhancementProviderClient;
  request: { id: number; target: AIEnhancementTarget; opener: HTMLButtonElement } | null;
};

const AIResumeEnhancementRuntime = ({ provider, request }: AIResumeEnhancementRuntimeProps) => {
  const controller = useAIResumeEnhancement(provider);
  const { open } = controller;
  const handledRequestId = useRef<number | null>(null);

  useEffect(() => {
    if (!request || handledRequestId.current === request.id) return;
    let isCurrent = true;
    queueMicrotask(() => {
      if (!isCurrent || handledRequestId.current === request.id) return;
      handledRequestId.current = request.id;
      open(request.target, request.opener);
    });
    return () => {
      isCurrent = false;
    };
  }, [open, request]);

  return (
    <AIResumeEnhancementContext.Provider value={controller}>
      {controller.session && (
        <Suspense
          fallback={
            <span className="sr-only" role="status">
              Loading AI enhancement…
            </span>
          }
        >
          <AIEnhancementDialog />
        </Suspense>
      )}
    </AIResumeEnhancementContext.Provider>
  );
};

export default AIResumeEnhancementRuntime;
