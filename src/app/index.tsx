import { AIProviderProvider, useAIProviderClient } from '@features/ai-provider-settings';
import { AIResumeEnhancementProvider } from '@features/ai-resume-enhancement';
import { EditorPage } from '@pages/editor';
import { I18nProvider } from '@shared/i18n';
import { FeedbackProvider, FeedbackViewport } from '@shared/ui/feedback';
import { lazy, Suspense } from 'react';

import { StoreProvider } from './providers/store';

const LiquidGlassPrototype = lazy(() =>
  import('@pages/liquid-glass-prototype').then((module) => ({
    default: module.LiquidGlassPrototype,
  })),
);

const AppContent = () => {
  const provider = useAIProviderClient();

  return (
    <I18nProvider>
      <FeedbackProvider>
        <AIResumeEnhancementProvider provider={provider}>
          <StoreProvider>
            <EditorPage />
            <FeedbackViewport />
          </StoreProvider>
        </AIResumeEnhancementProvider>
      </FeedbackProvider>
    </I18nProvider>
  );
};

export const App = () => {
  if (globalThis.location.pathname === '/design/phase4a') {
    return (
      <Suspense fallback={<div role="status">加载设计原型…</div>}>
        <LiquidGlassPrototype />
      </Suspense>
    );
  }

  return (
    <AIProviderProvider>
      <AppContent />
    </AIProviderProvider>
  );
};

export default App;
