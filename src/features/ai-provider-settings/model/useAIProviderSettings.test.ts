import { openAICompatibleClient, ProviderError } from '@shared/api/ai';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAIProviderSettings } from './useAIProviderSettings';

const fillAndSave = (result: { current: ReturnType<typeof useAIProviderSettings> }) => {
  act(() => {
    result.current.updateField('baseUrl', 'https://provider.example/v1');
    result.current.updateField('apiKey', 'runtime-secret-test-only');
    result.current.updateField('model', 'MiXeD-Model');
  });
  act(() => {
    expect(result.current.saveForSession()).toBe(true);
  });
};

afterEach(() => vi.restoreAllMocks());

describe('useAIProviderSettings', () => {
  it('keeps settings in memory, saves explicitly, and reports a successful test', async () => {
    const completeSpy = vi
      .spyOn(openAICompatibleClient, 'complete')
      .mockResolvedValue({ content: 'OK' });
    const { result } = renderHook(() => useAIProviderSettings());

    expect(result.current.connectionStatus).toBe('not_configured');
    fillAndSave(result);
    expect(result.current.isSaved).toBe(true);
    expect(result.current.canTest).toBe(true);

    await act(async () => result.current.testConnection());

    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(completeSpy).toHaveBeenCalledWith(
      { baseUrl: 'https://provider.example/v1', model: 'MiXeD-Model' },
      { apiKey: 'runtime-secret-test-only' },
      [{ role: 'user', content: 'Reply with exactly: OK' }],
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.testState).toMatchObject({ status: 'success', model: 'MiXeD-Model' });
  });

  it('distinguishes incomplete, invalid, and ready configurations', () => {
    const { result } = renderHook(() => useAIProviderSettings());
    act(() => result.current.updateField('baseUrl', 'https://provider.example/v1'));
    expect(result.current.connectionStatus).toBe('incomplete');

    act(() => {
      result.current.updateField('apiKey', 'runtime-secret-test-only');
      result.current.updateField('model', 'model');
    });
    expect(result.current.connectionStatus).toBe('ready');

    act(() => result.current.updateField('baseUrl', 'http://provider.example/v1'));
    expect(result.current.connectionStatus).toBe('invalid');
  });

  it('invalidates a previous successful result when any field changes', async () => {
    vi.spyOn(openAICompatibleClient, 'complete').mockResolvedValue({ content: 'OK' });
    const { result } = renderHook(() => useAIProviderSettings());
    fillAndSave(result);
    await act(async () => result.current.testConnection());
    expect(result.current.connectionStatus).toBe('success');

    act(() => result.current.updateField('model', 'another-model'));
    expect(result.current.testState).toEqual({ status: 'idle' });
    expect(result.current.isSaved).toBe(false);
    expect(result.current.connectionStatus).toBe('ready');
    expect(result.current.canTest).toBe(false);
  });

  it('does not allow a test for old configuration to overwrite a newer result', async () => {
    let resolveFirst: ((value: { content: string }) => void) | undefined;
    let firstSignal: AbortSignal | undefined;
    const completeSpy = vi
      .spyOn(openAICompatibleClient, 'complete')
      .mockImplementationOnce((_config, _credentials, _messages, options) => {
        firstSignal = options?.signal;
        return new Promise((resolve) => (resolveFirst = resolve));
      })
      .mockResolvedValueOnce({ content: 'OK' });
    const { result } = renderHook(() => useAIProviderSettings());
    fillAndSave(result);

    let firstRequest: Promise<void> | undefined;
    act(() => {
      firstRequest = result.current.testConnection();
    });
    expect(result.current.testState.status).toBe('testing');
    act(() => result.current.updateField('model', 'new-model'));
    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.testState).toEqual({ status: 'idle' });
    act(() => {
      expect(result.current.saveForSession()).toBe(true);
    });
    await act(async () => result.current.testConnection());
    expect(result.current.testState).toMatchObject({ status: 'success', model: 'new-model' });

    await act(async () => {
      resolveFirst?.({ content: 'old result' });
      await firstRequest;
    });
    expect(completeSpy).toHaveBeenCalledTimes(2);
    expect(result.current.testState).toMatchObject({ status: 'success', model: 'new-model' });
  });

  it('cancels a pending request and clears the key from the in-memory form', () => {
    let requestSignal: AbortSignal | undefined;
    vi.spyOn(openAICompatibleClient, 'complete').mockImplementation(
      (_config, _credentials, _messages, options) => {
        requestSignal = options?.signal;
        return new Promise(() => {});
      },
    );
    const { result } = renderHook(() => useAIProviderSettings());
    fillAndSave(result);
    act(() => {
      void result.current.testConnection();
    });
    expect(result.current.testState.status).toBe('testing');

    act(() => result.current.clear());

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current.form.apiKey).toBe('');
    expect(result.current.form.baseUrl).toBe('');
    expect(result.current.testState).toEqual({ status: 'idle' });
    expect(result.current.connectionStatus).toBe('not_configured');
  });

  it('aborts a request when the settings owner unmounts', () => {
    let requestSignal: AbortSignal | undefined;
    vi.spyOn(openAICompatibleClient, 'complete').mockImplementation(
      (_config, _credentials, _messages, options) => {
        requestSignal = options?.signal;
        return new Promise(() => {});
      },
    );
    const { result, unmount } = renderHook(() => useAIProviderSettings());
    fillAndSave(result);
    act(() => {
      void result.current.testConnection();
    });

    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it('stores only a safe error code from a failed request', async () => {
    vi.spyOn(openAICompatibleClient, 'complete').mockRejectedValue(
      new ProviderError('authentication', 401),
    );
    const { result } = renderHook(() => useAIProviderSettings());
    fillAndSave(result);
    await act(async () => result.current.testConnection());
    expect(result.current.testState).toEqual({
      status: 'failure',
      errorCode: 'authentication',
      statusCode: 401,
    });
    expect(JSON.stringify(result.current.testState)).not.toContain('runtime-secret-test-only');
  });
});
