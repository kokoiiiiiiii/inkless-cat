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

describe('AIResumeEnhancementRuntime', () => {
  beforeEach(() => {
    const resume = createEmptyResume();
    resume.personal.summary = originalSummary;
    useResumeStore.getState().resetState(resume);
    useResumeStore.getState().setHasResumeChanges(false);
  });

  afterEach(() => cleanup());

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
});
