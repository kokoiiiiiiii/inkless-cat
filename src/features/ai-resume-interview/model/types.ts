export const INTERVIEW_PHASES = [
  'targetRole',
  'basics',
  'work',
  'projects',
  'education',
  'skills',
  'review',
] as const;

export type InterviewPhase = (typeof INTERVIEW_PHASES)[number];
export type InterviewQuestionSource = 'template' | 'ai';
export type InterviewMode = 'undecided' | 'ai' | 'template';

export type InterviewQuestion = {
  id: string;
  phase: InterviewPhase;
  content: string;
  source: InterviewQuestionSource;
  followUpIndex: number;
  ruleKind?: 'initial' | 'fallback';
  createdAt: number;
};

export type InterviewAnswer = {
  questionId: string;
  text: string;
  skipped: boolean;
  createdAt: number;
  updatedAt: number;
};

export type InterviewPhaseStatus = 'not_started' | 'active' | 'completed' | 'skipped';

export type InterviewProgressPhase = {
  phase: InterviewPhase;
  status: InterviewPhaseStatus;
  answeredCount: number;
  skippedCount: number;
};

export type InterviewProgress = {
  currentIndex: number;
  completedCount: number;
  totalCount: number;
  phases: InterviewProgressPhase[];
};

export type InterviewStatus =
  | 'initializing'
  | 'asking'
  | 'answering'
  | 'generating_question'
  | 'completed'
  | 'cancelled'
  | 'error';

export type InterviewRequestStatus =
  | 'idle'
  | 'streaming'
  | 'validating'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type InterviewError = {
  code: 'provider_error' | 'provider_changed' | 'invalid_question' | 'provider_not_configured';
  providerErrorCode?: string;
  providerStatusCode?: number;
};

export type InterviewSession = {
  id: string;
  generation: number;
  currentPhase: InterviewPhase;
  currentQuestion: InterviewQuestion | null;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  mode: InterviewMode;
  privacyAcknowledged: boolean;
  followUpCounts: Partial<Record<InterviewPhase, number>>;
  followUpRequestCounts: Partial<Record<InterviewPhase, number>>;
  fallbackUsed: Partial<Record<InterviewPhase, boolean>>;
  skippedPhases: InterviewPhase[];
  questionSequence: number;
  status: InterviewStatus;
  requestStatus: InterviewRequestStatus;
  requestId: number | null;
  providerGeneration: number;
  previewQuestion: string;
  privacyConsentPending: boolean;
  createdAt: number;
  updatedAt: number;
  error?: InterviewError;
};

export type AIInterviewProviderClient = {
  configuration: Readonly<{ baseUrl: string; model: string }> | null;
  isConfigured: boolean;
  connectionStatus: string;
  streamComplete: (
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: {
      signal?: AbortSignal;
      maxOutputCodeUnits?: number;
      onDelta: (delta: string) => void;
    },
  ) => Promise<{ content: string }>;
};
