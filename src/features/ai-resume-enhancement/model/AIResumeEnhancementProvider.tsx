import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';

import { AIResumeEnhancementContext } from './AIResumeEnhancementContext';
import { type AIEnhancementProviderClient, useAIResumeEnhancement } from './useAIResumeEnhancement';

const AIEnhancementDialog = lazy(() => import('../ui/AIEnhancementDialog'));

type AIResumeEnhancementProviderProps = {
  children: ReactNode;
  provider: AIEnhancementProviderClient;
};

export const AIResumeEnhancementProvider = ({
  children,
  provider,
}: AIResumeEnhancementProviderProps) => {
  const controller = useAIResumeEnhancement(provider);

  return (
    <AIResumeEnhancementContext.Provider value={controller}>
      {children}
      {controller.session && (
        <Suspense fallback={null}>
          <AIEnhancementDialog />
        </Suspense>
      )}
    </AIResumeEnhancementContext.Provider>
  );
};
