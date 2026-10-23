import { I18nProvider } from '@shared/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import type { AIInterviewProviderClient } from '../model/types';
import AIResumeInterviewRuntime from './AIResumeInterviewRuntime';

const provider: AIInterviewProviderClient = {
  configuration: null,
  isConfigured: false,
  connectionStatus: 'not_configured',
  streamComplete: () => Promise.resolve({ content: '' }),
};

const Harness = () => {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <I18nProvider>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)}>
        打开访谈
      </button>
      <AIResumeInterviewRuntime
        open={open}
        provider={provider}
        openerRef={openerRef}
        onPause={() => setOpen(false)}
        onOpenProviderSettings={() => {}}
      />
    </I18nProvider>
  );
};

describe('AIResumeInterviewRuntime accessibility and answer budget', () => {
  afterEach(() => cleanup());

  it('moves focus into the cancel alertdialog, traps Tab both ways, and restores focus on Escape', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '打开访谈' }));
    const dialog = screen.getByRole('dialog', { name: 'AI 智能简历访谈' });
    expect(document.activeElement).toBe(dialog.querySelector('[aria-label="暂停访谈并关闭"]'));

    fireEvent.click(screen.getByRole('button', { name: '使用基础问题开始' }));
    const cancelButton = screen.getByRole('button', { name: '取消访谈' });
    fireEvent.click(cancelButton);

    const alertdialog = screen.getByRole('alertdialog', { name: '要丢弃本次访谈吗？' });
    const keepButton = screen.getByRole('button', { name: '继续访谈' });
    const discardButton = screen.getByRole('button', { name: '丢弃回答' });
    expect(alertdialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(keepButton);
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.hasAttribute('inert')).toBe(true);

    fireEvent.keyDown(keepButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(discardButton);
    fireEvent.keyDown(discardButton, { key: 'Tab' });
    expect(document.activeElement).toBe(keepButton);
    fireEvent.keyDown(keepButton, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'AI 智能简历访谈' })).toBeTruthy();
    expect(document.activeElement).toBe(cancelButton);
    expect(screen.getByRole('button', { name: '取消访谈' })).toBeTruthy();
  });

  it('restores focus after confirming discard and supports pausing and reopening the main dialog', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: '打开访谈' });
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: '使用基础问题开始' }));
    fireEvent.click(screen.getByRole('button', { name: '取消访谈' }));
    fireEvent.click(screen.getByRole('button', { name: '丢弃回答' }));

    const closeOnlyButton = screen.getByRole('button', { name: /^关闭$/u });
    expect(document.activeElement).toBe(closeOnlyButton);
    fireEvent.click(closeOnlyButton);
    expect(screen.queryByRole('dialog', { name: 'AI 智能简历访谈' })).toBeNull();
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'AI 智能简历访谈' })).toBeTruthy();
  });

  it('keeps an over-budget answer draft intact, explains the limit, and blocks submission', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '打开访谈' }));
    const dialog = screen.getByRole('dialog', { name: 'AI 智能简历访谈' });
    fireEvent.click(screen.getByRole('button', { name: '使用基础问题开始' }));

    const answerBox = screen.getByRole('textbox', { name: '你的回答' });
    const overBudgetAnswer = '项目'.repeat(251);
    fireEvent.change(answerBox, { target: { value: overBudgetAnswer } });

    expect((answerBox as HTMLTextAreaElement).value).toBe(overBudgetAnswer);
    expect(
      screen.getByText('这条回答超过 AI 的 500 字符上限。草稿仍完整保留，请自行精简后再发送。'),
    ).toBeTruthy();
    const submitButton = screen.getByRole('button', { name: '发送回答' });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(answerBox.closest('form') as HTMLFormElement);
    expect((answerBox as HTMLTextAreaElement).value).toBe(overBudgetAnswer);
    expect(dialog.querySelector('textarea')).toBe(answerBox);

    fireEvent.change(answerBox, { target: { value: 'Backend engineer' } });
    expect((submitButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submitButton);
    expect(screen.queryByRole('textbox', { name: '你的回答' })).not.toBeNull();
  });
});
