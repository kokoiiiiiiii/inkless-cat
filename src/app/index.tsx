import { EditorPage } from '@pages/editor';
import { I18nProvider } from '@shared/i18n';

import { StoreProvider } from './providers/store';

export const App = () => (
  <I18nProvider>
    <StoreProvider>
      <EditorPage />
    </StoreProvider>
  </I18nProvider>
);

export default App;
