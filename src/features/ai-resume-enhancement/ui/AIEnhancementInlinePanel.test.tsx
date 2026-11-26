import { createEmptyResume, useResumeStore } from '@entities/resume';
import { I18nProvider } from '@shared/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIResumeEnhancementContext } from '../model/AIResumeEnhancementContext';
import type { AIEnhancementSession } from '../model/types';
import type { AIResumeEnhancementController } from '../model/useAIResumeEnhancement';
import AIEnhancementInlinePanel from './AIEnhancementInlinePanel';

const original = 'Turns customer needs into clear product direction.';
const candidate = 'Turns customer needs into focused product strategy.';
const target = { kind: 'personal-summary' } as const;

const createSession = (
  status: AIEnhancementSession['status'],
  overrides: Partial<AIEnhancementSession> = {},
): AIEnhancementSession => ({
  id: 1,
  target,
  original,
  originalText: original,
  workspaceGeneration: useResumeStore.getState().workspaceGeneration,
  sourceRevision: 12,
  selectionRange: { start: 8, end: 21, direction: 'forward' },
  presentation: 'inline',
  mode: 'professional',
  status,
  preview: status === 'streaming' ? 'Turns customer needs' : '',
  candidate: status === 'suggested' ? candidate : '',
  ...overrides,
});

const createController = (
  session: AIEnhancementSession | null = null,
  isConfigured = true,
): AIResumeEnhancementController => ({
  session,
  isConfigured,
  connectionStatus: isConfigured ? 'ready' : 'not_configured',
  openerRef: { current: null },
  open: vi.fn(),
  close: vi.fn(),
  reject: vi.fn(),
  setMode: vi.fn(),
  setCandidate: vi.fn(),
  generate: vi.fn(async () => {}),
  cancelGeneration: vi.fn(),
  apply: vi.fn(() => false),
});

const makeProps = (
  overrides: Partial<React.ComponentProps<typeof AIEnhancementInlinePanel>> = {},
): React.ComponentProps<typeof AIEnhancementInlinePanel> => ({
  target,
  fieldLabel: '个人简介',
  sourceValue: original,
  sourceRevision: 12,
  workspaceGeneration: useResumeStore.getState().workspaceGeneration,
  selectionRange: { start: 8, end: 21, direction: 'forward' },
  onAccept: vi.fn().mockReturnValue(true),
  onReject: vi.fn(),
  onDone: vi.fn(),
  onConfigureProvider: vi.fn(),
  ...overrides,
});

const renderPanel = (controller: AIResumeEnhancementController, props = makeProps()) =>
  render(
    <I18nProvider>
      <AIResumeEnhancementContext.Provider value={controller}>
        <AIEnhancementInlinePanel {...props} />
      </AIResumeEnhancementContext.Provider>
    </I18nProvider>,
  );

beforeEach(() => {
  const resume = createEmptyResume();
  resume.personal.summary = original;
  useResumeStore.getState().resetState(resume);
  useResumeStore.getState().setHasResumeChanges(false);
});

afterEach(() => cleanup());

