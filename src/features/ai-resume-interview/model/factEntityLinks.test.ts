import { describe, expect, it } from 'vitest';

import {
  confirmFactEntityLink,
  createFactEntityLink,
  getFactEntityAmbiguities,
  keepFactEntitiesSeparate,
  validateFactEntityLinks,
} from './factEntityLinks';
import { createResumeFact, type ResumeFact } from './facts';
import type { InterviewSession } from './types';

const session: InterviewSession = {
  id: 'entity-session',
  generation: 1,
  currentPhase: 'review',
  currentQuestion: null,
  questions: [
    {
      id: 'q-work',
      phase: 'work',
      content: 'Describe your work.',
      source: 'template',
      followUpIndex: 0,
      createdAt: 1,
    },
  ],
  answers: [
    {
      id: 'a-work',
      questionId: 'q-work',
      text: 'I worked at Example Works.',
      skipped: false,
      createdAt: 2,
      updatedAt: 3,
    },
  ],
  mode: 'template',
  privacyAcknowledged: false,
  followUpCounts: {},
  followUpRequestCounts: {},
  fallbackUsed: {},
  skippedPhases: [],
  questionSequence: 1,
  status: 'completed',
  requestStatus: 'idle',
  requestId: null,
  providerGeneration: 0,
  previewQuestion: '',
  privacyConsentPending: false,
  createdAt: 1,
  updatedAt: 3,
};

const createFact = (id: string, status: ResumeFact['status'] = 'confirmed'): ResumeFact => ({
  ...createResumeFact(
    {
      kind: 'experience',
      sourceQuestionId: 'q-work',
      sourceAnswerId: 'a-work',
      value: { company: 'Example Works', role: 'Engineer', individualResponsibilities: [id] },
    },
    session,
    'manual',
    4,
  ),
  id,
  status,
});

const createLink = (facts: ResumeFact[]) => {
  const result = createFactEntityLink(
    session,
    facts,
    [],
    facts.map((fact) => fact.id),
    'entity-1',
  );
  if (!result.ok) throw new Error(`Test setup could not create entity link: ${result.reason}`);
  return result.link;
};

describe('fact entity links', () => {
  it('requires current confirmed facts of one kind and keeps source fact IDs', () => {
    const facts = [createFact('fact-a'), createFact('fact-b')];
    const result = createFactEntityLink(session, facts, [], ['fact-a', 'fact-b'], 'entity-1');

    expect(result).toMatchObject({
      ok: true,
      link: {
        entityId: 'entity-1',
        kind: 'experience',
        factIds: ['fact-a', 'fact-b'],
        origin: 'user-confirmed',
        status: 'active',
      },
    });
    expect(validateFactEntityLinks(session, facts, [createLink(facts)])[0]?.status).toBe('active');
    expect(createFactEntityLink(session, [facts[0]!], [], ['fact-a'], 'too-small')).toMatchObject({
      ok: false,
      reason: 'invalid-count',
    });
    expect(
      createFactEntityLink(
        session,
        [facts[0]!, createFact('pending', 'pending')],
        [],
        ['fact-a', 'pending'],
        'pending',
      ),
    ).toMatchObject({ ok: false, reason: 'fact-not-current' });
  });

  it('requires a new user confirmation after a linked fact is edited', () => {
    const facts = [createFact('fact-a'), createFact('fact-b')];
    const link = createLink(facts);
    const edited = {
      ...facts[1]!,
      value: {
        ...(facts[1]!.value as Record<string, unknown>),
        individualResponsibilities: ['Updated responsibility'],
      },
      status: 'pending' as const,
      updatedAt: 6,
    };
    const pendingLink = validateFactEntityLinks(session, [facts[0]!, edited], [link]);
    expect(pendingLink[0]?.status).toBe('needs-review');

    const confirmedEdit = { ...edited, status: 'confirmed' as const };
    const stillNeedsConfirmation = validateFactEntityLinks(
      session,
      [facts[0]!, confirmedEdit],
      pendingLink,
    );
    expect(stillNeedsConfirmation[0]?.status).toBe('needs-review');
    const reconfirmed = confirmFactEntityLink(
      session,
      [facts[0]!, confirmedEdit],
      stillNeedsConfirmation,
      link.entityId,
    );
    expect(reconfirmed).toMatchObject({ ok: true, link: { status: 'active' } });
  });

  it('invalidates links when a source fact is deleted and requires review when rejected or stale', () => {
    const facts = [createFact('fact-a'), createFact('fact-b')];
    const link = createLink(facts);

    expect(validateFactEntityLinks(session, [facts[0]!], [link])[0]?.status).toBe('invalid');
    expect(
      validateFactEntityLinks(session, [facts[0]!, { ...facts[1]!, status: 'rejected' }], [link])[0]
        ?.status,
    ).toBe('needs-review');
    const changedSession = {
      ...session,
      answers: session.answers.map((answer) => ({
        ...answer,
        text: 'Different source',
        updatedAt: 5,
      })),
    };
    expect(validateFactEntityLinks(changedSession, facts, [link])[0]?.status).toBe('needs-review');
  });

  it('blocks associations when fields conflict and keeps the conflicting facts independent', () => {
    const facts = [
      {
        ...createFact('fact-a'),
        value: { company: 'Example Works', role: 'Engineer', startDate: '2020' },
      },
      {
        ...createFact('fact-b'),
        value: { company: 'Example Works', role: 'Engineer', startDate: '2023' },
      },
    ];
    const result = createFactEntityLink(session, facts, [], ['fact-a', 'fact-b'], 'entity-1');

    expect(result).toEqual({ ok: false, reason: 'field-conflict', conflictFields: ['startDate'] });
    expect(getFactEntityAmbiguities(session, facts, [], [])).toEqual([
      { kind: 'experience', factIds: ['fact-a', 'fact-b'], reason: 'field-conflict' },
    ]);
  });

  it('records an explicit keep-separate choice and reopens review if a source fact changes', () => {
    const facts = [createFact('fact-a'), createFact('fact-b')];
    const separated = keepFactEntitiesSeparate(session, facts, ['fact-a', 'fact-b']);

    expect(separated).toHaveLength(1);
    expect(getFactEntityAmbiguities(session, facts, [], separated)).toEqual([]);
    const edited = { ...facts[1]!, updatedAt: 6 };
    expect(getFactEntityAmbiguities(session, [facts[0]!, edited], [], separated)).toEqual([
      { kind: 'experience', factIds: ['fact-a', 'fact-b'], reason: 'identity-ambiguous' },
    ]);
  });
});
