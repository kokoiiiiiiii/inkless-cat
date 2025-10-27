import { EditorPage } from '@pages/editor';

import { StoreProvider } from './providers/store';

export const App = () => (
  <StoreProvider>
    <EditorPage />
  </StoreProvider>
);

export default App;
