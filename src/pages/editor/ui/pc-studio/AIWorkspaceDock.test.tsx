import { createEmptyResume } from '@entities/resume';
// eslint-disable-next-line no-restricted-imports -- the test needs to supply successive launcher values.
import { AIResumeEnhancementLauncherContext } from '@features/ai-resume-enhancement/model/AIResumeEnhancementLauncherContext';
import { I18nProvider } from '@shared/i18n';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createStudioFieldContext } from '../../model/pc-studio/fieldContext';
import AIWorkspaceDock from './AIWorkspaceDock';

vi.mock('@features/ai-provider-settings', () => ({
  useAIProviderClient: () => ({ isConfigured: true }),
}));

vi.mock('@features/ai-provider-settings/ui/AIProviderSettingsDialog', () => ({
  default: () => null,
}));

const makeFieldContext = () => {
  const resume = createEmptyResume();
  resume.personal.summary = 'Existing professional summary';
  return {
    ...createStudioFieldContext(
      resume,
      {
        moduleKey: 'personal',
        sectionKey: 'summary',
        itemKey: 'personal',
        fieldId: 'personal.summary',
      },
      {
        sourceRevision: 7,
        workspaceGeneration: 3,
        selectionRange: { start: 2, end: 8, direction: 'backward' },
      },
    ),
    fieldLabel: 'Professional summary',
  };
};

const makeLauncher = () => ({ open: vi.fn(), closeInline: vi.fn() });

const makeDock = (launcher: ReturnType<typeof makeLauncher>) => (
  <I18nProvider>
    <AIResumeEnhancementLauncherContext.Provider value={launcher}>
      <AIWorkspaceDock
        moduleKey="personal"
        moduleLabel="Personal"
        fieldContext={makeFieldContext()}
        onClose={vi.fn()}
        onReturnToPreview={vi.fn()}
      />
    </AIResumeEnhancementLauncherContext.Provider>
  </I18nProvider>
);

describe('AIWorkspaceDock contextual launch', () => {
  afterEach(() => cleanup());

  it('keeps the inline request mounted across launcher updates and closes it only on unmount', async () => {
    const firstLauncher = makeLauncher();
    const rendered = render(makeDock(firstLauncher));
    await act(async () => {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    });
    const mountNode = screen.getByTestId('pc-ai-inline-mount');

    fireEvent.click(screen.getByRole('button', { name: '比较 AI 建议' }));

    expect(firstLauncher.open).toHaveBeenCalledWith(
      { kind: 'personal-summary' },
      expect.any(HTMLButtonElement),
      expect.objectContaining({
        presentation: 'inline',
        mountNode,
        fieldLabel: 'Professional summary',
        sourceValue: 'Existing professional summary',
        sourceRevision: 7,
        workspaceGeneration: 3,
        selectionRange: { start: 2, end: 8, direction: 'backward' },
      }),
    );

    const latestLauncher = makeLauncher();
    rendered.rerender(makeDock(latestLauncher));
    expect(firstLauncher.closeInline).not.toHaveBeenCalled();

    rendered.unmount();
    expect(latestLauncher.closeInline).toHaveBeenCalledWith(mountNode);
  });
});
