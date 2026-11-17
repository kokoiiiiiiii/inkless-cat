import { I18nProvider } from '@shared/i18n';
import { LOCALE_KEY } from '@shared/i18n/config';
import { cleanup, render, screen } from '@testing-library/react';
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
});
