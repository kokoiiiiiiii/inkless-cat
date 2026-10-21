import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildChatCompletionsUrl,
  createOpenAICompatibleClient,
  validateProviderConfiguration,
} from './openai-compatible-client';
import { ProviderError } from './types';

const config = { baseUrl: 'https://provider.example/v1', model: 'MiXeD-Model' };
const credentials = { apiKey: 'test-key-never-real' };
const validPayload = { choices: [{ message: { content: 'OK' } }] };

const response = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as Response;

const rejectWithCode = (promise: Promise<unknown>, code: string) =>
  expect(promise).rejects.toMatchObject({ code });

afterEach(() => vi.useRealTimers());

describe('OpenAI-compatible provider client', () => {
  it('validates HTTPS URLs and local HTTP development addresses', () => {
    expect(() => validateProviderConfiguration(config, credentials)).not.toThrow();
    expect(() =>
      validateProviderConfiguration(
        { baseUrl: 'http://localhost:8080/v1', model: 'local' },
        credentials,
      ),
    ).not.toThrow();
    expect(() =>
      validateProviderConfiguration(
        { baseUrl: 'http://127.0.0.1:8080/v1', model: 'local' },
        credentials,
      ),
    ).not.toThrow();
  });

  it.each([
    ['invalid protocol', 'javascript:alert(1)', 'invalid_url'],
    ['relative URL', '/v1', 'invalid_url'],
    ['remote HTTP', 'http://provider.example/v1', 'insecure_url'],
    ['URL username', 'https://user@provider.example/v1', 'embedded_credential'],
    ['URL password', 'https://user:pass@provider.example/v1', 'embedded_credential'],
    [
      'API-key query parameter',
      'https://provider.example/v1?api_key=secret',
      'embedded_credential',
    ],
    [
      'API key as a query value',
      'https://provider.example/v1?tenant=test-key-never-real',
      'embedded_credential',
    ],
    [
      'API key as an encoded query value',
      'https://provider.example/v1?tenant=test-key-never%2Dreal',
      'embedded_credential',
    ],
    [
      'API key as a path segment',
      'https://provider.example/test-key-never-real/v1',
      'embedded_credential',
    ],
    ['fragment', 'https://provider.example/v1#secret', 'embedded_credential'],
  ])('rejects %s', (_label, baseUrl, code) => {
    let caught: unknown;
    try {
      validateProviderConfiguration({ baseUrl, model: 'model' }, credentials);
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code });
  });

  it('rejects missing Base URL, model, or API key', () => {
    for (const invalid of [
      [{ baseUrl: '', model: 'model' }, credentials],
      [{ baseUrl: config.baseUrl, model: ' ' }, credentials],
      [config, { apiKey: '' }],
    ] as const) {
      let caught: unknown;
      try {
        validateProviderConfiguration(invalid[0], invalid[1]);
      } catch (error) {
        caught = error;
      }
      expect(caught).toMatchObject({ code: 'incomplete_config' });
    }
  });

  it.each([
    ['leading whitespace', `  ${credentials.apiKey}`],
    ['trailing whitespace', `${credentials.apiKey} \t`],
  ])('validates and sends the trimmed API key with %s', async (_label, apiKey) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload));
    const client = createOpenAICompatibleClient({ fetchImpl });

    expect(() => validateProviderConfiguration(config, { apiKey })).not.toThrow();
    await client.complete(config, { apiKey }, []);

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${credentials.apiKey}`);
  });

  it('rejects whitespace-only and line-break API keys before sending a request', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload));
    const client = createOpenAICompatibleClient({ fetchImpl });

    expect(() => validateProviderConfiguration(config, { apiKey: ' \t ' })).toThrow(
      'incomplete_config',
    );
    expect(() => validateProviderConfiguration(config, { apiKey: 'test-key\nnever-real' })).toThrow(
      'invalid_api_key',
    );
    await rejectWithCode(
      client.complete(config, { apiKey: 'test-key\nnever-real' }, []),
      'invalid_api_key',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('joins trailing slashes and /v1 without duplicating the endpoint', () => {
    expect(buildChatCompletionsUrl(new URL('https://provider.example/v1/'))).toBe(
      'https://provider.example/v1/chat/completions',
    );
    expect(buildChatCompletionsUrl(new URL('https://provider.example/v1/chat/completions/'))).toBe(
      'https://provider.example/v1/chat/completions',
    );
    expect(buildChatCompletionsUrl(new URL('https://provider.example/custom/path'))).toBe(
      'https://provider.example/custom/path/chat/completions',
    );
  });

  it('sends one non-streaming Chat Completions request with bearer authentication', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload));
    const client = createOpenAICompatibleClient({ fetchImpl });

    await client.complete(config, credentials, [{ role: 'user', content: 'Hello' }]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://provider.example/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-key-never-real');
    if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.');
    expect(JSON.parse(init.body)).toEqual({
      model: 'MiXeD-Model',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    });
    expect(init?.redirect).toBe('error');
    expect(init?.credentials).toBe('omit');
    expect(init?.referrerPolicy).toBe('no-referrer');
    expect(init?.mode).not.toBe('no-cors');
    const requestUrl = url instanceof URL ? url.href : url instanceof Request ? url.url : url;
    expect(requestUrl).not.toContain(credentials.apiKey);
  });

  it('parses the minimum required completion message', async () => {
    const client = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload)),
    });
    await expect(client.complete(config, credentials, [])).resolves.toEqual({ content: 'OK' });
  });

  it.each([
    ['missing choices', {}],
    ['empty choices', { choices: [] }],
    ['missing message', { choices: [{}] }],
    ['non-string content', { choices: [{ message: { content: null } }] }],
  ])('rejects an incompatible response with %s', async (_label, payload) => {
    const client = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response(200, payload)),
    });
    await rejectWithCode(client.complete(config, credentials, []), 'incompatible_response');
  });

  it('does not include an invalid response body in the error', async () => {
    const secretLookingBody = { choices: [{ message: { content: credentials.apiKey } }] };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, secretLookingBody));
    const client = createOpenAICompatibleClient({ fetchImpl });
    const result = await client.complete(config, credentials, []);
    expect(result.content).toBe(credentials.apiKey);
    const badClient = createOpenAICompatibleClient({
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(response(200, { error: credentials.apiKey })),
    });
    await expect(badClient.complete(config, credentials, [])).rejects.toMatchObject({
      code: 'incompatible_response',
      message: 'incompatible_response',
    });
  });

  it.each([
    [401, 'authentication'],
    [403, 'permission'],
    [404, 'model_not_found'],
    [402, 'quota_or_rate_limit'],
    [429, 'quota_or_rate_limit'],
    [500, 'server_error'],
    [503, 'server_error'],
  ])('classifies HTTP %s safely', async (status, code) => {
    const client = createOpenAICompatibleClient({
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          response(status, { error: { message: `contains ${credentials.apiKey}` } }),
        ),
    });
    await expect(client.complete(config, credentials, [])).rejects.toMatchObject({
      code,
      statusCode: status,
    });
  });

  it('keeps authentication failures generic and free of key or response details', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response(401, { error: `contains ${credentials.apiKey}` }));
    const client = createOpenAICompatibleClient({ fetchImpl });
    const error = await client.complete(config, credentials, []).catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: 'authentication', message: 'authentication' });
    expect(String(error)).not.toContain(credentials.apiKey);
    expect(String(error)).not.toContain('contains');
  });

  it('maps fetch failures to a generic network or possible CORS error', async () => {
    const client = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('secret response detail')),
    });
    const error = await client.complete(config, credentials, []).catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: 'network', message: 'network' });
    expect(String(error)).not.toContain(credentials.apiKey);
  });

  it('distinguishes a timed out request', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const client = createOpenAICompatibleClient({ fetchImpl, timeoutMs: 50 });
    const pending = client.complete(config, credentials, []);
    const rejection = rejectWithCode(pending, 'timeout');
    await vi.advanceTimersByTimeAsync(51);
    await rejection;
  });

  it('distinguishes a user AbortSignal cancellation', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const client = createOpenAICompatibleClient({ fetchImpl, timeoutMs: 10_000 });
    const controller = new AbortController();
    const pending = client.complete(config, credentials, [], { signal: controller.signal });
    controller.abort();
    await rejectWithCode(pending, 'cancelled');
  });

  it('preserves cancellation and timeout classifications while reading the response body', async () => {
    vi.useFakeTimers();
    const timeoutFetch = vi.fn<typeof fetch>(
      (_input, init) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError')),
              );
            }),
        }) as Promise<Response>,
    );
    const timeoutClient = createOpenAICompatibleClient({ fetchImpl: timeoutFetch, timeoutMs: 25 });
    const timedOutRequest = timeoutClient.complete(config, credentials, []);
    const timeoutAssertion = rejectWithCode(timedOutRequest, 'timeout');
    await vi.advanceTimersByTimeAsync(26);
    await timeoutAssertion;

    vi.useRealTimers();
    let activeSignal: AbortSignal | null | undefined;
    const json = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          activeSignal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const cancelFetch = vi.fn<typeof fetch>((_input, init) => {
      activeSignal = init?.signal;
      return Promise.resolve({ ok: true, status: 200, json }) as unknown as Promise<Response>;
    });
    const cancelClient = createOpenAICompatibleClient({ fetchImpl: cancelFetch });
    const controller = new AbortController();
    const cancelledRequest = cancelClient.complete(config, credentials, [], {
      signal: controller.signal,
    });
    const cancelAssertion = rejectWithCode(cancelledRequest, 'cancelled');
    await vi.waitFor(() => expect(json).toHaveBeenCalledTimes(1));
    controller.abort();
    await cancelAssertion;
  });
});
