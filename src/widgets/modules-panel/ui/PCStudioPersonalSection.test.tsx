import { createEmptyResume } from '@entities/resume';
import { AIResumeEnhancementProvider } from '@features/ai-resume-enhancement';
import type { PersonalSettings } from '@features/edit-module';
import { I18nProvider } from '@shared/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import PCStudioPersonalSection from './PCStudioPersonalSection';

const personal = createEmptyResume().personal;
const settings: PersonalSettings = {
  showPhoto: false,
  photoSize: 96,
  photoPosition: 'right',
};
const provider = {
  configuration: null,
  isConfigured: false,
  connectionStatus: 'not_configured',
  complete: vi.fn().mockResolvedValue({ content: '' }),
  streamComplete: vi.fn().mockResolvedValue({ content: '' }),
} satisfies Parameters<typeof AIResumeEnhancementProvider>[0]['provider'];

const FocusRecoveryHarness = () => {
  const [moreFieldsOpen, setMoreFieldsOpen] = useState(false);
  const [editorMounted, setEditorMounted] = useState(true);

  return (
    <I18nProvider>
      <AIResumeEnhancementProvider provider={provider}>
        <button type="button" onClick={() => setEditorMounted(false)}>
          Unmount editor
        </button>
        <button type="button" onClick={() => setEditorMounted(true)}>
          Restore editor
        </button>
        {editorMounted && (
          <PCStudioPersonalSection
            personal={personal}
            settings={settings}
            onChange={vi.fn()}
            notifyFocus={vi.fn()}
            onExtraAdd={vi.fn()}
            onExtraChange={vi.fn()}
            onExtraRemove={vi.fn()}
            onSettingChange={vi.fn()}
            moreFieldsOpen={moreFieldsOpen}
            onMoreFieldsOpenChange={setMoreFieldsOpen}
          />
        )}
      </AIResumeEnhancementProvider>
    </I18nProvider>
  );
};

describe('PCStudioPersonalSection editor lifecycle', () => {
  it('keeps the expanded personal fields open when the editor subtree remounts', async () => {
    render(<FocusRecoveryHarness />);
    const details = screen.getByTestId<HTMLDetailsElement>('pc-personal-more');
    const summary = details.querySelector('summary');
    if (!summary) throw new Error('Personal details summary is missing.');

    fireEvent.click(summary);
    await waitFor(() => expect(details.open).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Unmount editor' }));
    expect(screen.queryByTestId('pc-personal-more')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Restore editor' }));
    expect(screen.getByTestId<HTMLDetailsElement>('pc-personal-more').open).toBe(true);
  });
});
