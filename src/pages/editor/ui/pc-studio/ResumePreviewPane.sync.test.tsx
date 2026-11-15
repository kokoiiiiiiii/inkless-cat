import { createEmptyResume, useResumeStore } from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import ResumePreviewPane from './ResumePreviewPane';

const registerSectionRef = () => {};

const CanonicalPreviewHarness = () => {
  const resume = useResumeStore((state) => state.resume);
  const activeSections = useResumeStore((state) => state.activeSections);
  return (
    <ResumePreviewPane
      visible
      resume={resume}
      activeSections={activeSections}
      registerSectionRef={registerSectionRef}
    />
  );
};

describe('ResumePreviewPane canonical synchronization', () => {
  beforeEach(() => {
    const resume = createEmptyResume();
    resume.personal.fullName = 'Riley Example';
    resume.personal.summary = 'Original canonical summary.';
    useResumeStore.getState().resetState(resume);
    useResumeStore.getState().setHasResumeChanges(false);
  });

  afterEach(() => cleanup());

  it('renders the official ResumePreview from the canonical resume and updates after Store changes', () => {
    render(
      <I18nProvider>
        <CanonicalPreviewHarness />
      </I18nProvider>,
    );

    expect(screen.getByText('Riley Example')).toBeTruthy();
    expect(screen.getByText('Original canonical summary.')).toBeTruthy();

    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.personal.summary = 'Updated from the canonical controller path.';
      });
    });

    expect(screen.queryByText('Original canonical summary.')).toBeNull();
    expect(screen.getByText('Updated from the canonical controller path.')).toBeTruthy();
    expect(screen.getByTestId('pc-preview-paper')).toBeTruthy();
  });
});
