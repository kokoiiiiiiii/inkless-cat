import { createEmptyResume, useResumeStore } from '@entities/resume';
import type { ChatMessage, ProviderConfig, StreamCompleteOptions } from '@shared/api/ai';
import { I18nProvider } from '@shared/i18n';
import { FeedbackProvider } from '@shared/ui/feedback';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIEnhancementProviderClient } from '../model/useAIResumeEnhancement';
import AIResumeEnhancementRuntime from './AIResumeEnhancementRuntime';

const originalSummary = 'Builds backend APIs';
const suggestion = 'Builds and maintains backend APIs.';
const configuration: Readonly<ProviderConfig> = {
  baseUrl: 'https://provider.example/v1',
  model: 'test-model',
};

let inlinePortalMount: HTMLDivElement | null = null;

describe('AIResumeEnhancementRuntime', () => {
  beforeEach(() => {
    const resume = createEmptyResume();
    resume.personal.summary = originalSummary;
    useResumeStore.getState().resetState(resume);
    useResumeStore.getState().setHasResumeChanges(false);
  });

  afterEach(() => {
    cleanup();
    inlinePortalMount?.remove();
    inlinePortalMount = null;
  });

  it('opens and generates after the initial StrictMode effect replay', async () => {
    const streamComplete = vi.fn((_messages: ChatMessage[], options: StreamCompleteOptions) => {
      options.onDelta(suggestion);
      return Promise.resolve({ content: suggestion });
    });
    const provider: AIEnhancementProviderClient = {
      configuration,
      isConfigured: true,
      connectionStatus: 'ready',
      complete: vi.fn().mockResolvedValue({ content: '' }),
      streamComplete,
    };
    const opener = document.createElement('button');

    render(
      <StrictMode>
        <I18nProvider>
          <FeedbackProvider>
            <AIResumeEnhancementRuntime
              provider={provider}
              request={{ id: 1, target: { kind: 'personal-summary' }, opener }}
            />
          </FeedbackProvider>
        </I18nProvider>
      </StrictMode>,
    );

    const generateButton = await screen.findByRole('button', { name: 'AI 润色' });
    fireEvent.click(generateButton);

    await waitFor(() => expect(streamComplete).toHaveBeenCalledOnce());
    const suggestionField = await screen.findByLabelText('AI 建议（可手动修改）');
    expect((suggestionField as HTMLTextAreaElement).value).toBe(suggestion);
    expect(useResumeStore.getState().resume.personal.summary).toBe(originalSummary);
  });

  it('renders Inline AI through the same stream controller and keeps Accept in the official workflow', async () => {
    const streamComplete = vi.fn((_messages: ChatMessage[], options: StreamCompleteOptions) => {
      options.onDelta(suggestion);
      return Promise.resolve({ content: suggestion });
    });
    const provider: AIEnhancementProviderClient = {
      configuration,
      isConfigured: true,
      connectionStatus: 'ready',
      complete: vi.fn().mockResolvedValue({ content: '' }),
      streamComplete,
    };
    const opener = document.createElement('button');
    inlinePortalMount = document.createElement('div');
    document.body.append(inlinePortalMount);

    render(
      <I18nProvider>
        <FeedbackProvider>
          <AIResumeEnhancementRuntime
            provider={provider}
            request={{
              id: 2,
              target: { kind: 'personal-summary' },
              opener,
              presentation: 'inline',
              mountNode: inlinePortalMount,
              fieldLabel: '个人简介',
              sourceValue: originalSummary,
              sourceRevision: useResumeStore.getState().workspaceRevision,
              workspaceGeneration: useResumeStore.getState().workspaceGeneration,
              selectionRange: { start: 2, end: 10, direction: 'forward' },
            }}
          />
        </FeedbackProvider>
      </I18nProvider>,
    );

    const panel = await screen.findByTestId('pc-ai-inline-panel');
    expect(panel.dataset.aiState).toBe('IDLE');
    expect(panel.dataset.selectionStart).toBe('2');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('pc-ai-inline-generate'));
    await waitFor(() => expect(streamComplete).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('SUGGESTION_READY'),
    );
    expect(useResumeStore.getState().resume.personal.summary).toBe(originalSummary);

    fireEvent.click(screen.getByTestId('pc-ai-inline-apply'));

    await waitFor(() =>
      expect(screen.getByTestId('pc-ai-inline-panel').dataset.aiState).toBe('ACCEPTED'),
    );
    expect(useResumeStore.getState().resume.personal.summary).toBe(suggestion);
    expect(useResumeStore.getState().hasResumeChanges).toBe(true);

    fireEvent.click(screen.getByTestId('pc-ai-inline-done'));
    await waitFor(() => expect(screen.queryByTestId('pc-ai-inline-panel')).toBeNull());
    expect(useResumeStore.getState().resume.personal.summary).toBe(suggestion);
  });
});
