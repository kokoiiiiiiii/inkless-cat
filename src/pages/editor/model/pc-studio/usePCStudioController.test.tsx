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
  const moduleContainer = document.createElement('div');
  moduleContainer.dataset.module = 'personal';
  editorScrollContainer.append(moduleContainer);
  const field = document.createElement('textarea');
  field.dataset.studioFieldId = 'personal.summary';
  field.value = resume.personal.summary;
  moduleContainer.append(field);

  const editor = {
    resume,
    modulesPanelController: { notifyFocus: vi.fn() },
    editorScrollContainerRef: { current: editorScrollContainer },
  } as unknown as UseEditorPageControllerResult;

  return { editor, editorScrollContainer, moduleContainer, field };
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

  it('preserves the return snapshot when the remounted field focus event reports its fresh range', () => {
    const { editor, editorScrollContainer, moduleContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });
    const notifySummaryFocus = () =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary');

    field.addEventListener('focus', notifySummaryFocus);

    act(() => field.focus());
    field.setSelectionRange(3, 18, 'backward');
    editorScrollContainer.scrollTop = 135;
    editorScrollContainer.scrollLeft = 12;

    act(() => result.current.enterPreviewFocus());
    expect(result.current.previewFocus).toBe(true);
    expect(result.current.aiOpen).toBe(false);
    expect(result.current.selectionRange).toEqual({
      start: 3,
      end: 18,
      direction: 'backward',
    });

    field.remove();
    const restoredField = document.createElement('textarea');
    restoredField.dataset.studioFieldId = 'personal.summary';
    restoredField.value = editor.resume.personal.summary ?? '';
    restoredField.addEventListener('focus', notifySummaryFocus);
    moduleContainer.append(restoredField);
    editorScrollContainer.scrollTop = 0;
    editorScrollContainer.scrollLeft = 0;

    act(() => result.current.exitPreviewFocus());

    expect(result.current.previewFocus).toBe(false);
    expect(document.activeElement).toBe(restoredField);
    expect(restoredField.selectionStart).toBe(3);
    expect(restoredField.selectionEnd).toBe(18);
    expect(restoredField.selectionDirection).toBe('backward');
    expect(result.current.selectionRange).toEqual({
      start: 3,
      end: 18,
      direction: 'backward',
    });
    expect(editorScrollContainer.scrollTop).toBe(135);
    expect(editorScrollContainer.scrollLeft).toBe(12);
  });

  it('does not restore a saved selection into a same-id field from another module', () => {
    const { editor, editorScrollContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });
    const notifySummaryFocus = () =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary');

    field.addEventListener('focus', notifySummaryFocus);
    act(() => field.focus());
    field.setSelectionRange(3, 18, 'backward');
    editorScrollContainer.scrollTop = 48;
    editorScrollContainer.scrollLeft = 9;
    act(() => result.current.enterPreviewFocus());
    field.remove();

    const otherModule = document.createElement('div');
    otherModule.dataset.module = 'experience';
    const otherField = document.createElement('textarea');
    otherField.dataset.studioFieldId = 'personal.summary';
    otherField.value = editor.resume.personal.summary ?? '';
    otherField.addEventListener('focus', notifySummaryFocus);
    otherModule.append(otherField);
    editorScrollContainer.append(otherModule);
    editorScrollContainer.scrollTop = 0;
    editorScrollContainer.scrollLeft = 0;

    act(() => result.current.exitPreviewFocus());

    expect(document.activeElement).not.toBe(otherField);
    expect(editorScrollContainer.scrollTop).toBe(48);
    expect(editorScrollContainer.scrollLeft).toBe(9);
  });

  it('restores the scroll position without focusing a field that no longer exists', () => {
    const { editor, editorScrollContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });
    const notifySummaryFocus = () =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary');

    field.addEventListener('focus', notifySummaryFocus);
    act(() => field.focus());
    field.setSelectionRange(3, 18, 'backward');
    editorScrollContainer.scrollTop = 72;
    editorScrollContainer.scrollLeft = 14;
    act(() => result.current.enterPreviewFocus());
    field.remove();
    editorScrollContainer.scrollTop = 0;
    editorScrollContainer.scrollLeft = 0;

    act(() => result.current.exitPreviewFocus());

    expect(document.activeElement).toBe(document.body);
    expect(editorScrollContainer.scrollTop).toBe(72);
    expect(editorScrollContainer.scrollLeft).toBe(14);
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

  it('does not restore a preview snapshot after the workspace generation changes', () => {
    const { editor, editorScrollContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });
    const originalGeneration = useResumeStore.getState().workspaceGeneration;

    field.focus();
    field.setSelectionRange(3, 18, 'backward');
    editorScrollContainer.scrollTop = 64;
    act(() => result.current.enterPreviewFocus());
    field.remove();
    editorScrollContainer.scrollTop = 0;

    act(() => useResumeStore.getState().resetState(createEmptyResume()));
    expect(useResumeStore.getState().workspaceGeneration).toBe(originalGeneration + 1);
    act(() => result.current.exitPreviewFocus());

    expect(document.activeElement).not.toBe(field);
    expect(editorScrollContainer.scrollTop).toBe(0);
  });

  it('captures editor position before compact preview hides the editor', () => {
    const { editor, editorScrollContainer, moduleContainer, field } = createEditor();
    const { result } = renderHook(() => usePCStudioController(editor), { wrapper });
    const notifySummaryFocus = () =>
      result.current.modulesController.notifyFocus('summary', 'summary', 'personal.summary');

    field.addEventListener('focus', notifySummaryFocus);
    act(() => field.focus());
    field.setSelectionRange(1, 7, 'backward');
    editorScrollContainer.scrollTop = 92;
    editorScrollContainer.scrollLeft = 5;

    act(() => result.current.enterCompactPreview());
    expect(result.current.compactMode).toBe('preview');

    field.remove();
    const restoredField = document.createElement('textarea');
    restoredField.dataset.studioFieldId = 'personal.summary';
    restoredField.value = editor.resume.personal.summary ?? '';
    restoredField.addEventListener('focus', notifySummaryFocus);
    moduleContainer.append(restoredField);
    editorScrollContainer.scrollTop = 0;
    editorScrollContainer.scrollLeft = 0;

    act(() => result.current.setCompactMode('edit'));

    expect(document.activeElement).toBe(restoredField);
    expect(restoredField.selectionStart).toBe(1);
    expect(restoredField.selectionEnd).toBe(7);
    expect(restoredField.selectionDirection).toBe('backward');
    expect(editorScrollContainer.scrollTop).toBe(92);
    expect(editorScrollContainer.scrollLeft).toBe(5);
  });
});
