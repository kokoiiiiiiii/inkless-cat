import { describe, expect, it } from 'vitest';

import {
  createResumeFact,
  FactExtractionError,
  getAnswerFingerprint,
  getAnswerId,
  invalidateStaleFacts,
  markConflicts,
  parseFactExtractionResponse,
  resolveFactConflicts,
  selectFactExtractionInput,
} from './facts';
import type { InterviewAnswer, InterviewSession } from './types';

const makeAnswer = (overrides: Partial<InterviewAnswer> = {}): InterviewAnswer => ({
  id: 'answer-role',
  questionId: 'question-role',
  text: '目标岗位是后端工程师，我在 Acme 公司负责 API。',
  skipped: false,
  createdAt: 10,
  updatedAt: 12,
  ...overrides,
});

const makeSession = (overrides: Partial<InterviewSession> = {}): InterviewSession => ({
  id: 'session-a',
  generation: 1,
  currentPhase: 'review',
  currentQuestion: null,
  questions: [
    {
      id: 'question-role',
      phase: 'targetRole',
      content: '你希望应聘什么岗位？',
      source: 'template',
      followUpIndex: 0,
      createdAt: 8,
    },
  ],
  answers: [makeAnswer()],
  mode: 'template',
  privacyAcknowledged: false,
  followUpCounts: {},
  followUpRequestCounts: {},
  fallbackUsed: {},
  skippedPhases: [],
  questionSequence: 1,
  status: 'asking',
  requestStatus: 'idle',
  requestId: null,
  providerGeneration: 0,
  previewQuestion: '',
  privacyConsentPending: false,
  createdAt: 1,
  updatedAt: 12,
  ...overrides,
});

const targetRoleCandidate = (overrides: Record<string, unknown> = {}) => ({
  kind: 'targetRole',
  sourceQuestionId: 'question-role',
  sourceAnswerId: 'answer-role',
  value: '后端工程师',
  ...overrides,
});

