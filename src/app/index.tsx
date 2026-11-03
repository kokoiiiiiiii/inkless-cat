import { AIProviderProvider, useAIProviderClient } from '@features/ai-provider-settings';
import { AIResumeEnhancementProvider } from '@features/ai-resume-enhancement';
import { EditorPage } from '@pages/editor';
import { I18nProvider } from '@shared/i18n';
import { FeedbackProvider, FeedbackViewport } from '@shared/ui/feedback';
import { lazy, Suspense } from 'react';

import { StoreProvider } from './providers/store';

const M01ProfileSliceRuntime =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_M01_PROFILE_SLICE === 'true'
    ? lazy(() => import('./M01ProfileSliceRuntime'))
    : null;

const AppContent = () => {
  const provider = useAIProviderClient();

  return (
    <I18nProvider>
      <FeedbackProvider>
        <AIResumeEnhancementProvider provider={provider}>
          <StoreProvider>
            {M01ProfileSliceRuntime ? (
              <Suspense fallback={<div aria-busy="true">Loading M01 profile preview…</div>}>
                <M01ProfileSliceRuntime />
              </Suspense>
            ) : (
              <EditorPage />
            )}
            <FeedbackViewport />
          </StoreProvider>
        </AIResumeEnhancementProvider>
      </FeedbackProvider>
    </I18nProvider>
  );
};

export const App = () => (
  <AIProviderProvider>
    <AppContent />
  </AIProviderProvider>
);

export default App;
