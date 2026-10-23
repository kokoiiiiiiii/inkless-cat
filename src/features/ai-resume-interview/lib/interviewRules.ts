import { INTERVIEW_PHASES, type InterviewPhase, type InterviewQuestion } from '../model/types';

export const MAX_AI_FOLLOW_UPS_PER_PHASE = 2;
export const MAX_AI_REQUEST_ATTEMPTS_PER_PHASE = 4;

const questionKeys: Record<InterviewPhase, { initial: string; fallback: string }> = {
  targetRole: {
    initial: 'aiInterview.questions.targetRole.initial',
    fallback: 'aiInterview.questions.targetRole.fallback',
  },
  basics: {
    initial: 'aiInterview.questions.basics.initial',
    fallback: 'aiInterview.questions.basics.fallback',
  },
  work: {
    initial: 'aiInterview.questions.work.initial',
    fallback: 'aiInterview.questions.work.fallback',
  },
  projects: {
    initial: 'aiInterview.questions.projects.initial',
    fallback: 'aiInterview.questions.projects.fallback',
  },
  education: {
    initial: 'aiInterview.questions.education.initial',
    fallback: 'aiInterview.questions.education.fallback',
  },
  skills: {
    initial: 'aiInterview.questions.skills.initial',
    fallback: 'aiInterview.questions.skills.fallback',
  },
  review: {
    initial: 'aiInterview.questions.review.initial',
    fallback: 'aiInterview.questions.review.fallback',
  },
};

export const getInterviewPhaseIndex = (phase: InterviewPhase) => INTERVIEW_PHASES.indexOf(phase);

export const getNextInterviewPhase = (phase: InterviewPhase): InterviewPhase | null =>
  INTERVIEW_PHASES[getInterviewPhaseIndex(phase) + 1] ?? null;

export const getInterviewQuestionContent = (
  phase: InterviewPhase,
  kind: 'initial' | 'fallback',
  translate: (key: string) => string,
) => translate(questionKeys[phase][kind]);

export const createRuleQuestion = (args: {
  sessionId: string;
  sequence: number;
  phase: InterviewPhase;
  kind: 'initial' | 'fallback';
  translate: (key: string) => string;
  now?: number;
}): InterviewQuestion => ({
  id: `${args.sessionId}:question:${args.sequence}`,
  phase: args.phase,
  content: getInterviewQuestionContent(args.phase, args.kind, args.translate),
  source: 'template',
  followUpIndex: 0,
  ruleKind: args.kind,
  createdAt: args.now ?? Date.now(),
});

export const localizeInterviewQuestion = (
  question: InterviewQuestion,
  translate: (key: string) => string,
): InterviewQuestion => {
  if (question.source !== 'template' || !question.ruleKind) return question;
  const content = getInterviewQuestionContent(question.phase, question.ruleKind, translate);
  return content === question.content ? question : { ...question, content };
};
