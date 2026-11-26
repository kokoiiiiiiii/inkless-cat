import { createEmptyResume } from '@entities/resume';
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

const FocusRecoveryHarness = () => {
  const [moreFieldsOpen, setMoreFieldsOpen] = useState(false);
  const [editorMounted, setEditorMounted] = useState(true);

  return (
    <I18nProvider>
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
    </I18nProvider>
  );
};

describe('PCStudioPersonalSection editor lifecycle', () => {
  it('keeps the expanded personal fields open when the editor subtree remounts', async () => {
    render(<FocusRecoveryHarness />);
    const details = screen.getByTestId('pc-personal-more') as HTMLDetailsElement;
    const summary = details.querySelector('summary');
    expect(summary).not.toBeNull();

    fireEvent.click(summary!);
    await waitFor(() => expect(details.open).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Unmount editor' }));
    expect(screen.queryByTestId('pc-personal-more')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Restore editor' }));
    expect((screen.getByTestId('pc-personal-more') as HTMLDetailsElement).open).toBe(true);
  });
});
