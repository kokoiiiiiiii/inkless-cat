import { createContext, useContext } from 'react';

import type { AIResumeEnhancementController } from './useAIResumeEnhancement';

export const AIResumeEnhancementContext = createContext<AIResumeEnhancementController | null>(null);

export const useAIResumeEnhancementContext = () => {
  const context = useContext(AIResumeEnhancementContext);
  if (!context) {
    throw new Error('AI resume enhancement controls require AIResumeEnhancementProvider.');
  }
  return context;
};
