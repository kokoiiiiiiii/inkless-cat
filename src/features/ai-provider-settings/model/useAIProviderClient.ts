import { useContext } from 'react';

import { AIProviderClientContext } from './AIProviderContext';

export const useAIProviderClient = () => {
  const client = useContext(AIProviderClientContext);
  if (!client) {
    throw new Error('useAIProviderClient must be used within AIProviderProvider');
  }
  return client;
};
