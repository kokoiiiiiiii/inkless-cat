import { createContext, useContext } from 'react';

import type {
  AIEnhancementFieldValue,
  AIEnhancementPresentation,
  AIEnhancementSelectionRange,
  AIEnhancementTarget,
} from './types';

export type AIResumeEnhancementLaunchOptions = {
  presentation?: AIEnhancementPresentation;
  mountNode?: HTMLElement;
  fieldLabel?: string;
  sourceValue?: AIEnhancementFieldValue | null;
  sourceRevision?: number;
  workspaceGeneration?: number;
  selectionRange?: AIEnhancementSelectionRange | null;
  onConfigureProvider?: () => void;
};

export type AIResumeEnhancementLaunchRequest = AIResumeEnhancementLaunchOptions & {
  id: number;
  target: AIEnhancementTarget;
  opener: HTMLButtonElement;
};

export type AIResumeEnhancementLauncher = {
  open: (
    target: AIEnhancementTarget,
    opener: HTMLButtonElement,
    options?: AIResumeEnhancementLaunchOptions,
  ) => void;
  closeInline: (mountNode?: HTMLElement | null) => void;
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