describe('resume facts and interview provenance', () => {
  it('accepts a candidate only when each value is copied from its linked answer and leaves it pending', () => {
    const session = makeSession();
    const facts = parseFactExtractionResponse(
      JSON.stringify({ facts: [targetRoleCandidate()] }),
      session,
      session.answers,
      20,
    );

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      kind: 'targetRole',
      value: '后端工程师',
      sourceQuestionId: 'question-role',
      sourceAnswerId: 'answer-role',
      sessionId: 'session-a',
      sourceAnswerVersion: 12,
      status: 'pending',
      extractedAt: 20,
      updatedAt: 20,
    });
    expect(facts[0]?.sourceFingerprint).toMatch(/^fnv1a64-/u);
  });

  it('keeps source-matching employer and responsibility candidates pending for semantic review', () => {
    const session = makeSession({
      answers: [
        makeAnswer({
          text: 'I worked for BrightWorks as an engineer. We built a billing app for Northwind Health, our customer. I personally wrote the import tool, while the whole team launched the migration.',
        }),
      ],
    });
    const fact = parseFactExtractionResponse(
      JSON.stringify({
        facts: [
          {
            kind: 'experience',
            sourceQuestionId: 'question-role',
            sourceAnswerId: 'answer-role',
            value: {
              company: 'Northwind Health',
              role: 'engineer',
              individualResponsibilities: ['the whole team launched the migration'],
            },
          },
        ],
      }),
      session,
      session.answers,
    )[0];

    expect(fact).toMatchObject({
      status: 'pending',
      origin: 'ai',
      value: {
        company: 'Northwind Health',
        individualResponsibilities: ['the whole team launched the migration'],
      },
    });
  });

  it('rejects fabricated company names, dates, metrics, and other values absent from the answer', () => {
    const session = makeSession();
    const response = {
      facts: [
        {
          kind: 'experience',
          sourceQuestionId: 'question-role',
          sourceAnswerId: 'answer-role',
          value: {
            company: 'Imaginary Systems',
            role: '后端工程师',
            achievements: ['效率提升 60%'],
          },
        },
      ],
    };

    expect(() =>
      parseFactExtractionResponse(JSON.stringify(response), session, session.answers),
    ).toThrow(new FactExtractionError('ungrounded_value'));
  });

  it('rejects missing or fabricated answer sources before any candidate enters the store', () => {
    const session = makeSession();
    const missingSource = {
      facts: [{ kind: 'targetRole', sourceQuestionId: 'question-role', value: '后端工程师' }],
    };
    const unknownSource = {
      facts: [targetRoleCandidate({ sourceAnswerId: 'answer-not-in-session' })],
    };

    expect(() =>
      parseFactExtractionResponse(JSON.stringify(missingSource), session, session.answers),
    ).toThrow(new FactExtractionError('invalid_schema'));
    expect(() =>
      parseFactExtractionResponse(JSON.stringify(unknownSource), session, session.answers),
    ).toThrow(new FactExtractionError('unknown_source'));
  });

  it('rejects model-added fields because the extraction schema is strict', () => {
    const session = makeSession();
    const response = {
      facts: [
        {
          ...targetRoleCandidate(),
          company: 'Invented LLC',
        },
      ],
    };

    expect(() =>
      parseFactExtractionResponse(JSON.stringify(response), session, session.answers),
    ).toThrow(new FactExtractionError('invalid_schema'));
  });

  it('marks facts stale when their answer is edited, removed, or belongs to a restarted session', () => {
    const session = makeSession();
    const fact = createResumeFact(targetRoleCandidate() as never, session, 'ai', 20);
    const changedAnswerSession = makeSession({
      answers: [makeAnswer({ text: '目标岗位是前端工程师。', updatedAt: 13 })],
    });
    const removedAnswerSession = makeSession({ answers: [] });
    const restartedSession = makeSession({ id: 'session-b' });

    expect(invalidateStaleFacts(changedAnswerSession, [fact])[0]?.status).toBe('stale');
    expect(invalidateStaleFacts(removedAnswerSession, [fact])[0]?.status).toBe('stale');
    expect(invalidateStaleFacts(restartedSession, [fact])[0]?.status).toBe('stale');
  });

  it('records stable answer IDs and content versions in its fingerprint', () => {
    const answer = makeAnswer({ id: undefined });
    expect(getAnswerId(answer)).toBe('question-role:answer');
    expect(getAnswerFingerprint(answer)).not.toBe(
      getAnswerFingerprint({ ...answer, updatedAt: answer.updatedAt + 1 }),
    );
    expect(getAnswerFingerprint(answer)).not.toBe(
      getAnswerFingerprint({ ...answer, text: `${answer.text} updated` }),
    );
  });

  it('surfaces conflicts for incompatible target roles until a user resolves them', () => {
    const session = makeSession({
      questions: [
        ...makeSession().questions,
        {
          id: 'question-follow-up',
          phase: 'targetRole',
          content: '目标岗位还有变化吗？',
          source: 'template',
          followUpIndex: 1,
          createdAt: 13,
        },
      ],
      answers: [
        makeAnswer(),
        {
          id: 'answer-follow-up',
          questionId: 'question-follow-up',
          text: '我现在希望应聘产品经理。',
          skipped: false,
          createdAt: 14,
          updatedAt: 14,
        },
      ],
    });
    const result = parseFactExtractionResponse(
      JSON.stringify({
        facts: [
          targetRoleCandidate(),
          {
            kind: 'targetRole',
            sourceQuestionId: 'question-follow-up',
            sourceAnswerId: 'answer-follow-up',
            value: '产品经理',
          },
        ],
      }),
      session,
      session.answers,
    );

    expect(result.map((fact) => fact.status)).toEqual(['conflict', 'conflict']);
    expect(result.map((fact) => fact.conflictKey)).toEqual(['targetRole', 'targetRole']);
  });

  it('detects conflicts across personal fields and matching work history records', () => {
    const secondAnswer: InterviewAnswer = {
      id: 'answer-work-follow-up',
      questionId: 'question-work-follow-up',
      text: 'Acme 后端工程师在 2020 年开始，2023 年结束。',
      skipped: false,
      createdAt: 15,
      updatedAt: 16,
    };
    const session = makeSession({
      questions: [
        ...makeSession().questions,
        {
          id: 'question-work-follow-up',
          phase: 'work',
          content: '请补充工作经历时间。',
          source: 'template',
          followUpIndex: 1,
          createdAt: 14,
        },
      ],
      answers: [makeAnswer(), secondAnswer],
    });
    const personalFacts = [
      createResumeFact(
        {
          kind: 'personal',
          sourceQuestionId: 'question-role',
          sourceAnswerId: 'answer-role',
          value: { fullName: 'Chen Qing', email: 'first@example.com' },
        } as never,
        session,
        'manual',
        20,
      ),
      createResumeFact(
        {
          kind: 'personal',
          sourceQuestionId: 'question-work-follow-up',
          sourceAnswerId: 'answer-work-follow-up',
          value: { email: 'second@example.com' },
        } as never,
        session,
        'manual',
        21,
      ),
    ];
    const experienceFacts = [
      createResumeFact(
        {
          kind: 'experience',
          sourceQuestionId: 'question-role',
          sourceAnswerId: 'answer-role',
          value: {
            company: 'Acme',
            role: '后端工程师',
            location: 'Seattle',
            individualResponsibilities: ['built the reporting API'],
          },
        } as never,
        session,
        'manual',
        22,
      ),
      createResumeFact(
        {
          kind: 'experience',
          sourceQuestionId: 'question-work-follow-up',
          sourceAnswerId: 'answer-work-follow-up',
          value: {
            company: 'Acme',
            role: '后端工程师',
            location: 'Vancouver',
            teamResponsibilities: ['collaborated on the rollout'],
          },
        } as never,
        session,
        'manual',
        23,
      ),
    ];

    expect(markConflicts(personalFacts).map((fact) => fact.status)).toEqual([
      'conflict',
      'conflict',
    ]);
    expect(markConflicts(experienceFacts).map((fact) => fact.status)).toEqual([
      'conflict',
      'conflict',
    ]);
    expect(markConflicts(personalFacts)[0]?.conflictKeys).toContain('personal.email');
    expect(markConflicts(experienceFacts)[0]?.conflictFields).toEqual(['location']);
    expect(markConflicts(experienceFacts)[1]?.conflictFields).toEqual(['location']);
    expect(markConflicts(experienceFacts)[0]?.value).toMatchObject({
      individualResponsibilities: ['built the reporting API'],
    });
    expect(markConflicts(experienceFacts)[1]?.value).toMatchObject({
      teamResponsibilities: ['collaborated on the rollout'],
    });
  });

  it('removes only the disputed location and retains the other candidate under its source', () => {
    const session = makeSession();
    const candidates = [
      createResumeFact(
        {
          kind: 'experience',
          sourceQuestionId: 'question-role',
          sourceAnswerId: 'answer-role',
          value: {
            company: 'Acme',
            role: 'Engineer',
            location: 'Seattle',
            individualResponsibilities: ['built the reporting API'],
          },
        } as never,
        session,
        'manual',
        30,
      ),
      createResumeFact(
        {
          kind: 'experience',
          sourceQuestionId: 'question-role',
          sourceAnswerId: 'answer-role',
          value: {
            company: 'Acme',
            role: 'Engineer',
            location: 'Vancouver',
            teamResponsibilities: ['collaborated on the rollout'],
          },
        } as never,
        session,
        'manual',
        31,
      ),
    ];
    const conflicted = markConflicts(candidates);
    const resolved = resolveFactConflicts(conflicted, conflicted[0]?.id ?? '');

    expect(resolved[0]).toMatchObject({
      status: 'confirmed',
      value: { location: 'Seattle', individualResponsibilities: ['built the reporting API'] },
    });
    expect(resolved[1]).toMatchObject({
      status: 'pending',
      sourceAnswerId: 'answer-role',
      value: {
        company: 'Acme',
        role: 'Engineer',
        teamResponsibilities: ['collaborated on the rollout'],
      },
    });
    expect((resolved[1]?.value as Record<string, unknown>).location).toBeUndefined();
    expect(resolved[1]?.conflictFields).toBeUndefined();
  });

  it('excludes skipped answers, caps request count, and rejects an over-budget request', () => {
    const session = makeSession({
      answers: [
        makeAnswer(),
        {
          id: 'answer-skipped',
          questionId: 'question-skipped',
          text: 'must not be sent',
          skipped: true,
          createdAt: 13,
          updatedAt: 13,
        },
      ],
    });
    const selected = selectFactExtractionInput(session);
    expect(selected.includedAnswers.map((answer) => getAnswerId(answer))).toEqual(['answer-role']);
    expect(selected.includedAnswers.map((answer) => answer.text).join(' ')).not.toContain(
      'must not be sent',
    );

    const tooLong = makeSession({ answers: [makeAnswer({ text: 'x'.repeat(6001) })] });
    expect(() => selectFactExtractionInput(tooLong)).toThrow(
      new FactExtractionError('input_too_long'),
    );
  });
});
