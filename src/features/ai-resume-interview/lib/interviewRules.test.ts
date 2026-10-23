import { describe, expect, it } from 'vitest';

import {
  createRuleQuestion,
  getInterviewQuestionContent,
  getNextInterviewPhase,
  MAX_AI_FOLLOW_UPS_PER_PHASE,
} from './interviewRules';

const translate = (key: string) => key;

describe('interviewRules', () => {
  it('provides a localized rule question for each phase and kind', () => {
    const question = createRuleQuestion({
      sessionId: 'session-a',
      sequence: 1,
      phase: 'targetRole',
      kind: 'initial',
      translate,
      now: 123,
    });

    expect(question).toMatchObject({
      id: 'session-a:question:1',
      phase: 'targetRole',
      source: 'template',
      ruleKind: 'initial',
      content: 'aiInterview.questions.targetRole.initial',
      createdAt: 123,
    });
    expect(getInterviewQuestionContent('work', 'fallback', translate)).toBe(
      'aiInterview.questions.work.fallback',
    );
  });

  it('keeps phase movement finite and bounds AI follow-ups', () => {
    expect(getNextInterviewPhase('targetRole')).toBe('basics');
    expect(getNextInterviewPhase('skills')).toBe('review');
    expect(getNextInterviewPhase('review')).toBeNull();
    expect(MAX_AI_FOLLOW_UPS_PER_PHASE).toBe(2);
  });
});
