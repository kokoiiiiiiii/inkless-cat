import { describe, expect, it } from 'vitest';

import { createResumeFact, type FactCandidate, type ResumeFact } from './facts';
import {
  buildResumeDraftFromFacts,
  getCurrentConfirmedFacts,
  getResumeDraftBasisKey,
} from './resumeGeneration';
import type { InterviewSession } from './types';

const session: InterviewSession = {
  id: 'generation-session',
  generation: 1,
  currentPhase: 'review',
  currentQuestion: null,
  questions: [
    {
      id: 'q-source',
      phase: 'work',
      content: 'Describe your work.',
      source: 'template',
      followUpIndex: 0,
      createdAt: 1,
    },
  ],
  answers: [
    {
      id: 'a-source',
      questionId: 'q-source',
      text: 'Interview source content.',
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

const fact = (
  id: string,
  candidate: FactCandidate,
  status: ResumeFact['status'] = 'confirmed',
) => ({
  ...createResumeFact(candidate, session, 'manual', 4),
  id,
  status,
});

const provider = {
  configuration: { baseUrl: 'https://provider.example/v1', model: 'unused' },
  isConfigured: true,
  connectionStatus: 'ready',
};

describe('resume generation mapping', () => {
  it('maps only current confirmed facts into a schema-valid draft and preserves responsibility ownership', () => {
    const facts = [
      fact('role', {
        kind: 'targetRole',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: 'Backend engineer',
      }),
      fact('personal', {
        kind: 'personal',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { fullName: 'Lin Chen', email: 'lin@example.com', summary: 'Confirmed summary.' },
      }),
      fact('work', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: {
          company: 'BrightWorks',
          role: 'Engineer',
          location: 'Taipei',
          startDate: '2022',
          individualResponsibilities: ['I wrote the import tool'],
          teamResponsibilities: ['the team launched the migration'],
          responsibilities: ['worked on the service'],
          achievements: ['migration completed'],
        },
      }),
      fact('skill', {
        kind: 'skill',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: 'TypeScript',
      }),
      fact(
        'pending',
        {
          kind: 'education',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { school: 'Unconfirmed University', degree: 'Unconfirmed degree' },
        },
        'pending',
      ),
      fact(
        'conflict',
        {
          kind: 'project',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { name: 'Conflicted project' },
        },
        'conflict',
      ),
    ];

    const result = buildResumeDraftFromFacts(session, facts, 'en');

    expect(result.validationError).toBeNull();
    expect(result.includedFactIds).toEqual(['role', 'personal', 'work', 'skill']);
    expect(result.excludedFactIds).toEqual(['pending', 'conflict']);
    expect(result.resume.personal).toMatchObject({
      fullName: 'Lin Chen',
      title: 'Backend engineer',
      email: 'lin@example.com',
      summary: 'Confirmed summary.',
    });
    expect(result.resume.experience).toEqual([
      expect.objectContaining({
        company: 'BrightWorks',
        role: 'Engineer',
        location: 'Taipei',
        startDate: '2022',
        highlights: [
          'Personally owned: I wrote the import tool',
          'Shared with the team: the team launched the migration',
          'Ownership unspecified: worked on the service',
          'Outcome ownership unspecified: migration completed',
        ],
      }),
    ]);
    expect(result.resume.education).toEqual([]);
    expect(result.resume.experience.map(({ company }) => company)).not.toContain('Acme Tech Group');
    expect(result.missingFields).toContain('education');
  });

  it('excludes confirmed facts as soon as the source answer changes', () => {
    const confirmed = fact('work', {
      kind: 'experience',
      sourceQuestionId: 'q-source',
      sourceAnswerId: 'a-source',
      value: { company: 'BrightWorks', role: 'Engineer' },
    });
    const changedSession = {
      ...session,
      answers: session.answers.map((answer) => ({
        ...answer,
        text: 'Changed answer',
        updatedAt: 5,
      })),
    };

    expect(getCurrentConfirmedFacts(changedSession, [confirmed])).toEqual([]);
    expect(
      buildResumeDraftFromFacts(changedSession, [confirmed], 'zh-CN').resume.experience,
    ).toEqual([]);
  });

  it('reports missing fields inside partial confirmed records without filling them in', () => {
    const facts = [
      fact('partial-work', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { location: 'Taipei' },
      }),
      fact('partial-project', {
        kind: 'project',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { summary: 'A confirmed project summary.' },
      }),
      fact('partial-education', {
        kind: 'education',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { details: 'A confirmed course detail.' },
      }),
    ];

    const result = buildResumeDraftFromFacts(session, facts, 'en');

    expect(result.resume.experience[0]).toMatchObject({ location: 'Taipei' });
    expect(result.resume.experience[0]?.company).toBeUndefined();
    expect(result.resume.projects[0]?.name).toBeUndefined();
    expect(result.resume.education[0]?.school).toBeUndefined();
    expect(result.missingFields).toEqual(
      expect.arrayContaining([
        'experienceCompany',
        'experienceRole',
        'experienceDates',
        'projectName',
        'educationSchool',
        'educationDegree',
      ]),
    );
  });

  it('changes the draft basis when the session facts or provider changes', () => {
    const baseline = getResumeDraftBasisKey(session, [], provider);
    const changedSession = { ...session, updatedAt: session.updatedAt + 1 };
    const changedProvider = {
      ...provider,
      configuration: { ...provider.configuration, model: 'next' },
    };

    expect(getResumeDraftBasisKey(changedSession, [], provider)).not.toBe(baseline);
    expect(getResumeDraftBasisKey(session, [], changedProvider)).not.toBe(baseline);
  });
});
