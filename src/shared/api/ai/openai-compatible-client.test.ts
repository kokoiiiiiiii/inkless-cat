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

const streamResponse = (
  body: string | ReadableStream<Uint8Array> | null,
  status = 200,
  contentType: string | null = 'text/event-stream',
) =>
  new Response(body, {
    status,
    headers: contentType ? { 'content-type': contentType } : undefined,
  });

const streamBody = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;

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
    ['leading ordinary spaces', `  ${credentials.apiKey}`],
    ['trailing ordinary spaces', `${credentials.apiKey}  `],
  ])('validates and sends the trimmed API key with %s', async (_label, apiKey) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload));
    const client = createOpenAICompatibleClient({ fetchImpl });

    expect(() => validateProviderConfiguration(config, { apiKey })).not.toThrow();
    await client.complete(config, { apiKey }, []);

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${credentials.apiKey}`);
  });

  it.each([
    ['leading newline', `\n${credentials.apiKey}`],
    ['trailing newline', `${credentials.apiKey}\n`],
    ['leading carriage return', `\r${credentials.apiKey}`],
    ['trailing carriage return', `${credentials.apiKey}\r`],
    ['leading tab', `\t${credentials.apiKey}`],
    ['trailing tab', `${credentials.apiKey}\t`],
    [
      'internal carriage return',
      `${credentials.apiKey.slice(0, 4)}\r${credentials.apiKey.slice(4)}`,
    ],
    ['internal line feed', `${credentials.apiKey.slice(0, 4)}\n${credentials.apiKey.slice(4)}`],
    ['NUL', `${credentials.apiKey}\u0000`],
    ['other C0 control', `${credentials.apiKey}\u0001`],
    ['C1 control', `${credentials.apiKey}\u0085`],
    ['Unicode line separator', `${credentials.apiKey}\u2028`],
    ['Unicode paragraph separator', `${credentials.apiKey}\u2029`],
    ['invisible format character', `${credentials.apiKey}\u200B`],
  ])('rejects %s before sending or exposing the API key', async (_label, apiKey) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload));
    const client = createOpenAICompatibleClient({ fetchImpl });
    const error = await client.complete(config, { apiKey }, []).catch((error_: unknown) => error_);

    expect(() => validateProviderConfiguration(config, { apiKey })).toThrow('invalid_api_key');
    expect(error).toMatchObject({ code: 'invalid_api_key', message: 'invalid_api_key' });
    expect(String(error)).not.toContain(apiKey);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an all-space key as incomplete and does not send a request', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(200, validPayload));
    const client = createOpenAICompatibleClient({ fetchImpl });
    const apiKey = '   ';

    expect(() => validateProviderConfiguration(config, { apiKey })).toThrow('incomplete_config');
    const error = await client.complete(config, { apiKey }, []).catch((error_: unknown) => error_);
    expect(error).toMatchObject({ code: 'incomplete_config', message: 'incomplete_config' });
    expect(String(error)).not.toContain(apiKey);
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

  it('sends a streaming Chat Completions request with the same secure provider settings', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(streamResponse(streamBody('Streaming result')));
    const client = createOpenAICompatibleClient({ fetchImpl });
    const onDelta = vi.fn();

    await expect(
      client.streamComplete(config, credentials, [{ role: 'user', content: 'Hello' }], {
        onDelta,
      }),
    ).resolves.toEqual({ content: 'Streaming result' });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://provider.example/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-key-never-real');
    expect(new Headers(init?.headers).get('Accept')).toBe('text/event-stream');
    expect(new Headers(init?.headers).get('Cookie')).toBeNull();
    if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.');
    expect(JSON.parse(init.body)).toEqual({
      model: 'MiXeD-Model',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true,
    });
    expect(init?.redirect).toBe('error');
    expect(init?.credentials).toBe('omit');
    expect(init?.referrerPolicy).toBe('no-referrer');
    expect(init?.cache).toBe('no-store');
    expect(onDelta.mock.calls.flat().join('')).toBe('Streaming result');
  });

  it('accepts a normal stop finish_reason in a separate completion chunk', async () => {
    const content = 'Complete streamed result.';
    const body =
      `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n` +
      'data: [DONE]\n\n';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(streamResponse(body));
    const client = createOpenAICompatibleClient({ fetchImpl });

    await expect(
      client.streamComplete(config, credentials, [], { onDelta: vi.fn() }),
    ).resolves.toEqual({ content });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['length', 'stream_truncated'],
    ['content_filter', 'stream_filtered'],
  ])('rejects %s without retrying or falling back to non-streaming', async (finishReason, code) => {
    const privateText = 'private model response text';
    const body =
      `data: ${JSON.stringify({ choices: [{ delta: { content: privateText } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: finishReason }] })}\n\n` +
      'data: [DONE]\n\n';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(streamResponse(body));
    const client = createOpenAICompatibleClient({ fetchImpl });
    const error = await client
      .streamComplete(config, credentials, [], { onDelta: vi.fn() })
      .catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code, message: code });
    expect(String(error)).not.toContain(privateText);
    expect(String(error)).not.toContain(credentials.apiKey);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(init?.body).toContain('"stream":true');
  });

  it.each([401, 403, 404, 429, 500])(
    'maps streaming HTTP %s before reading its body',
    async (status) => {
      const body = vi.fn(() => new ReadableStream<Uint8Array>());
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(null, { status, headers: { 'content-type': 'application/json' } }),
        );
      const client = createOpenAICompatibleClient({ fetchImpl });
      const expected =
        status === 401
          ? 'authentication'
          : status === 403
            ? 'permission'
            : status === 404
              ? 'model_not_found'
              : status === 429
                ? 'quota_or_rate_limit'
                : 'server_error';
      await rejectWithCode(
        client.streamComplete(config, credentials, [], { onDelta: vi.fn() }),
        expected,
      );
      expect(body).not.toHaveBeenCalled();
    },
  );

  it('reports JSON and missing-body responses as unsupported streaming', async () => {
    const jsonClient = createOpenAICompatibleClient({
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(streamResponse(JSON.stringify(validPayload), 200, 'application/json')),
    });
    const missingBodyClient = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: null,
      } as Response),
    });
    await rejectWithCode(
      jsonClient.streamComplete(config, credentials, [], { onDelta: vi.fn() }),
      'stream_unsupported',
    );
    await rejectWithCode(
      missingBodyClient.streamComplete(config, credentials, [], { onDelta: vi.fn() }),
      'stream_unsupported',
    );
  });

  it('does not send an invalid streaming configuration and reports fetch failures as network errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(streamResponse(streamBody('ok')));
    const client = createOpenAICompatibleClient({ fetchImpl });
    await rejectWithCode(
      client.streamComplete(
        { ...config, baseUrl: 'http://remote-provider.example/v1' },
        credentials,
        [],
        { onDelta: vi.fn() },
      ),
      'insecure_url',
    );
    expect(fetchImpl).not.toHaveBeenCalled();

    const networkClient = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('private network detail')),
    });
    const error = await networkClient
      .streamComplete(config, credentials, [], { onDelta: vi.fn() })
      .catch((error_: unknown) => error_);
    expect(error).toMatchObject({ code: 'network', message: 'network' });
    expect(String(error)).not.toContain('private network detail');
  });

  it('accepts a standard SSE response without Content-Type and allows UTF-8 charset metadata', async () => {
    const body = () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(streamBody('text')));
          controller.close();
        },
      });
    for (const response of [
      new Response(body()),
      streamResponse(streamBody('text'), 200, 'text/event-stream; charset=utf-8'),
    ]) {
      const client = createOpenAICompatibleClient({
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
      });
      await expect(
        client.streamComplete(config, credentials, [], { onDelta: vi.fn() }),
      ).resolves.toEqual({ content: 'text' });
    }
  });

  it('enforces a caller output bound before delivering an oversized delta', async () => {
    const onDelta = vi.fn();
    const client = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(streamResponse(streamBody('long'))),
    });
    await rejectWithCode(
      client.streamComplete(config, credentials, [], { onDelta, maxOutputCodeUnits: 3 }),
      'stream_too_large',
    );
    expect(onDelta).not.toHaveBeenCalled();
  });

  it('does not resolve a partial result if the response omits [DONE]', async () => {
    const onDelta = vi.fn();
    const client = createOpenAICompatibleClient({
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          streamResponse(
            `data: ${JSON.stringify({ choices: [{ delta: { content: 'partial' } }] })}\n\n`,
          ),
        ),
    });
    await rejectWithCode(
      client.streamComplete(config, credentials, [], { onDelta }),
      'stream_interrupted',
    );
    expect(onDelta.mock.calls.flat().join('')).toBe('partial');
  });

  it('distinguishes caller cancellation, total timeout, and idle timeout while reading', async () => {
    vi.useFakeTimers();
    const neverEndingBody = () => new ReadableStream<Uint8Array>({});
    const createClient = () =>
      createOpenAICompatibleClient({
        fetchImpl: vi
          .fn<typeof fetch>()
          .mockImplementation(() => Promise.resolve(streamResponse(neverEndingBody()))),
      });

    const totalClient = createClient();
    const totalRequest = totalClient.streamComplete(config, credentials, [], {
      onDelta: vi.fn(),
      timeoutMs: 50,
      idleTimeoutMs: 10_000,
    });
    const totalAssertion = rejectWithCode(totalRequest, 'timeout');
    await vi.advanceTimersByTimeAsync(51);
    await totalAssertion;

    const idleClient = createClient();
    const idleRequest = idleClient.streamComplete(config, credentials, [], {
      onDelta: vi.fn(),
      timeoutMs: 10_000,
      idleTimeoutMs: 45,
    });
    const idleAssertion = rejectWithCode(idleRequest, 'timeout');
    await vi.advanceTimersByTimeAsync(46);
    await idleAssertion;

    const controller = new AbortController();
    const cancelRequest = createClient().streamComplete(config, credentials, [], {
      onDelta: vi.fn(),
      signal: controller.signal,
      timeoutMs: 10_000,
      idleTimeoutMs: 10_000,
    });
    const cancelAssertion = rejectWithCode(cancelRequest, 'cancelled');
    controller.abort();
    await cancelAssertion;
  });

  it('does not expose server response text or credentials in streaming errors', async () => {
    const secretLookingBody = `data: ${credentials.apiKey}\n\n`;
    const client = createOpenAICompatibleClient({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(streamResponse(secretLookingBody)),
    });
    const error = await client
      .streamComplete(config, credentials, [], { onDelta: vi.fn() })
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: 'stream_invalid', message: 'stream_invalid' });
    expect(String(error)).not.toContain(credentials.apiKey);
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
