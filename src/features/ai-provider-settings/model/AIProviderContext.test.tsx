import { createDefaultWorkspace } from '@entities/workspace';
import { workspaceToJson } from '@features/export-resume';
import type { ChatCompletionAdapter } from '@shared/api/ai';
import { ProviderError } from '@shared/api/ai';
import { I18nProvider, useI18n } from '@shared/i18n';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AIProviderProvider } from './AIProviderContext';
import { useAIProviderClient } from './useAIProviderClient';
import { useAIProviderSettings } from './useAIProviderSettings';

const API_KEY = 'runtime-secret-test-only';
const SAVED_BASE_URL = 'https://provider.example/v1';
const SAVED_MODEL = 'saved-model';

const SettingsConsumer = () => {
  const settings = useAIProviderSettings();
  return (
    <section>
      <input
        aria-label="Base URL"
        value={settings.form.baseUrl}
        onChange={(event) => settings.updateField('baseUrl', event.currentTarget.value)}
      />
      <input
        aria-label="API Key"
        value={settings.form.apiKey}
        onChange={(event) => settings.updateField('apiKey', event.currentTarget.value)}
      />
      <input
        aria-label="Model"
        value={settings.form.model}
        onChange={(event) => settings.updateField('model', event.currentTarget.value)}
      />
      <button type="button" onClick={() => settings.saveForSession()}>
        Save settings
      </button>
      <button type="button" onClick={() => void settings.testConnection()}>
        Test connection
      </button>
      <button type="button" onClick={settings.cancelTest}>
        Cancel connection test
      </button>
      <button type="button" onClick={settings.clear}>
        Clear settings
      </button>
      <output data-testid="settings-state">
        {JSON.stringify({
          isSaved: settings.isSaved,
          canSave: settings.canSave,
          canTest: settings.canTest,
          connectionStatus: settings.connectionStatus,
          validationErrorCode: settings.validationErrorCode,
          testState: settings.testState,
        })}
      </output>
    </section>
  );
};

const FeatureConsumer = () => {
  const provider = useAIProviderClient();
  const [result, setResult] = useState('');
  return (
    <section>
      <output data-testid="client-state">
        {JSON.stringify({
          configuration: provider.configuration,
          isConfigured: provider.isConfigured,
          connectionStatus: provider.connectionStatus,
        })}
      </output>
      <button
        type="button"
        onClick={() =>
          void provider
            .complete([{ role: 'user', content: 'Create a concise summary.' }])
            .then((value) => setResult(value.content))
            .catch((error: unknown) =>
              setResult(error instanceof ProviderError ? error.code : 'unexpected_error'),
            )
        }
      >
        Use saved provider
      </button>
      <output data-testid="feature-result">{result}</output>
      <output data-testid="workspace-export">{workspaceToJson(createDefaultWorkspace())}</output>
    </section>
  );
};

const PassiveFeatureCall = () => {
  const provider = useAIProviderClient();
  return (
    <button
      type="button"
      onClick={() =>
        void provider.complete([{ role: 'user', content: 'Summarize.' }]).catch(() => {})
      }
    >
      Start business request
    </button>
  );
};

const fillAndSave = () => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Base URL' }), {
    target: { value: SAVED_BASE_URL },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'API Key' }), {
    target: { value: API_KEY },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Model' }), {
    target: { value: SAVED_MODEL },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
};