describe('AIEnhancementInlinePanel', () => {
  it('shows contextual source metadata and starts the existing controller workflow', () => {
    const controller = createController();
    renderPanel(controller);

    const panel = screen.getByTestId('pc-ai-inline-panel');
    expect(panel.dataset.aiState).toBe('IDLE');
    expect(panel.dataset.sourceRevision).toBe('12');
    expect(panel.dataset.workspaceGeneration).toBe(
      String(useResumeStore.getState().workspaceGeneration),
    );
    expect(panel.dataset.selectionStart).toBe('8');
    expect(panel.dataset.selectionEnd).toBe('21');
    expect(screen.getByTestId('pc-ai-inline-source').textContent).toContain(original);

    fireEvent.click(screen.getByTestId('pc-ai-inline-generate'));

    expect(controller.open).toHaveBeenCalledWith(target, expect.any(HTMLButtonElement), {
      presentation: 'inline',
      sourceRevision: 12,
      selectionRange: { start: 8, end: 21, direction: 'forward' },
    });
    expect(controller.generate).toHaveBeenCalledWith('zh-CN');
    expect(panel.dataset.requestSourceRevision).toBe('12');
    expect(useResumeStore.getState().resume.personal.summary).toBe(original);
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('shows streaming progress and lets the user cancel generation without applying data', () => {
    const controller = createController(createSession('streaming'));
    renderPanel(controller);

    expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('GENERATING');
    expect(screen.getByTestId('pc-ai-inline-stream').textContent).toContain('Turns customer needs');
    fireEvent.click(screen.getByRole('button', { name: '取消生成' }));

    expect(controller.cancelGeneration).toHaveBeenCalledOnce();
    expect(controller.apply).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resume.personal.summary).toBe(original);
  });

  it('delegates Accept to the official callback and never applies through the AI panel controller', () => {
    const session = createSession('suggested');
    const controller = createController(session);
    const onAccept = vi.fn().mockReturnValue(true);
    renderPanel(controller, makeProps({ onAccept }));

    fireEvent.click(screen.getByTestId('pc-ai-inline-apply'));

    expect(onAccept).toHaveBeenCalledWith(session);
    expect(screen.getByRole('textbox', { name: 'AI 建议（可手动修改）' })).toHaveProperty(
      'value',
      candidate,
    );
    expect(controller.apply).not.toHaveBeenCalled();
    expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('ACCEPTED');
    expect(screen.getByTestId('pc-ai-inline-accepted').textContent).toContain(candidate);
    expect(useResumeStore.getState().resume.personal.summary).toBe(original);
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('keeps Reject on the parent callback and leaves the canonical resume untouched', () => {
    const controller = createController(createSession('suggested'));
    const onReject = vi.fn();
    const onDone = vi.fn();
    renderPanel(controller, makeProps({ onReject, onDone }));

    fireEvent.click(screen.getByTestId('pc-ai-inline-reject'));

    expect(onReject).toHaveBeenCalledOnce();
    expect(controller.apply).not.toHaveBeenCalled();
    expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('REJECTED');
    fireEvent.click(screen.getByTestId('pc-ai-inline-done'));
    expect(onDone).toHaveBeenCalledOnce();
    expect(useResumeStore.getState().resume.personal.summary).toBe(original);
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('blocks Accept when the source or workspace became stale', () => {
    const controller = createController(createSession('suggested'));
    const onAccept = vi.fn().mockReturnValue(true);
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'A newer source value.';
    });
    useResumeStore.getState().setHasResumeChanges(false);
    renderPanel(controller, makeProps({ onAccept }));

    expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('STALE');
    expect(screen.getByTestId<HTMLButtonElement>('pc-ai-inline-apply').disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBeTruthy();
    fireEvent.click(screen.getByTestId('pc-ai-inline-apply'));

    expect(onAccept).not.toHaveBeenCalled();
    expect(controller.apply).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resume.personal.summary).toBe('A newer source value.');
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('keeps Apply visible but disabled when the controller marks a suggestion stale', () => {
    const staleCandidate = 'A stale suggestion must not replace the latest source.';
    const controller = createController(
      createSession('error', { errorCode: 'source_changed', candidate: staleCandidate }),
    );
    const onAccept = vi.fn().mockReturnValue(true);
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'A newer source value.';
    });
    useResumeStore.getState().setHasResumeChanges(false);
    renderPanel(controller, makeProps({ onAccept }));

    expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('STALE');
    expect(screen.queryByTestId('pc-ai-inline-candidate')).toBeNull();
    expect(screen.getByTestId<HTMLButtonElement>('pc-ai-inline-apply').disabled).toBe(true);
    fireEvent.click(screen.getByTestId('pc-ai-inline-apply'));

    expect(onAccept).not.toHaveBeenCalled();
    expect(controller.apply).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resume.personal.summary).toBe('A newer source value.');
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('regenerates a stale suggestion through the existing controller without reopening a session', () => {
    const controller = createController(createSession('suggested'));
    useResumeStore.getState().updateResume((draft) => {
      draft.personal.summary = 'A newer source value.';
    });
    useResumeStore.getState().setHasResumeChanges(false);
    renderPanel(controller);

    fireEvent.click(screen.getByTestId('pc-ai-inline-generate'));

    expect(controller.open).not.toHaveBeenCalled();
    expect(controller.generate).toHaveBeenCalledWith('zh-CN');
    expect(useResumeStore.getState().resume.personal.summary).toBe('A newer source value.');
    expect(useResumeStore.getState().hasResumeChanges).toBe(false);
  });

  it('shows provider failure and offers Retry through the same controller', () => {
    const controller = createController(
      createSession('error', { errorCode: 'provider_error', providerErrorCode: undefined }),
    );
    renderPanel(controller);

    expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('FAILED');
    expect(screen.getByRole('alert').textContent).toBeTruthy();
    fireEvent.click(screen.getByTestId('pc-ai-inline-generate'));

    expect(controller.open).not.toHaveBeenCalled();
    expect(controller.generate).toHaveBeenCalledOnce();
    expect(useResumeStore.getState().resume.personal.summary).toBe(original);
  });

  it('asks the host to configure an unavailable provider', () => {
    const controller = createController(null, false);
    const onConfigureProvider = vi.fn();
    renderPanel(controller, makeProps({ onConfigureProvider }));

    fireEvent.click(screen.getByRole('button', { name: '配置 AI 服务' }));
    expect(onConfigureProvider).toHaveBeenCalledOnce();
    expect(controller.generate).not.toHaveBeenCalled();
  });
});
