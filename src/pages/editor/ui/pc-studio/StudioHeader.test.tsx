import { I18nProvider } from '@shared/i18n';
import { LOCALE_KEY } from '@shared/i18n/config';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LocalSaveStatus } from '../../model/pc-studio/useLocalSaveStatus';
import StudioHeader from './StudioHeader';

const statusCases = [
  ['en', 'checking', 'Checking local save…'],
  ['en', 'ready', 'Local workspace'],
  ['en', 'saving', 'Saving…'],
  ['en', 'saved', 'Saved on this device'],
  ['en', 'error', 'Local save not confirmed'],
  ['zh-CN', 'checking', '检查本地保存…'],
  ['zh-CN', 'ready', '本地工作区'],
  ['zh-CN', 'saving', '正在保存…'],
  ['zh-CN', 'saved', '已保存到此设备'],
  ['zh-CN', 'error', '本地保存未确认'],
] as const satisfies ReadonlyArray<readonly [string, LocalSaveStatus, string]>;

afterEach(() => {
  cleanup();
  localStorage.removeItem(LOCALE_KEY);
});

describe('StudioHeader save status', () => {
  it.each(statusCases)('announces the %s %s status', (locale, saveStatus, label) => {
    localStorage.setItem(LOCALE_KEY, locale);
    render(
      <I18nProvider>
        <StudioHeader
          saveStatus={saveStatus}
          resumeName="Fictional Resume"
          templateName="Fictional Template"
          aiOpen={false}
          previewActive={false}
          templateCenterOpen={false}
          theme="light"
          templateButtonRef={createRef<HTMLButtonElement>()}
          onOpenTemplates={vi.fn()}
          onToggleAI={vi.fn()}
          onTogglePreview={vi.fn()}
          onToggleTheme={vi.fn()}
          onExportJson={vi.fn()}
          onExportWorkspaceJson={vi.fn()}
          onExportMarkdown={vi.fn()}
          onPrint={vi.fn()}
          onExit={vi.fn()}
        />
      </I18nProvider>,
    );

    const status = screen.getByRole('status');
    expect(status.dataset.saveState).toBe(saveStatus);
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain(label);
  });

  it('closes the export disclosure with Escape and restores summary focus', () => {
    localStorage.setItem(LOCALE_KEY, 'en');
    render(
      <I18nProvider>
        <StudioHeader
          saveStatus="ready"
          resumeName="Fictional Resume"
          templateName="Fictional Template"
          aiOpen={false}
          previewActive={false}
          templateCenterOpen={false}
          theme="light"
          templateButtonRef={createRef<HTMLButtonElement>()}
          onOpenTemplates={vi.fn()}
          onToggleAI={vi.fn()}
          onTogglePreview={vi.fn()}
          onToggleTheme={vi.fn()}
          onExportJson={vi.fn()}
          onExportWorkspaceJson={vi.fn()}
          onExportMarkdown={vi.fn()}
          onPrint={vi.fn()}
          onExit={vi.fn()}
        />
      </I18nProvider>,
    );

    const details = document.querySelector<HTMLDetailsElement>('.pc-export-menu details');
    if (!details) throw new Error('Export disclosure is missing.');
    details.open = true;
    const summary = details.querySelector('summary');
    const menuItem = screen.getByRole('menuitem', { name: 'JSON' });
    expect(summary).not.toBeNull();
    menuItem.focus();
    fireEvent.keyDown(menuItem, { key: 'Escape' });

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('dispatches every export menu item to its matching handler without opening a print dialog', () => {
    localStorage.setItem(LOCALE_KEY, 'en');
    const handlers = {
      json: vi.fn(),
      workspace: vi.fn(),
      markdown: vi.fn(),
      print: vi.fn(),
    };
    render(
      <I18nProvider>
        <StudioHeader
          saveStatus="ready"
          resumeName="Fictional Resume"
          templateName="Fictional Template"
          aiOpen={false}
          previewActive={false}
          templateCenterOpen={false}
          theme="light"
          templateButtonRef={createRef<HTMLButtonElement>()}
          onOpenTemplates={vi.fn()}
          onToggleAI={vi.fn()}
          onTogglePreview={vi.fn()}
          onToggleTheme={vi.fn()}
          onExportJson={handlers.json}
          onExportWorkspaceJson={handlers.workspace}
          onExportMarkdown={handlers.markdown}
          onPrint={handlers.print}
          onExit={vi.fn()}
        />
      </I18nProvider>,
    );

    const details = document.querySelector<HTMLDetailsElement>('.pc-export-menu details');
    if (!details) throw new Error('Export disclosure is missing.');
    const exportCases = [
      ['JSON', handlers.json],
      ['Export Workspace', handlers.workspace],
      ['Export Markdown', handlers.markdown],
      ['Print / PDF', handlers.print],
    ] as const;

    for (const [label, handler] of exportCases) {
      details.open = true;
      fireEvent.click(screen.getByRole('menuitem', { name: label }));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(details.open).toBe(false);
    }
  });
});
