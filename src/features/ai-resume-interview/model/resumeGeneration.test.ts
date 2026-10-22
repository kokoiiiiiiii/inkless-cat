import { resumeSchema } from '@entities/resume';
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

  it('aggregates compatible facts for one experience and preserves each source fact ID', () => {
    const facts = [
      fact('a-start', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { company: 'BrightWorks', role: 'Backend Engineer', startDate: '2022' },
      }),
      fact('b-individual', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: {
          company: 'BrightWorks',
          role: 'Backend Engineer',
          individualResponsibilities: ['独立设计并开发设备采集服务'],
        },
      }),
      fact('c-team', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: {
          company: 'BrightWorks',
          role: 'Backend Engineer',
          teamResponsibilities: ['与团队协作完成 MES 集成'],
        },
      }),
    ];

    const result = buildResumeDraftFromFacts(session, facts, 'zh-CN');

    expect(result.resume.experience).toHaveLength(1);
    expect(result.resume.experience[0]).toMatchObject({
      company: 'BrightWorks',
      role: 'Backend Engineer',
      startDate: '2022',
      highlights: ['个人负责：独立设计并开发设备采集服务', '与团队协作：与团队协作完成 MES 集成'],
    });
    expect(result.recordFactIds).toEqual([
      {
        recordId: 'generated-experience-0-a-start',
        kind: 'experience',
        factIds: ['a-start', 'b-individual', 'c-team'],
      },
    ]);
    expect(result.entityWarnings).toEqual([]);
    expect(resumeSchema.safeParse(result.resume).success).toBe(true);
  });

  it('keeps different roles at the same company as separate experiences', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('backend', {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { company: 'BrightWorks', role: 'Backend Engineer' },
        }),
        fact('product', {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { company: 'BrightWorks', role: 'Product Engineer' },
        }),
      ],
      'en',
    );

    expect(result.resume.experience.map(({ role }) => role)).toEqual([
      'Backend Engineer',
      'Product Engineer',
    ]);
    expect(result.entityWarnings).toEqual([]);
  });

  it('keeps different degrees at the same school as separate education records', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('bachelors', {
          kind: 'education',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { school: 'Example University', degree: 'Bachelor of Science' },
        }),
        fact('masters', {
          kind: 'education',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { school: 'Example University', degree: 'Master of Science' },
        }),
      ],
      'en',
    );

    expect(result.resume.education.map(({ degree }) => degree)).toEqual([
      'Bachelor of Science',
      'Master of Science',
    ]);
    expect(result.entityWarnings).toEqual([]);
  });

  it('does not merge same-named projects when no stable identity is present', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('project-a', {
          kind: 'project',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { name: 'Billing Platform', summary: 'First project details.' },
        }),
        fact('project-b', {
          kind: 'project',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { name: 'Billing Platform', summary: 'Second project details.' },
        }),
      ],
      'en',
    );

    expect(result.resume.projects).toHaveLength(2);
    expect(result.entityWarnings).toContainEqual({
      kind: 'project',
      reason: 'identity-ambiguous',
      factIds: ['project-a', 'project-b'],
    });
  });

  it('merges project facts only when they share the same explicit project link', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('project-link', {
          kind: 'project',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { name: 'Billing Platform', link: 'https://example.com/billing' },
        }),
        fact('project-duty', {
          kind: 'project',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: {
            name: 'Billing Platform',
            link: 'https://example.com/billing',
            individualResponsibilities: ['Designed invoice reconciliation'],
          },
        }),
      ],
      'en',
    );

    expect(result.resume.projects).toHaveLength(1);
    expect(result.resume.projects[0]?.highlights).toEqual([
      'Personally owned: Designed invoice reconciliation',
    ]);
    expect(result.recordFactIds[0]?.factIds).toEqual(['project-duty', 'project-link']);
    expect(result.entityWarnings).toEqual([]);
  });

  it('merges education facts only when school and degree both match', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('education-start', {
          kind: 'education',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: {
            school: 'Example University',
            degree: 'BSc Computer Science',
            startDate: '2018',
          },
        }),
        fact('education-details', {
          kind: 'education',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: {
            school: 'Example University',
            degree: 'BSc Computer Science',
            endDate: '2022',
            details: 'Completed distributed systems coursework.',
          },
        }),
      ],
      'en',
    );

    expect(result.resume.education).toEqual([
      expect.objectContaining({
        school: 'Example University',
        degree: 'BSc Computer Science',
        startDate: '2018',
        endDate: '2022',
        details: 'Completed distributed systems coursework.',
      }),
    ]);
    expect(result.recordFactIds[0]?.factIds).toEqual(['education-details', 'education-start']);
  });

  it('deduplicates repeated responsibilities but keeps distinct duties and ownership groups', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('work-a', {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: {
            company: 'BrightWorks',
            role: 'Engineer',
            individualResponsibilities: ['Design API', 'Build ingestion'],
            teamResponsibilities: ['Deliver MES integration'],
          },
        }),
        fact('work-b', {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: {
            company: 'BrightWorks',
            role: 'Engineer',
            individualResponsibilities: ['Design API', 'Create tests'],
            responsibilities: ['Documented the rollout'],
          },
        }),
      ],
      'en',
    );

    expect(result.resume.experience[0]?.highlights).toEqual([
      'Personally owned: Design API',
      'Personally owned: Build ingestion',
      'Personally owned: Create tests',
      'Shared with the team: Deliver MES integration',
      'Ownership unspecified: Documented the rollout',
    ]);
  });

  it('keeps conflicting values in separate records and reports the conflict', () => {
    const result = buildResumeDraftFromFacts(
      session,
      [
        fact('start-2022', {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { company: 'BrightWorks', role: 'Engineer', startDate: '2022' },
        }),
        fact('start-2023', {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { company: 'BrightWorks', role: 'Engineer', startDate: '2023' },
        }),
      ],
      'en',
    );

    expect(result.resume.experience.map(({ startDate }) => startDate)).toEqual(['2022', '2023']);
    expect(result.entityWarnings).toContainEqual({
      kind: 'experience',
      reason: 'field-conflict',
      factIds: ['start-2022', 'start-2023'],
    });
  });

  it('excludes pending, rejected, conflicted, and stale facts from entity groups', () => {
    const statuses = (['pending', 'rejected', 'conflict', 'stale'] as const).map((status) =>
      fact(
        `not-${status}`,
        {
          kind: 'experience',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: { company: 'BrightWorks', role: 'Engineer', individualResponsibilities: [status] },
        },
        status,
      ),
    );
    const current = fact('confirmed', {
      kind: 'experience',
      sourceQuestionId: 'q-source',
      sourceAnswerId: 'a-source',
      value: {
        company: 'BrightWorks',
        role: 'Engineer',
        individualResponsibilities: ['confirmed'],
      },
    });
    const result = buildResumeDraftFromFacts(session, [...statuses, current], 'en');

    expect(result.includedFactIds).toEqual(['confirmed']);
    expect(result.resume.experience[0]?.highlights).toEqual(['Personally owned: confirmed']);

    const sourceChanged = {
      ...session,
      answers: session.answers.map((answer) => ({
        ...answer,
        text: 'Edited source',
        updatedAt: 5,
      })),
    };
    const staleResult = buildResumeDraftFromFacts(sourceChanged, [current], 'en');
    expect(staleResult.includedFactIds).toEqual([]);
    expect(staleResult.resume.experience).toEqual([]);
  });

  it('keeps aggregate output ordering stable regardless of fact input order', () => {
    const facts = [
      fact('d-team', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { company: 'BrightWorks', role: 'Engineer', teamResponsibilities: ['Team duty'] },
      }),
      fact('b-individual', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: {
          company: 'BrightWorks',
          role: 'Engineer',
          individualResponsibilities: ['Individual duty'],
        },
      }),
      fact('c-other-role', {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { company: 'BrightWorks', role: 'Manager' },
      }),
    ];

    const forward = buildResumeDraftFromFacts(session, facts, 'en');
    const reverse = buildResumeDraftFromFacts(session, [...facts].reverse(), 'en');

    expect(forward.resume.experience).toEqual(reverse.resume.experience);
    expect(forward.recordFactIds).toEqual(reverse.recordFactIds);
    expect(buildResumeDraftFromFacts(session, facts, 'en').resume).toEqual(forward.resume);
  });

  it('returns a schema-valid empty draft and blocks inclusion if the aggregate exceeds schema limits', () => {
    const tooManyHighlights = Array.from({ length: 101 }, (_, index) =>
      fact(`work-${String(index).padStart(3, '0')}`, {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: {
          company: 'BrightWorks',
          role: 'Engineer',
          individualResponsibilities: [`Duty ${index}`],
        },
      }),
    );
    const result = buildResumeDraftFromFacts(session, tooManyHighlights, 'en');

    expect(result.validationError).not.toBeNull();
    expect(result.includedFactIds).toEqual([]);
    expect(result.excludedFactIds).toHaveLength(101);
    expect(resumeSchema.safeParse(result.resume).success).toBe(true);
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
