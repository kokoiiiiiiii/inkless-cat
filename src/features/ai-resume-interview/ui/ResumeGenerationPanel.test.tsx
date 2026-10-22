import { createEmptyResume, deriveSectionsFromResume, useResumeStore } from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createResumeFact } from '../model/facts';
import type { AIInterviewProviderClient, InterviewSession } from '../model/types';
import ResumeGenerationPanel from './ResumeGenerationPanel';

const session: InterviewSession = {
  id: 'generation-panel-session',
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
      text: 'I worked at BrightWorks.',
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

const confirmedFacts = [
  {
    ...createResumeFact(
      {
        kind: 'personal',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: { fullName: 'Lin Chen', email: 'lin@example.com' },
      },
      session,
      'manual',
      4,
    ),
    id: 'fact-personal',
    status: 'confirmed' as const,
  },
  {
    ...createResumeFact(
      {
        kind: 'experience',
        sourceQuestionId: 'q-source',
        sourceAnswerId: 'a-source',
        value: {
          company: 'BrightWorks',
          role: 'Engineer',
          individualResponsibilities: ['I wrote the import tool'],
          teamResponsibilities: ['the team launched the migration'],
        },
      },
      session,
      'manual',
      5,
    ),
    id: 'fact-work',
    status: 'confirmed' as const,
  },
];

const provider: AIInterviewProviderClient = {
  configuration: null,
  isConfigured: false,
  connectionStatus: 'not_configured',
  streamComplete: vi.fn(),
};

const Harness = () => {
  const [currentSession, setCurrentSession] = useState(session);
  const facts = useMemo(() => confirmedFacts, []);
  return (
    <I18nProvider>
      <button
        type="button"
        onClick={() =>
          setCurrentSession((current) => ({ ...current, updatedAt: current.updatedAt + 1 }))
        }
      >
        Change interview
      </button>
      <ResumeGenerationPanel session={currentSession} facts={facts} provider={provider} />
    </I18nProvider>
  );
};

const resetStore = () => {
  const existing = createEmptyResume();
  existing.personal.fullName = 'Existing resume';
  existing.experience = [
    { id: 'existing-work', company: 'Existing Company', highlights: ['Keep this data'] },
  ];
  useResumeStore.setState({
    resume: existing,
    activeSections: deriveSectionsFromResume(existing),
    hasResumeChanges: false,
    workspaceGeneration: 0,
  });
  useResumeStore.persist?.clearStorage();
};

describe('ResumeGenerationPanel', () => {
  beforeEach(resetStore);
  afterEach(() => {
    cleanup();
    useResumeStore.persist?.clearStorage();
  });

  it('keeps an editable independent preview, then requires a separate checked confirmation and supports undo', () => {
    const previous = useResumeStore.getState().resume;
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    expect(screen.getByTestId('generated-resume-draft')).toBeTruthy();
    expect(screen.getByLabelText('姓名')).toBeTruthy();
    expect(screen.getByText('个人负责：I wrote the import tool')).toBeTruthy();
    expect(screen.getByText('与团队协作：the team launched the migration')).toBeTruthy();
    expect(useResumeStore.getState().resume).toBe(previous);
    expect(provider.streamComplete).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Edited candidate' } });
    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');

    fireEvent.click(screen.getByRole('button', { name: '检查并替换当前简历' }));
    const confirm = screen.getByRole('button', { name: '确认替换正式简历' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /理解这会替换当前正式简历/u }));
    fireEvent.click(confirm);
    expect(useResumeStore.getState().resume.personal.fullName).toBe('Edited candidate');
    expect(useResumeStore.getState().resume.experience[0]?.company).toBe('BrightWorks');
    expect(useResumeStore.getState().resume.experience).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '撤销并恢复原简历' }));
    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');
    expect(useResumeStore.getState().resume.experience[0]?.company).toBe('Existing Company');
  });

  it('sends wording only after explicit review, and applies suggestions to the draft one at a time', async () => {
    const previous = useResumeStore.getState().resume;
    const streamComplete = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        suggestions: [
          {
            id: 'experience:generated-experience-1-fact-work:highlight:0',
            text: 'I authored the import tool',
          },
          {
            id: 'experience:generated-experience-1-fact-work:highlight:1',
            text: 'the team launched the migration',
          },
        ],
      }),
    });
    const configuredProvider: AIInterviewProviderClient = {
      configuration: { baseUrl: 'https://provider.example/v1', model: 'test-model' },
      isConfigured: true,
      connectionStatus: 'ready',
      streamComplete,
    };
    render(
      <I18nProvider>
        <ResumeGenerationPanel
          session={session}
          facts={confirmedFacts}
          provider={configuredProvider}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    expect(streamComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '检查即将发送的文字' }));
    expect(screen.getByText(/以下 2 项叙述文字会直接发送/u)).toBeTruthy();
    expect(screen.getByText('I wrote the import tool')).toBeTruthy();
    expect(streamComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '发送叙述文字并获取建议' }));
    await waitFor(() =>
      expect(screen.getByText('个人负责：I authored the import tool')).toBeTruthy(),
    );
    expect(streamComplete).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(streamComplete.mock.calls[0]?.[0])).not.toContain('lin@example.com');
    expect(JSON.stringify(streamComplete.mock.calls[0]?.[0])).not.toContain('BrightWorks');
    expect(useResumeStore.getState().resume).toBe(previous);

    fireEvent.click(screen.getByText('编辑候选简历', { exact: true }));
    const highlights = screen.getByLabelText<HTMLTextAreaElement>(/职责与成果/u);
    expect(highlights.value).toContain('个人负责：I wrote the import tool');
    fireEvent.click(screen.getAllByRole('button', { name: '在草稿中采用' })[0]!);
    expect(highlights.value).toContain('个人负责：I authored the import tool');
    expect(highlights.value).toContain('与团队协作：the team launched the migration');
    expect(useResumeStore.getState().resume).toBe(previous);
  });

  it('discards a delayed wording response after the interview facts change', async () => {
    let resolveRequest!: (value: { content: string }) => void;
    const streamComplete = vi.fn(
      () =>
        new Promise<{ content: string }>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const configuredProvider: AIInterviewProviderClient = {
      configuration: { baseUrl: 'https://provider.example/v1', model: 'test-model' },
      isConfigured: true,
      connectionStatus: 'ready',
      streamComplete,
    };
    const props = { activeSession: session, currentFacts: confirmedFacts };
    const { rerender } = render(
      <I18nProvider>
        <ResumeGenerationPanel
          session={props.activeSession}
          facts={props.currentFacts}
          provider={configuredProvider}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    fireEvent.click(screen.getByRole('button', { name: '检查即将发送的文字' }));
    fireEvent.click(screen.getByRole('button', { name: '发送叙述文字并获取建议' }));
    expect(await screen.findByRole('status')).toBeTruthy();

    const changedSession = { ...session, updatedAt: session.updatedAt + 1 };
    rerender(
      <I18nProvider>
        <ResumeGenerationPanel
          session={changedSession}
          facts={props.currentFacts}
          provider={configuredProvider}
        />
      </I18nProvider>,
    );
    await act(async () => {
      resolveRequest({
        content: JSON.stringify({
          suggestions: [
            {
              id: 'experience:generated-experience-1-fact-work:highlight:0',
              text: 'I authored the import tool',
            },
            {
              id: 'experience:generated-experience-1-fact-work:highlight:1',
              text: 'the team launched the migration',
            },
          ],
        }),
      });
      await Promise.resolve();
    });

    expect(screen.queryByText('I authored the import tool')).toBeNull();
    expect(useResumeStore.getState().resume.personal.fullName).toBe('Existing resume');
  });

  it('invalidates the old candidate when the interview session changes', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change interview' }));

    expect(screen.getByRole('alert').textContent).toContain('草稿已失效');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '检查并替换当前简历' }).disabled,
    ).toBe(true);
  });

  it('invalidates a candidate when its confirmed fact set changes', () => {
    const { rerender } = render(
      <I18nProvider>
        <ResumeGenerationPanel session={session} facts={confirmedFacts} provider={provider} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    const changedFacts = confirmedFacts.map((fact, index) =>
      index === 0 ? { ...fact, status: 'pending' as const } : fact,
    );
    rerender(
      <I18nProvider>
        <ResumeGenerationPanel session={session} facts={changedFacts} provider={provider} />
      </I18nProvider>,
    );

    expect(screen.getByRole('alert').textContent).toContain('草稿已失效');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '检查并替换当前简历' }).disabled,
    ).toBe(true);
  });

  it('invalidates a candidate when the provider implementation changes', () => {
    const { rerender } = render(
      <I18nProvider>
        <ResumeGenerationPanel session={session} facts={confirmedFacts} provider={provider} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    const changedProvider = { ...provider, streamComplete: vi.fn() };
    rerender(
      <I18nProvider>
        <ResumeGenerationPanel
          session={session}
          facts={confirmedFacts}
          provider={changedProvider}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole('alert').textContent).toContain('草稿已失效');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '检查并替换当前简历' }).disabled,
    ).toBe(true);
  });

  it('shows unresolved conflict fields and keeps conflicted candidates out of generation', () => {
    const conflict = {
      ...createResumeFact(
        {
          kind: 'targetRole',
          sourceQuestionId: 'q-source',
          sourceAnswerId: 'a-source',
          value: 'Alternative role',
        },
        session,
        'manual',
        6,
      ),
      id: 'fact-conflict',
      status: 'conflict' as const,
      conflictFields: ['value'],
    };
    render(
      <I18nProvider>
        <ResumeGenerationPanel
          session={session}
          facts={[...confirmedFacts, conflict]}
          provider={provider}
        />
      </I18nProvider>,
    );

    expect(screen.getByText('未解决冲突（1）').parentElement?.textContent).toContain('目标岗位');
    expect(screen.getByText(/有冲突的候选事实不会进入草稿/u)).toBeTruthy();
  });

  it('refuses to replace a resume that changed after the confirmation snapshot', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '构建草稿' }));
    fireEvent.click(screen.getByRole('button', { name: '检查并替换当前简历' }));
    useResumeStore.getState().updateResume((resume) => {
      resume.personal.fullName = 'Newer user edit';
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /理解这会替换当前正式简历/u }));
    fireEvent.click(screen.getByRole('button', { name: '确认替换正式简历' }));

    expect(useResumeStore.getState().resume.personal.fullName).toBe('Newer user edit');
    expect(screen.getByText(/正式简历发生了变化/u)).toBeTruthy();
  });
});
