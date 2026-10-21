import { useContext } from 'react';

import {
  AIProviderSettingsContext,
  type ConnectionTestState,
  type ProviderForm,
} from './AIProviderContext';

export type { ConnectionTestState, ProviderForm };

export const useAIProviderSettings = () => {
  const settings = useContext(AIProviderSettingsContext);
  if (!settings) {
    throw new Error('useAIProviderSettings must be used within AIProviderProvider');
  }
  return settings;
};
