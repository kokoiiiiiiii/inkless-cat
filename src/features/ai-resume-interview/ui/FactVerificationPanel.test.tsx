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
    expect(screen.getByText('待确认')).toBeTruthy();
    fireEvent.click(screen.getByText('查看来源回答'));
    expect(screen.getByText('你希望应聘什么岗位？')).toBeTruthy();
    expect(screen.getByText('我希望应聘后端工程师。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '确认事实' }));
    expect(screen.getByText('已确认')).toBeTruthy();
    expect(screen.getByText('已确认事实汇总（1）')).toBeTruthy();
  });
});
