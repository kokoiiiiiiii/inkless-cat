import { createContext, useContext } from 'react';

export type AIResumeInterviewLauncher = {
  open: (opener: HTMLButtonElement) => void;
};

export const AIResumeInterviewContext = createContext<AIResumeInterviewLauncher | null>(null);

export const useAIResumeInterviewLauncher = () => {
  const context = useContext(AIResumeInterviewContext);
  if (!context) {
    throw new Error('AI resume interview entry requires AIResumeInterviewProvider.');
  }
  return context;
};
