import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AIInterviewProviderClient, InterviewSession } from '../model/types';
import { useResumeFacts } from '../model/useResumeFacts';
import FactVerificationPanel from './FactVerificationPanel';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const session: InterviewSession = {
  id: 'session-ui',
  generation: 1,
  currentPhase: 'review',
  currentQuestion: null,
  questions: [
    {
      id: 'q-role',
      phase: 'targetRole',
      content: '你希望应聘什么岗位？',
      source: 'template',
      followUpIndex: 0,
      createdAt: 1,
    },
  ],
  answers: [
    {
      id: 'a-role',
      questionId: 'q-role',
      text: '我希望应聘后端工程师。',
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
  status: 'asking',
  requestStatus: 'idle',
  requestId: null,
  providerGeneration: 0,
  previewQuestion: '',
  privacyConsentPending: false,
  createdAt: 1,
  updatedAt: 2,
};

const provider: AIInterviewProviderClient = {
  configuration: null,
  isConfigured: false,
  connectionStatus: 'not_configured',
  streamComplete: vi.fn(),
};

const Harness = () => {
  const controller = useResumeFacts(session, provider, 'zh-CN');
  return (
    <FactVerificationPanel
      session={session}
      provider={provider}
      controller={controller}
      onOpenProviderSettings={vi.fn()}
    />
  );
};

describe('FactVerificationPanel', () => {
  it('localizes source question labels when a session was created before interview translations loaded', () => {
    const rawQuestionSession: InterviewSession = {
      ...session,
      questions: [
        {
          ...session.questions[0]!,
          content: 'aiInterview.questions.targetRole.initial',
          ruleKind: 'initial',
        },
      ],
    };
    const RawQuestionHarness = () => {
      const controller = useResumeFacts(rawQuestionSession, provider, 'zh-CN');
      return (
        <FactVerificationPanel
          session={rawQuestionSession}
          provider={provider}
          controller={controller}
          onOpenProviderSettings={vi.fn()}
        />
      );
    };

    render(<RawQuestionHarness />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: '手动整理事实' }));

    expect(
      screen.getByRole('option', {
        name: '你希望应聘什么岗位或寻找什么类型的机会？可以先宽泛介绍，也可以跳过。',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('aiInterview.questions.targetRole.initial')).toBeNull();
  });

  it('keeps multiline summary fields as schema strings so users can confirm them', () => {
    render(<Harness />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: '手动整理事实' }));
    fireEvent.change(screen.getByLabelText('事实类型'), { target: { value: 'personal' } });
    fireEvent.change(screen.getByLabelText('来源回答'), { target: { value: 'a-role' } });
    fireEvent.change(screen.getByLabelText('简介'), {
      target: { value: 'I built reliable services using TypeScript.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加待核实事实' }));

    expect(screen.getByText('I built reliable services using TypeScript.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '我已核对这些字段' }));
    expect(screen.getByText('字段含义已由你确认')).toBeTruthy();
  });

  it('supports manual fact entry, source review, confirmation, and rejection without a provider', () => {
    render(<Harness />, { wrapper });

    expect(screen.getByText('没有可用 AI 服务。你仍可手动添加事实并关联到访谈回答。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '手动整理事实' }));
    fireEvent.change(screen.getByLabelText('来源回答'), { target: { value: 'a-role' } });
    fireEvent.change(screen.getByLabelText('目标岗位'), {
      target: { value: '后端工程师' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加待核实事实' }));

    expect(screen.getByText('后端工程师')).toBeTruthy();
    expect(screen.getByText('字段含义待你核对')).toBeTruthy();
    fireEvent.click(screen.getByText('查看来源回答'));
    expect(screen.getByText('你希望应聘什么岗位？')).toBeTruthy();
    expect(screen.getByText('我希望应聘后端工程师。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '我已核对这些字段' }));
    expect(screen.getByText('字段含义已由你确认')).toBeTruthy();
    expect(screen.getByText('已确认事实汇总（1）')).toBeTruthy();
  });

  it('shows linked source separately from semantic confirmation and lets the user correct field meaning', async () => {
    const reviewSession: InterviewSession = {
      ...session,
      answers: [
        {
          id: 'a-experience',
          questionId: 'q-role',
          text: 'I worked for BrightWorks as an engineer. We built a billing app for Northwind Health, our customer. I personally wrote the import tool, while the whole team launched the migration.',
          skipped: false,
          createdAt: 2,
          updatedAt: 2,
        },
      ],
    };
    const reviewProvider: AIInterviewProviderClient = {
      configuration: { baseUrl: 'https://provider.example/v1', model: 'test-model' },
      isConfigured: true,
      connectionStatus: 'ready',
      streamComplete: vi.fn<AIInterviewProviderClient['streamComplete']>().mockResolvedValue({
        content: JSON.stringify({
          facts: [
            {
              kind: 'experience',
              sourceQuestionId: 'q-role',
              sourceAnswerId: 'a-experience',
              value: {
                company: 'Northwind Health',
                role: 'engineer',
                individualResponsibilities: ['the whole team launched the migration'],
              },
            },
          ],
        }),
      }),
    };
    const SemanticReviewHarness = () => {
      const controller = useResumeFacts(reviewSession, reviewProvider, 'zh-CN');
      return (
        <FactVerificationPanel
          session={reviewSession}
          provider={reviewProvider}
          controller={controller}
          onOpenProviderSettings={vi.fn()}
        />
      );
    };

    render(<SemanticReviewHarness />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'AI 提取事实' }));
    fireEvent.click(screen.getByRole('button', { name: '发送这些回答并提取' }));

    expect(await screen.findByText('Northwind Health')).toBeTruthy();
    expect(screen.getByText('字段含义待你核对')).toBeTruthy();
    expect(screen.getByText(/已关联来源回答/u)).toBeTruthy();
    expect(screen.getByText('雇主/任职公司（非客户公司）:')).toBeTruthy();
    expect(screen.getByText('个人独立负责:')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.change(screen.getByLabelText('雇主/任职公司（非客户公司）'), {
      target: { value: 'BrightWorks' },
    });
    fireEvent.change(screen.getByLabelText('个人独立负责'), {
      target: { value: 'I personally wrote the import tool' },
    });
    fireEvent.change(screen.getByLabelText('与团队协作'), {
      target: { value: 'the whole team launched the migration' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存修改并重新核实' }));

    expect(screen.getByText('字段含义待你核对')).toBeTruthy();
    fireEvent.click(screen.getByText('查看来源回答'));
    expect(screen.getByText(reviewSession.answers[0]?.text ?? '')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '我已核对这些字段' }));
    expect(screen.getByText('字段含义已由你确认')).toBeTruthy();
  });
});
