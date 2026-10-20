import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ActionButtons from './ActionButtons';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('ActionButtons locale dialog accessibility', () => {
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
