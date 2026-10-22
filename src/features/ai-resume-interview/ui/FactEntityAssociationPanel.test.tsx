import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createFactEntityLink, type FactEntityLink } from '../model/factEntityLinks';
import { createResumeFact, type ResumeFact } from '../model/facts';
import type { InterviewSession } from '../model/types';
import type { ResumeFactsController } from '../model/useResumeFacts';
import FactEntityAssociationPanel from './FactEntityAssociationPanel';

const makeSession = (id: string): InterviewSession => ({
  id,
  generation: 1,
  currentPhase: 'review',
  currentQuestion: null,
  questions: [
    {
      id: `q-${id}`,
      phase: 'work',
      content: 'Describe your work.',
      source: 'template',
      followUpIndex: 0,
      createdAt: 1,
    },
  ],
  answers: [
    {
      id: `a-${id}`,
      questionId: `q-${id}`,
      text: `Answer for ${id}.`,
      skipped: false,
      createdAt: 2,
      updatedAt: 2,
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
  updatedAt: 2,
});

const makeFact = (
  session: InterviewSession,
  id: string,
  company: string,
  value: { startDate?: string; endDate?: string } = {},
): ResumeFact => ({
  ...createResumeFact(
    {
      kind: 'experience',
      sourceQuestionId: session.questions[0]!.id,
      sourceAnswerId: session.answers[0]!.id!,
      value: { company, role: 'Engineer', ...value },
    },
    session,
    'manual',
    3,
  ),
  id,
  status: 'confirmed',
});

const makeController = (
  session: InterviewSession,
  facts: ResumeFact[],
  entityLinks: FactEntityLink[] = [],
): ResumeFactsController => ({
  facts,
  entityLinks,
  entitySeparations: [],
  pendingCount: 0,
  confirmedCount: facts.filter((fact) => fact.status === 'confirmed').length,
  conflictCount: 0,
  staleCount: 0,
  extractionState: 'idle',
  errorCode: null,
  includedAnswerIds: [],
  omittedAnswerCount: 0,
  inputCodeUnits: 0,
  extract: vi.fn(() => Promise.resolve()),
  cancelExtraction: vi.fn(),
  updateFact: vi.fn(),
  confirmFact: vi.fn(),
  rejectFact: vi.fn(),
  removeFact: vi.fn(),
  addManualFact: vi.fn(),
  linkEntityFacts: vi.fn((factIds) =>
    createFactEntityLink(session, facts, entityLinks, factIds, `entity-${session.id}`),
  ),
  unlinkEntityFacts: vi.fn(),
  confirmEntityLink: vi.fn(() => true),
  keepEntityFactsSeparate: vi.fn(() => true),
});

const renderPanel = (session: InterviewSession, controller: ResumeFactsController) =>
  render(
    <I18nProvider>
      <FactEntityAssociationPanel session={session} controller={controller} />
    </I18nProvider>,
  );

describe('FactEntityAssociationPanel', () => {
  it('drops selections from a previous session before associating current facts', () => {
    const firstSession = makeSession('first-session');
    const firstFacts = [
      makeFact(firstSession, 'first-fact-a', 'First Company', { startDate: '2020' }),
      makeFact(firstSession, 'first-fact-b', 'First Company', { endDate: '2021' }),
    ];
    const firstController = makeController(firstSession, firstFacts);
    const { rerender } = renderPanel(firstSession, firstController);

    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    expect(screen.getByText('已选择 2 条')).toBeTruthy();

    const secondSession = makeSession('second-session');
    const secondFacts = [
      makeFact(secondSession, 'second-fact-a', 'Second Company', { startDate: '2022' }),
      makeFact(secondSession, 'second-fact-b', 'Second Company', { endDate: '2023' }),
    ];
    const secondController = makeController(secondSession, secondFacts);
    rerender(
      <I18nProvider>
        <FactEntityAssociationPanel session={secondSession} controller={secondController} />
      </I18nProvider>,
    );

    expect(screen.getByText('已选择 0 条')).toBeTruthy();
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    expect(screen.getByText('已选择 2 条')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认属于同一条记录' }));

    expect(secondController.linkEntityFacts).toHaveBeenCalledWith([
      'second-fact-a',
      'second-fact-b',
    ]);
  });

  it('removes deleted or no-longer-confirmed facts from the selection count and action', async () => {
    const activeSession = makeSession('selection-session');
    const first = makeFact(activeSession, 'fact-a', 'Current Company', { startDate: '2020' });
    const second = makeFact(activeSession, 'fact-b', 'Current Company', { endDate: '2021' });
    const third = makeFact(activeSession, 'fact-c', 'Current Company', { startDate: '2018' });
    const controller = makeController(activeSession, [first, second, third]);
    const { rerender } = renderPanel(activeSession, controller);

    for (const checkbox of screen.getAllByRole('checkbox').slice(0, 2)) {
      fireEvent.click(checkbox);
    }
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '确认属于同一条记录' }).disabled,
    ).toBe(false);

    const invalidatedController = makeController(activeSession, [
      first,
      { ...second, status: 'pending' },
      third,
    ]);
    rerender(
      <I18nProvider>
        <FactEntityAssociationPanel session={activeSession} controller={invalidatedController} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText('已选择 1 条')).toBeTruthy());
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '确认属于同一条记录' }).disabled,
    ).toBe(true);

    const deletedController = makeController(activeSession, [
      { ...second, status: 'pending' },
      third,
    ]);
    rerender(
      <I18nProvider>
        <FactEntityAssociationPanel session={activeSession} controller={deletedController} />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('已选择 0 条')).toBeTruthy());
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '确认属于同一条记录' }).disabled,
    ).toBe(true);
  });

  it('keeps each saved-link label attached to its original fact ID when an earlier fact is missing', () => {
    const activeSession = makeSession('label-session');
    const first = makeFact(activeSession, 'fact-a-missing', 'Shared Company', {
      startDate: '2020',
    });
    const second = makeFact(activeSession, 'fact-b-current', 'Shared Company', { endDate: '2022' });
    const created = createFactEntityLink(
      activeSession,
      [first, second],
      [],
      [first.id, second.id],
      'saved-entity',
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const controller = makeController(activeSession, [second], [created.link]);
    renderPanel(activeSession, controller);

    const savedFacts = screen.getByRole('list');
    expect([...savedFacts.children].map((item) => item.textContent)).toEqual([
      'fact-a-missing',
      '工作经历: Shared Company · Engineer · 2022',
    ]);
    expect(screen.queryByText('Shared Company · Engineer · 2020')).toBeNull();
  });
});
