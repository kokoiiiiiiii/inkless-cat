import { AIProviderProvider } from '@features/ai-provider-settings';
import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ActionButtons from './ActionButtons';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AIProviderProvider>
    <I18nProvider>{children}</I18nProvider>
  </AIProviderProvider>
);

describe('ActionButtons locale dialog accessibility', () => {
  it('uses a base-dictionary label for the lazy AI interview launcher', () => {
    render(
      <ActionButtons
        onResetSample={vi.fn()}
        onClear={vi.fn()}
        onImportClick={vi.fn()}
        onExport={vi.fn()}
        onExportWorkspace={vi.fn()}
        onExportMarkdown={vi.fn()}
        onPrint={vi.fn()}
        theme="light"
        onToggleTheme={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
        onFileChange={vi.fn()}
        onLocaleChange={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByRole('button', { name: 'AI 创建简历' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'aiInterview.trigger' })).toBeNull();
  });

  it('focuses the dialog, traps keyboard focus, closes with Escape, and restores focus', () => {
    render(
      <ActionButtons
        onResetSample={vi.fn()}
        onClear={vi.fn()}
        onImportClick={vi.fn()}
        onExport={vi.fn()}
        onExportWorkspace={vi.fn()}
        onExportMarkdown={vi.fn()}
        onPrint={vi.fn()}
        theme="light"
        onToggleTheme={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
        onFileChange={vi.fn()}
        onLocaleChange={vi.fn()}
      />,
      { wrapper },
    );

    const trigger = screen.getByRole('button', { name: 'English' });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '切换语言' });
    const firstButton = screen.getByRole('button', { name: '仅切换语言' });
    const lastButton = screen.getByRole('button', { name: '取消' });
    expect(document.activeElement).toBe(firstButton);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastButton);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(dialog).not.toBeNull();
  });
});

describe('AI provider settings dialog accessibility', () => {
  it('portals the dialog, protects Chinese IME input from Escape, and restores focus', async () => {
    render(
      <ActionButtons
        onResetSample={vi.fn()}
        onClear={vi.fn()}
        onImportClick={vi.fn()}
        onExport={vi.fn()}
        onExportWorkspace={vi.fn()}
        onExportMarkdown={vi.fn()}
        onPrint={vi.fn()}
        theme="light"
        onToggleTheme={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
        onFileChange={vi.fn()}
        onLocaleChange={vi.fn()}
      />,
      { wrapper },
    );

    const trigger = screen.getByRole('button', { name: 'AI 设置' });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'AI 服务设置' });
    const baseUrl = await screen.findByRole('textbox', { name: 'API Base URL' });
    const model = screen.getByRole('textbox', { name: '模型 ID' });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.activeElement).toBe(baseUrl);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.compositionStart(baseUrl);
    fireEvent.change(baseUrl, { target: { value: 'https://provider.example/v1/模型' } });
    fireEvent.keyDown(baseUrl, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'AI 服务设置' })).not.toBeNull();
    expect(baseUrl).toHaveProperty('value', 'https://provider.example/v1/模型');
    expect(document.activeElement).toBe(baseUrl);
    fireEvent.compositionEnd(baseUrl);

    model.focus();
    fireEvent.compositionStart(model);
    fireEvent.change(model, { target: { value: '混合模型' } });
    fireEvent.keyDown(model, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(model, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'AI 服务设置' })).not.toBeNull();
    expect(model).toHaveProperty('value', '混合模型');
    expect(document.activeElement).toBe(model);
    fireEvent.compositionEnd(model);

    fireEvent.keyDown(model, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(model, { key: 'Escape', keyCode: 229 });
    expect(screen.queryByRole('dialog', { name: 'AI 服务设置' })).not.toBeNull();
    fireEvent.keyDown(model, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'AI 服务设置' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(trigger);
    const reopenedBaseUrl = await screen.findByRole('textbox', { name: 'API Base URL' });
    expect(reopenedBaseUrl).toHaveProperty('value', 'https://provider.example/v1/模型');
    expect(screen.getByRole('textbox', { name: '模型 ID' })).toHaveProperty('value', '混合模型');
    await waitFor(() => expect(document.activeElement).toBe(reopenedBaseUrl));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'AI 服务设置' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('retains the saved session configuration after the settings dialog closes', async () => {
    render(
      <ActionButtons
        onResetSample={vi.fn()}
        onClear={vi.fn()}
        onImportClick={vi.fn()}
        onExport={vi.fn()}
        onExportWorkspace={vi.fn()}
        onExportMarkdown={vi.fn()}
        onPrint={vi.fn()}
        theme="light"
        onToggleTheme={vi.fn()}
        inputRef={createRef<HTMLInputElement>()}
        onFileChange={vi.fn()}
        onLocaleChange={vi.fn()}
      />,
      { wrapper },
    );

    const trigger = screen.getByRole('button', { name: 'AI 设置' });
    fireEvent.click(trigger);
    fireEvent.change(await screen.findByRole('textbox', { name: 'API Base URL' }), {
      target: { value: 'https://provider.example/v1' },
    });
    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'runtime-secret-test-only' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '模型 ID' }), {
      target: { value: 'saved-model' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存到当前会话' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭 AI 设置' }));

    expect(screen.queryByRole('dialog', { name: 'AI 服务设置' })).toBeNull();
    fireEvent.click(trigger);
    expect(await screen.findByRole('textbox', { name: 'API Base URL' })).toHaveProperty(
      'value',
      'https://provider.example/v1',
    );
    expect(screen.getByLabelText('API Key')).toHaveProperty('value', 'runtime-secret-test-only');
    expect(screen.getByRole('textbox', { name: '模型 ID' })).toHaveProperty('value', 'saved-model');
  });
});
