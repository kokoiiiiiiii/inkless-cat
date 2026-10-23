import { INTERVIEW_PHASES, type InterviewProgress, type InterviewSession } from '../model/types';

export const getInterviewProgress = (session: InterviewSession): InterviewProgress => {
  const currentIndex = INTERVIEW_PHASES.indexOf(session.currentPhase);
  const phases = INTERVIEW_PHASES.map((phase, index) => {
    const phaseQuestions = session.questions.filter((question) => question.phase === phase);
    const phaseAnswers = session.answers.filter((answer) =>
      phaseQuestions.some((question) => question.id === answer.questionId),
    );
    const answeredCount = phaseAnswers.filter((answer) => !answer.skipped).length;
    const skippedCount = phaseAnswers.filter((answer) => answer.skipped).length;
    const status = session.skippedPhases.includes(phase)
      ? 'skipped'
      : index === currentIndex && session.status !== 'completed'
        ? 'active'
        : index < currentIndex || (phase === 'review' && session.status === 'completed')
          ? 'completed'
          : 'not_started';

    return { phase, status, answeredCount, skippedCount } as const;
  });
  const completedCount = phases.filter(
    ({ status }) => status === 'completed' || status === 'skipped',
  ).length;

  return {
    currentIndex,
    completedCount,
    totalCount: INTERVIEW_PHASES.length,
    phases: [...phases],
  };
};
