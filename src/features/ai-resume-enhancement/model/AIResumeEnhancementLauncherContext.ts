import { createContext, useContext } from 'react';

import type { AIEnhancementTarget } from './types';

export type AIResumeEnhancementLauncher = {
  open: (target: AIEnhancementTarget, opener: HTMLButtonElement) => void;
};

export const AIResumeEnhancementLauncherContext = createContext<AIResumeEnhancementLauncher | null>(
  null,
);

export const useAIResumeEnhancementLauncher = () => {
  const context = useContext(AIResumeEnhancementLauncherContext);
  if (!context) {
    throw new Error('AI resume enhancement controls require AIResumeEnhancementProvider.');
  }
  return context;
};