const makeAdapter = (
  complete: ChatCompletionAdapter['complete'] = vi.fn().mockResolvedValue({ content: 'Done' }),
): ChatCompletionAdapter => ({ complete });

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('AI provider session context', () => {
  it('shares one saved configuration across the settings and business consumers', async () => {
    const complete = vi.fn().mockResolvedValue({ content: 'Done' });
    render(
      <AIProviderProvider client={makeAdapter(complete)}>
        <SettingsConsumer />
        <FeatureConsumer />
      </AIProviderProvider>,
    );

    fillAndSave();

    expect(screen.getByTestId('client-state').textContent).toBe(
      JSON.stringify({
        configuration: { baseUrl: SAVED_BASE_URL, model: SAVED_MODEL },
        isConfigured: true,
        connectionStatus: 'ready',
      }),
    );
    expect(screen.getByTestId('client-state').textContent).not.toContain(API_KEY);

    fireEvent.click(screen.getByRole('button', { name: 'Use saved provider' }));
    await waitFor(() => expect(screen.getByTestId('feature-result').textContent).toBe('Done'));

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      { baseUrl: SAVED_BASE_URL, model: SAVED_MODEL },
      { apiKey: API_KEY },
      [{ role: 'user', content: 'Create a concise summary.' }],
      { signal: expect.any(AbortSignal) },
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps unsaved edits out of business calls until they are explicitly saved', async () => {
    const complete = vi.fn().mockResolvedValue({ content: 'Done' });
    render(
      <AIProviderProvider client={makeAdapter(complete)}>
        <SettingsConsumer />
        <FeatureConsumer />
      </AIProviderProvider>,
    );

    fillAndSave();
    fireEvent.change(screen.getByRole('textbox', { name: 'Base URL' }), {
      target: { value: 'https://draft-provider.example/v1' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'API Key' }), {
      target: { value: 'unsaved-draft-key' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Model' }), {
      target: { value: 'draft-model' },
    });

    expect(screen.getByTestId('client-state').textContent).toContain(SAVED_BASE_URL);
    expect(screen.getByTestId('client-state').textContent).not.toContain('draft-provider');
    expect(screen.getByTestId('client-state').textContent).not.toContain('draft-model');
    expect(screen.getByTestId('client-state').textContent).not.toContain('unsaved-draft-key');

    fireEvent.click(screen.getByRole('button', { name: 'Use saved provider' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(complete.mock.calls[0]?.[0]).toEqual({
      baseUrl: SAVED_BASE_URL,
      model: SAVED_MODEL,
    });
    expect(complete.mock.calls[0]?.[1]).toEqual({ apiKey: API_KEY });

    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.getByTestId('client-state').textContent).toContain('draft-provider');
    expect(screen.getByTestId('client-state').textContent).toContain('draft-model');
    fireEvent.click(screen.getByRole('button', { name: 'Use saved provider' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    expect(complete.mock.calls[1]?.[0]).toEqual({
      baseUrl: 'https://draft-provider.example/v1',
      model: 'draft-model',
    });
    expect(complete.mock.calls[1]?.[1]).toEqual({ apiKey: 'unsaved-draft-key' });
  });

  it('invalidates an old connection result after edits and uses the newly saved configuration', async () => {
    const complete = vi.fn().mockResolvedValue({ content: 'OK' });
    render(
      <AIProviderProvider client={makeAdapter(complete)}>
        <SettingsConsumer />
        <FeatureConsumer />
      </AIProviderProvider>,
    );
    fillAndSave();

    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() =>
      expect(screen.getByTestId('settings-state').textContent).toContain('"status":"success"'),
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Model' }), {
      target: { value: 'new-model' },
    });
    expect(screen.getByTestId('settings-state').textContent).toContain('"isSaved":false');
    expect(screen.getByTestId('settings-state').textContent).toContain('"status":"idle"');
    expect(screen.getByTestId('settings-state').textContent).toContain(
      '"connectionStatus":"ready"',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use saved provider' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    expect(complete.mock.calls[1]?.[0]).toEqual({
      baseUrl: SAVED_BASE_URL,
      model: 'new-model',
    });
    expect(complete.mock.calls[1]?.[1]).toEqual({ apiKey: API_KEY });
  });

  it('does not let a stale in-flight connection result replace the new saved configuration result', async () => {
    let resolveFirst: ((value: { content: string }) => void) | undefined;
    let firstSignal: AbortSignal | undefined;
    const complete = vi
      .fn<ChatCompletionAdapter['complete']>()
      .mockImplementationOnce((_config, _credentials, _messages, options) => {
        firstSignal = options?.signal;
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockResolvedValueOnce({ content: 'OK' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AIProviderProvider client={makeAdapter(complete)}>{children}</AIProviderProvider>
    );
    const { result } = renderHook(() => useAIProviderSettings(), { wrapper });

    act(() => {
      result.current.updateField('baseUrl', SAVED_BASE_URL);
      result.current.updateField('apiKey', API_KEY);
      result.current.updateField('model', SAVED_MODEL);
      expect(result.current.saveForSession()).toBe(true);
    });

    let firstRequest: Promise<void> | undefined;
    act(() => {
      firstRequest = result.current.testConnection();
    });
    expect(firstSignal).toBeDefined();

    act(() => {
      result.current.updateField('model', 'new-model');
      expect(firstSignal?.aborted).toBe(true);
      expect(result.current.saveForSession()).toBe(true);
    });
    let secondRequest: Promise<void> | undefined;
    act(() => {
      secondRequest = result.current.testConnection();
    });
    await act(async () => secondRequest);
    expect(result.current.testState).toMatchObject({ status: 'success', model: 'new-model' });

    await act(async () => {
      resolveFirst?.({ content: 'stale result' });
      await firstRequest;
    });
    expect(result.current.testState).toMatchObject({ status: 'success', model: 'new-model' });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('cancels the connection test independently and clears in-flight business requests', async () => {
    const signals: AbortSignal[] = [];
    const complete = vi.fn(
      (_config, _credentials, _messages, options) =>
        new Promise<{ content: string }>((_resolve, reject) => {
          const signal = options?.signal;
          if (!signal) throw new Error('The provider must pass an AbortSignal.');
          signals.push(signal);
          signal.addEventListener('abort', () => reject(new ProviderError('cancelled')), {
            once: true,
          });
        }),
    );
    render(
      <AIProviderProvider client={makeAdapter(complete)}>
        <SettingsConsumer />
        <FeatureConsumer />
      </AIProviderProvider>,
    );
    fillAndSave();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use saved provider' }));

    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel connection test' }));
    await waitFor(() => expect(signals[0]?.aborted).toBe(true));
    expect(signals[1]?.aborted).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Clear settings' }));
    await waitFor(() => expect(signals[1]?.aborted).toBe(true));
    expect(screen.getByTestId('client-state').textContent).toContain('"isConfigured":false');
    expect(screen.getByTestId('client-state').textContent).not.toContain(API_KEY);
    await waitFor(() => expect(screen.getByTestId('feature-result').textContent).toBe('cancelled'));

    fireEvent.click(screen.getByRole('button', { name: 'Use saved provider' }));
    await waitFor(() =>
      expect(screen.getByTestId('feature-result').textContent).toBe('incomplete_config'),
    );
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('keeps API key validation feedback generic and blocks saving control characters', () => {
    const invalidApiKey = `${API_KEY}\n`;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AIProviderProvider>{children}</AIProviderProvider>
    );
    const { result } = renderHook(
      () => ({ settings: useAIProviderSettings(), provider: useAIProviderClient() }),
      { wrapper },
    );

    act(() => {
      result.current.settings.updateField('baseUrl', SAVED_BASE_URL);
      result.current.settings.updateField('apiKey', invalidApiKey);
      result.current.settings.updateField('model', SAVED_MODEL);
    });

    expect(result.current.settings.validationErrorCode).toBe('invalid_api_key');
    expect(result.current.settings.connectionStatus).toBe('invalid');
    expect(result.current.settings.canSave).toBe(false);
    expect(result.current.provider.isConfigured).toBe(false);
    expect(
      JSON.stringify({
        validationErrorCode: result.current.settings.validationErrorCode,
        connectionStatus: result.current.settings.connectionStatus,
        testState: result.current.settings.testState,
        configuration: result.current.provider.configuration,
      }),
    ).not.toContain(invalidApiKey);
  });

  it('does not expose or persist the API key, and a remounted provider starts empty', () => {
    const adapter = makeAdapter();
    const first = render(
      <AIProviderProvider client={adapter}>
        <SettingsConsumer />
        <FeatureConsumer />
      </AIProviderProvider>,
    );
    fillAndSave();

    expect(screen.getByTestId('workspace-export').textContent).not.toContain(API_KEY);
    expect(JSON.stringify(localStorage)).not.toContain(API_KEY);
    expect(JSON.stringify(sessionStorage)).not.toContain(API_KEY);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    first.unmount();
    render(
      <AIProviderProvider client={adapter}>
        <SettingsConsumer />
        <FeatureConsumer />
      </AIProviderProvider>,
    );
    expect(screen.getByTestId('client-state').textContent).toContain('"isConfigured":false');
    expect(screen.getByRole('textbox', { name: 'API Key' })).toHaveProperty('value', '');
  });

  it('preserves the saved session across language changes and template subtree remounts', () => {
    const EditorLikeHost = () => {
      const [template, setTemplate] = useState('template-a');
      const { locale, setLocale } = useI18n();
      return (
        <>
          <SettingsConsumer />
          <button type="button" onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}>
            Switch language
          </button>
          <button
            type="button"
            onClick={() =>
              setTemplate((value) => (value === 'template-a' ? 'template-b' : 'template-a'))
            }
          >
            Switch template
          </button>
          <div key={`${locale}:${template}`}>
            <FeatureConsumer />
          </div>
        </>
      );
    };
    render(
      <AIProviderProvider>
        <I18nProvider>
          <EditorLikeHost />
        </I18nProvider>
      </AIProviderProvider>,
    );
    fillAndSave();

    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch template' }));

    expect(screen.getByTestId('client-state').textContent).toContain(SAVED_BASE_URL);
    expect(screen.getByTestId('client-state').textContent).toContain(SAVED_MODEL);
    expect(screen.getByTestId('client-state').textContent).toContain('"isConfigured":true');
  });

  it('aborts connection and business requests when the session provider unmounts', async () => {
    const signals: AbortSignal[] = [];
    const complete = vi.fn(
      (_config, _credentials, _messages, options) =>
        new Promise<{ content: string }>(() => {
          const signal = options?.signal;
          if (!signal) throw new Error('The provider must pass an AbortSignal.');
          signals.push(signal);
        }),
    );
    const view = render(
      <AIProviderProvider client={makeAdapter(complete)}>
        <SettingsConsumer />
        <PassiveFeatureCall />
      </AIProviderProvider>,
    );
    fillAndSave();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start business request' }));

    expect(signals).toHaveLength(2);
    view.unmount();
    await waitFor(() => expect(signals.every((signal) => signal.aborted)).toBe(true));
  });
});
