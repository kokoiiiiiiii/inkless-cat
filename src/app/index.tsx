import { AIProviderProvider } from '@features/ai-provider-settings';
import { EditorPage } from '@pages/editor';
import { I18nProvider } from '@shared/i18n';
import { FeedbackProvider, FeedbackViewport } from '@shared/ui/feedback';

import { StoreProvider } from './providers/store';

export const App = () => (
  <AIProviderProvider>
    <I18nProvider>
      <FeedbackProvider>
        <StoreProvider>
          <EditorPage />
          <FeedbackViewport />
        </StoreProvider>
      </FeedbackProvider>
    </I18nProvider>
  </AIProviderProvider>
);

export default App;
