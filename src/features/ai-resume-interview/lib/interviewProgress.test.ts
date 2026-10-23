import { describe, expect, it } from 'vitest';

import type { InterviewSession } from '../model/types';
import { getInterviewProgress } from './interviewProgress';

const session: InterviewSession = {
  id: 'session-progress',
  generation: 1,
  currentPhase: 'work',
  currentQuestion: null,
  questions: [
    {
      id: 'q-role',
      phase: 'targetRole',
      content: 'Role?',
      source: 'template',
      followUpIndex: 0,
      createdAt: 1,
    },
    {
      id: 'q-work',
      phase: 'work',
      content: 'Work?',
      source: 'template',
      followUpIndex: 0,
      createdAt: 2,
    },
  ],
  answers: [
    { questionId: 'q-role', text: 'Engineer', skipped: false, createdAt: 1, updatedAt: 1 },
    { questionId: 'q-work', text: '', skipped: true, createdAt: 2, updatedAt: 2 },
  ],
  mode: 'template',
  privacyAcknowledged: false,
  followUpCounts: {},
  followUpRequestCounts: {},
  fallbackUsed: {},
  skippedPhases: ['basics'],
  questionSequence: 2,
  status: 'asking',
  requestStatus: 'idle',
  requestId: null,
  providerGeneration: 0,
  previewQuestion: '',
  privacyConsentPending: false,
  createdAt: 0,
  updatedAt: 2,
};

describe('getInterviewProgress', () => {
  it('summarizes completed, skipped, and active phases without deriving a resume', () => {
    const progress = getInterviewProgress(session);

    expect(progress.currentIndex).toBe(2);
    expect(progress.phases.find(({ phase }) => phase === 'targetRole')).toMatchObject({
      status: 'completed',
      answeredCount: 1,
    });
    expect(progress.phases.find(({ phase }) => phase === 'basics')?.status).toBe('skipped');
    expect(progress.phases.find(({ phase }) => phase === 'work')).toMatchObject({
      status: 'active',
      skippedCount: 1,
    });
  });
});
