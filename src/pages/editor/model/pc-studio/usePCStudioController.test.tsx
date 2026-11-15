import { createEmptyResume, useResumeStore } from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseEditorPageControllerResult } from '../useEditorPageController';
import { usePCStudioController } from './usePCStudioController';

const createEditor = () => {
  const resume = createEmptyResume();
  resume.personal.summary = 'A focused professional summary.';
  const editorScrollContainer = document.createElement('div');
  editorScrollContainer.dataset.testid = 'editor-scroll';
  Object.defineProperty(editorScrollContainer, 'scrollTop', {
    configurable: true,
    writable: true,
    value: 0,
  });
  Object.defineProperty(editorScrollContainer, 'scrollLeft', {
    configurable: true,
    writable: true,
    value: 0,
  });
  document.body.append(editorScrollContainer);
  const field = document.createElement('textarea');
  field.dataset.studioFieldId = 'personal.summary';
  field.value = resume.personal.summary;
  editorScrollContainer.append(field);

  const editor = {
    resume,
    modulesPanelController: { notifyFocus: vi.fn() },
    editorScrollContainerRef: { current: editorScrollContainer },
  } as unknown as UseEditorPageControllerResult;

  return { editor, editorScrollContainer, field };
};

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('usePCStudioController Focus Preview', () => {
  beforeEach(() => {
    useResumeStore.getState().resetState(createEmptyResume());
    useResumeStore.getState().setHasResumeChanges(false);
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
  });

  it('restores the editor field, selection, and scroll position after leaving Focus Preview', () => {
    const { editor, editorScrollContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });

    field.focus();
    field.setSelectionRange(4, 14, 'backward');
    act(() =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary'),
    );
    editorScrollContainer.scrollTop = 135;
    editorScrollContainer.scrollLeft = 12;

    expect(result.current.selectionRange).toEqual({
      start: 4,
      end: 14,
      direction: 'backward',
    });

    act(() => result.current.enterPreviewFocus());
    expect(result.current.previewFocus).toBe(true);
    expect(result.current.aiOpen).toBe(false);

    field.remove();
    const restoredField = document.createElement('textarea');
    restoredField.dataset.studioFieldId = 'personal.summary';
    restoredField.value = editor.resume.personal.summary ?? '';
    editorScrollContainer.append(restoredField);
    editorScrollContainer.scrollTop = 0;
    editorScrollContainer.scrollLeft = 0;

    act(() => result.current.exitPreviewFocus());

    expect(result.current.previewFocus).toBe(false);
    expect(document.activeElement).toBe(restoredField);
    expect(restoredField.selectionStart).toBe(4);
    expect(restoredField.selectionEnd).toBe(14);
    expect(restoredField.selectionDirection).toBe('backward');
    expect(editorScrollContainer.scrollTop).toBe(135);
    expect(editorScrollContainer.scrollLeft).toBe(12);
  });

  it('returns from Focus Preview with Escape and keeps the active field context', () => {
    const { editor, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });

    field.focus();
    act(() =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary'),
    );
    act(() => result.current.openAI());
    expect(result.current.aiOpen).toBe(true);
    expect(result.current.fieldContext?.fieldId).toBe('personal.summary');

    act(() => result.current.enterPreviewFocus());
    expect(result.current.aiOpen).toBe(false);
    expect(result.current.fieldContext?.fieldId).toBe('personal.summary');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(result.current.previewFocus).toBe(false);
    expect(result.current.compactMode).toBe('edit');
    expect(result.current.fieldContext?.fieldId).toBe('personal.summary');
  });

  it('captures editor position before compact preview hides the editor', () => {
    const { editor, editorScrollContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });

    field.focus();
    field.setSelectionRange(1, 7, 'forward');
    act(() =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary'),
    );
    editorScrollContainer.scrollTop = 92;
    editorScrollContainer.scrollLeft = 5;

    act(() => result.current.enterCompactPreview());
    expect(result.current.compactMode).toBe('preview');

    field.remove();
    const restoredField = document.createElement('textarea');
    restoredField.dataset.studioFieldId = 'personal.summary';
    restoredField.value = editor.resume.personal.summary ?? '';
    editorScrollContainer.append(restoredField);
    editorScrollContainer.scrollTop = 0;
    editorScrollContainer.scrollLeft = 0;

    act(() => result.current.setCompactMode('edit'));

    expect(document.activeElement).toBe(restoredField);
    expect(restoredField.selectionStart).toBe(1);
    expect(restoredField.selectionEnd).toBe(7);
    expect(editorScrollContainer.scrollTop).toBe(92);
    expect(editorScrollContainer.scrollLeft).toBe(5);
  });
});
