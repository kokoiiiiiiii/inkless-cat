import { AIProviderProvider, useAIProviderClient } from '@features/ai-provider-settings';
import { AIResumeEnhancementProvider } from '@features/ai-resume-enhancement';
import { EditorPage } from '@pages/editor';
import { I18nProvider } from '@shared/i18n';
import { FeedbackProvider, FeedbackViewport } from '@shared/ui/feedback';

import { StoreProvider } from './providers/store';

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

export const App = () => (
  <AIProviderProvider>
    <AppContent />
  </AIProviderProvider>
);

export default App;
