import { AIProviderProvider, useAIProviderClient } from '@features/ai-provider-settings';
import { AIResumeEnhancementProvider } from '@features/ai-resume-enhancement';
import { EditorPage } from '@pages/editor';
import { I18nProvider } from '@shared/i18n';
import { FeedbackProvider, FeedbackViewport } from '@shared/ui/feedback';
import { lazy, Suspense } from 'react';

import { StoreProvider } from './providers/store';

const PCStudioPage =
  import.meta.env.VITE_ENABLE_PC_STUDIO === 'true'
    ? lazy(() => import('@pages/editor/pc-studio'))
    : null;

const ActiveEditorPage = () => {
  const isPCStudioRoute = globalThis.location.pathname.replace(/\/+$/, '') === '/pc-studio';

  if (PCStudioPage && isPCStudioRoute) {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">正在打开 PC 工作台…</div>}>
        <PCStudioPage />
      </Suspense>
    );
  }

  return <EditorPage />;
};

const AppContent = () => {
  const provider = useAIProviderClient();

  return (
    <I18nProvider>
      <FeedbackProvider>
        <AIResumeEnhancementProvider provider={provider}>
          <StoreProvider>
            <ActiveEditorPage />
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
