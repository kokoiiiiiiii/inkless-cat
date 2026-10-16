import { createEmptyResume, useResumeStore } from '@entities/resume';
import type { PreparedImport } from '@features/import-resume';
import { I18nProvider } from '@shared/i18n';
import type { AppError } from '@shared/lib/errors';
import { err, ok, type Result } from '@shared/lib/result';
import { FeedbackProvider, useFeedbackStore } from '@shared/ui/feedback';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEditorIoActions } from './useEditorIoActions';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <FeedbackProvider>{children}</FeedbackProvider>
  </I18nProvider>
);

const successfulExport: Result<void, AppError> = { ok: true, value: undefined };

const createOptions = () => {
  const prepared = {
    kind: 'resume' as const,
    resume: createEmptyResume(),
    activeSections: [],
  };
  return {
    resetState: vi.fn(),
    prepareImportFromJson: vi.fn((): Result<PreparedImport, AppError> => ok(prepared)),
    commitPreparedImport: vi.fn(() => ok({ kind: 'resume' as const })),
    exportJson: vi.fn(() => successfulExport),
    exportWorkspaceJson: vi.fn(() => successfulExport),
    exportMarkdown: vi.fn(() => successfulExport),
    isLargeScreen: true,
    setMobileView: vi.fn(),
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionStorage.removeItem('inkless-cat/pending-destructive-undo');
  act(() => {
    useFeedbackStore.getState().clearFeedback();
    useResumeStore.setState({
      resume: createEmptyResume(),
      activeSections: [],
      hasResumeChanges: false,
    });
  });
});

describe('editor destructive actions', () => {
  it('does not clear the resume when confirmation is cancelled', () => {
    const options = createOptions();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());

    expect(options.resetState).not.toHaveBeenCalled();
  });

  it('clears only after the user confirms', () => {
    const options = createOptions();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());

    expect(options.resetState).toHaveBeenCalledWith(
      expect.objectContaining({ personal: expect.any(Object) }),
    );
  });

  it('restores the previous resume when the user selects Undo', () => {
    vi.useFakeTimers();
    const previousResume = createEmptyResume();
    previousResume.personal.fullName = 'Before clear';
    useResumeStore.setState({
      resume: previousResume,
      activeSections: [],
      hasResumeChanges: true,
    });
    const options = createOptions();
    options.resetState.mockImplementation((nextResume) => {
      useResumeStore.getState().resetState(nextResume);
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());

    const undoAction = useFeedbackStore.getState().items.find((item) => item.action)?.action;
    expect(undoAction).toBeDefined();
    expect(useResumeStore.getState().resume.personal.fullName).toBe('');

    act(() => undoAction?.onClick());

    expect(useResumeStore.getState().resume).toBe(previousResume);
    expect(useResumeStore.getState().activeSections).toEqual([]);
    expect(useResumeStore.getState().hasResumeChanges).toBe(true);
  });

  it('does not undo over edits made after the destructive action', () => {
    vi.useFakeTimers();
    const options = createOptions();
    options.resetState.mockImplementation((nextResume) => {
      useResumeStore.getState().resetState(nextResume);
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());
    act(() => {
      useResumeStore.getState().updateResume((draft) => {
        draft.personal.fullName = 'Newer edit';
      });
    });

    const undoAction = useFeedbackStore.getState().items.find((item) => item.action)?.action;
    act(() => undoAction?.onClick());

    expect(useResumeStore.getState().resume.personal.fullName).toBe('Newer edit');
    expect(sessionStorage.getItem('inkless-cat/pending-destructive-undo')).toBeNull();
  });

  it('expires both the undo feedback and its temporary session recovery copy', async () => {
    vi.useFakeTimers();
    const options = createOptions();
    options.resetState.mockImplementation((nextResume) => {
      useResumeStore.getState().resetState(nextResume);
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());
    expect(sessionStorage.getItem('inkless-cat/pending-destructive-undo')).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_001);
    });

    expect(sessionStorage.getItem('inkless-cat/pending-destructive-undo')).toBeNull();
    expect(useFeedbackStore.getState().items.some((item) => item.action)).toBe(false);
  });

  it('replaces the previous recovery snapshot after another confirmed operation', () => {
    vi.useFakeTimers();
    const previousResume = createEmptyResume();
    previousResume.personal.fullName = 'Before both clears';
    useResumeStore.setState({ resume: previousResume, activeSections: [], hasResumeChanges: true });
    const options = createOptions();
    options.resetState.mockImplementation((nextResume) => {
      useResumeStore.getState().resetState(nextResume);
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());
    act(() => result.current.handleClear());

    expect(useFeedbackStore.getState().items.filter((item) => item.action)).toHaveLength(1);
    const latestUndo = useFeedbackStore
      .getState()
      .items.findLast((item) => Boolean(item.action))?.action;
    act(() => latestUndo?.onClick());

    expect(useResumeStore.getState().resume.personal.fullName).toBe('');
    expect(sessionStorage.getItem('inkless-cat/pending-destructive-undo')).toBeNull();
  });

  it('warns that reload recovery is unavailable when session storage rejects the snapshot', () => {
    const options = createOptions();
    options.resetState.mockImplementation((nextResume) => {
      useResumeStore.getState().resetState(nextResume);
    });
    vi.stubGlobal('sessionStorage', null);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleClear());

    expect(useResumeStore.getState().resume.personal.fullName).toBe('');
    expect(useFeedbackStore.getState().items.at(-1)?.message).toContain('刷新页面后将无法撤销');
  });

  it('validates an import before asking for confirmation and commits only after acceptance', () => {
    const options = createOptions();
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleImport('{"personal":{}}'));

    expect(options.prepareImportFromJson).toHaveBeenCalledWith('{"personal":{}}');
    expect(confirm).toHaveBeenCalledOnce();
    expect(options.commitPreparedImport).not.toHaveBeenCalled();
  });

  it('does not ask for confirmation when import validation fails', () => {
    const options = createOptions();
    options.prepareImportFromJson.mockReturnValue(
      err({
        code: 'INVALID_JSON',
        message: 'Invalid JSON',
      }),
    );
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    const { result } = renderHook(() => useEditorIoActions(options), { wrapper });

    act(() => result.current.handleImport('{'));

    expect(confirm).not.toHaveBeenCalled();
    expect(options.commitPreparedImport).not.toHaveBeenCalled();
  });
});
