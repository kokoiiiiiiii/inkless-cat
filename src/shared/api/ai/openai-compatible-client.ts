import { readChatCompletionSSE } from './sse-parser';
import {
  type ChatCompletionRequest,
  type ChatCompletionResult,
  type ChatCompletionStreamRequest,
  type ChatMessage,
  type ProviderConfig,
  ProviderError,
  type RuntimeCredentials,
} from './types';

export type CompleteOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type StreamCompleteOptions = CompleteOptions & {
  onDelta: (delta: string) => void;
  idleTimeoutMs?: number;
  maxOutputCodeUnits?: number;
};

export type OpenAICompatibleClientOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  streamTimeoutMs?: number;
  streamIdleTimeoutMs?: number;
};

export type ChatCompletionAdapter = {
  complete: (
    config: ProviderConfig,
    credentials: RuntimeCredentials,
    messages: ChatMessage[],
    options?: CompleteOptions,
  ) => Promise<ChatCompletionResult>;
  streamComplete: (
    config: ProviderConfig,
    credentials: RuntimeCredentials,
    messages: ChatMessage[],
    options: StreamCompleteOptions,
  ) => Promise<ChatCompletionResult>;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_STREAM_TIMEOUT_MS = 120_000;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 30_000;
const SENSITIVE_QUERY_NAMES =
  /^(?:api.?key|key|token|access.?token|authorization|secret|password|credential)$/iu;
const INVALID_API_KEY_CHARACTERS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

const isLocalDevelopmentHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname === '::1' ||
  hostname.endsWith('.localhost');

const assertConfiguration = (config: ProviderConfig, credentials: RuntimeCredentials) => {
  const rawApiKey = credentials.apiKey;
  if (INVALID_API_KEY_CHARACTERS.test(rawApiKey)) {
    throw new ProviderError('invalid_api_key');
  }
  const apiKey = rawApiKey.trim();
  if (!config.baseUrl.trim() || !config.model.trim() || !apiKey) {
    throw new ProviderError('incomplete_config');
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(config.baseUrl.trim());
  } catch {
    throw new ProviderError('invalid_url');
  }

  if (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') {
    throw new ProviderError('invalid_url');
  }
  if (baseUrl.username || baseUrl.password) {
    throw new ProviderError('embedded_credential');
  }
  if (baseUrl.protocol !== 'https:' && !isLocalDevelopmentHost(baseUrl.hostname)) {
    throw new ProviderError('insecure_url');
  }
  const hasCredentialQueryValue = [...baseUrl.searchParams.values()].includes(apiKey);
  const hasCredentialPathSegment = baseUrl.pathname.split('/').some((segment) => {
    try {
      return decodeURIComponent(segment) === apiKey;
    } catch {
      return false;
    }
  });
  if (
    baseUrl.hash ||
    [...baseUrl.searchParams.keys()].some((name) => SENSITIVE_QUERY_NAMES.test(name)) ||
    hasCredentialQueryValue ||
    hasCredentialPathSegment ||
    (apiKey.length >= 8 && baseUrl.href.includes(apiKey))
  ) {
    throw new ProviderError('embedded_credential');
  }

  return { baseUrl, apiKey };
};

export const validateProviderConfiguration = (
  config: ProviderConfig,
  credentials: RuntimeCredentials,
) => {
  assertConfiguration(config, credentials);
};

export const buildChatCompletionsUrl = (baseUrl: URL): string => {
  const endpoint = new URL(baseUrl.href);
  const normalizedPath = endpoint.pathname.replace(/\/+$/u, '');
  endpoint.pathname = normalizedPath || '/';

  if (!endpoint.pathname.endsWith('/chat/completions')) {
    endpoint.pathname = `${endpoint.pathname === '/' ? '' : endpoint.pathname}/chat/completions`;
  }
  return endpoint.href;
};

const isChatCompletionResponse = (
  value: unknown,
): value is { choices: Array<{ message: { content: string } }> } => {
  if (!value || typeof value !== 'object') return false;
  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return false;
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== 'object') return false;
  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return false;
  return typeof (message as { content?: unknown }).content === 'string';
};

const getHttpError = (statusCode: number): ProviderError => {
  if (statusCode === 401) return new ProviderError('authentication', statusCode);
  if (statusCode === 403) return new ProviderError('permission', statusCode);
  if (statusCode === 404) return new ProviderError('model_not_found', statusCode);
  if (statusCode === 402 || statusCode === 429) {
    return new ProviderError('quota_or_rate_limit', statusCode);
  }
  if (statusCode >= 500) return new ProviderError('server_error', statusCode);
  return new ProviderError('http_error', statusCode);
};

const isAbortError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');

export const createOpenAICompatibleClient = (options: OpenAICompatibleClientOptions = {}) => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const createRequestInit = (
    request: ChatCompletionRequest | ChatCompletionStreamRequest,
    apiKey: string,
    signal: AbortSignal,
  ): RequestInit => ({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(request.stream ? { Accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify(request),
    signal,
    redirect: 'error',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  });

  const complete = async (
    config: ProviderConfig,
    credentials: RuntimeCredentials,
    messages: ChatMessage[],
    callOptions: CompleteOptions = {},
  ): Promise<ChatCompletionResult> => {
    const { baseUrl, apiKey } = assertConfiguration(config, credentials);
    const url = buildChatCompletionsUrl(baseUrl);
    const request: ChatCompletionRequest = {
      model: config.model,
      messages,
      stream: false,
    };
    const controller = new AbortController();
    const timeoutMs = callOptions.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let didTimeout = false;
    const abortFromCaller = () => controller.abort();

    if (callOptions.signal?.aborted) {
      throw new ProviderError('cancelled');
    }
    callOptions.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const timeoutId = globalThis.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(url, createRequestInit(request, apiKey, controller.signal));
      if (didTimeout) throw new ProviderError('timeout');
      if (callOptions.signal?.aborted) throw new ProviderError('cancelled');

      if (!response.ok) throw getHttpError(response.status);

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch (error) {
        if (didTimeout) throw new ProviderError('timeout');
        if (callOptions.signal?.aborted || isAbortError(error)) {
          throw new ProviderError('cancelled');
        }
        throw new ProviderError('incompatible_response');
      }
      if (didTimeout) throw new ProviderError('timeout');
      if (callOptions.signal?.aborted) throw new ProviderError('cancelled');
      if (!isChatCompletionResponse(responseBody)) {
        throw new ProviderError('incompatible_response');
      }
      const content = responseBody.choices[0]?.message.content;
      if (typeof content !== 'string') throw new ProviderError('incompatible_response');
      return { content };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (didTimeout) throw new ProviderError('timeout');
      if (callOptions.signal?.aborted || isAbortError(error)) {
        throw new ProviderError('cancelled');
      }
      throw new ProviderError('network');
    } finally {
      globalThis.clearTimeout(timeoutId);
      callOptions.signal?.removeEventListener('abort', abortFromCaller);
    }
  };

  const streamComplete = async (
    config: ProviderConfig,
    credentials: RuntimeCredentials,
    messages: ChatMessage[],
    callOptions: StreamCompleteOptions,
  ): Promise<ChatCompletionResult> => {
    const { baseUrl, apiKey } = assertConfiguration(config, credentials);
    const url = buildChatCompletionsUrl(baseUrl);
    const request: ChatCompletionStreamRequest = {
      model: config.model,
      messages,
      stream: true,
    };
    const controller = new AbortController();
    const timeoutMs = callOptions.timeoutMs ?? options.streamTimeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS;
    const idleTimeoutMs =
      callOptions.idleTimeoutMs ?? options.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS;
    let timeoutKind: 'total' | 'idle' | null = null;
    let idleTimeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    const abortFromCaller = () => controller.abort();
    const resetIdleTimeout = () => {
      if (idleTimeoutId !== undefined) globalThis.clearTimeout(idleTimeoutId);
      idleTimeoutId = globalThis.setTimeout(
        () => {
          timeoutKind = 'idle';
          controller.abort();
        },
        Math.max(1, idleTimeoutMs),
      );
    };

    if (callOptions.signal?.aborted) throw new ProviderError('cancelled');
    callOptions.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const totalTimeoutId = globalThis.setTimeout(
      () => {
        timeoutKind = 'total';
        controller.abort();
      },
      Math.max(1, timeoutMs),
    );
    resetIdleTimeout();

    try {
      const response = await fetchImpl(url, createRequestInit(request, apiKey, controller.signal));
      if (timeoutKind) throw new ProviderError('timeout');
      if (callOptions.signal?.aborted) throw new ProviderError('cancelled');
      if (!response.ok) throw getHttpError(response.status);

      const contentType = response.headers?.get('content-type');
      if (
        contentType &&
        contentType.split(';', 1)[0]?.trim().toLowerCase() !== 'text/event-stream'
      ) {
        throw new ProviderError('stream_unsupported');
      }
      if (!response.body) throw new ProviderError('stream_unsupported');

      const content = await readChatCompletionSSE(response.body, {
        signal: controller.signal,
        onDelta: callOptions.onDelta,
        ...(callOptions.maxOutputCodeUnits === undefined
          ? {}
          : { maxContentCodeUnits: callOptions.maxOutputCodeUnits }),
        onChunk: (byteLength) => {
          if (byteLength > 0 && !controller.signal.aborted) resetIdleTimeout();
        },
      });
      if (timeoutKind) throw new ProviderError('timeout');
      if (callOptions.signal?.aborted) throw new ProviderError('cancelled');
      return { content };
    } catch (error) {
      if (timeoutKind) throw new ProviderError('timeout');
      if (callOptions.signal?.aborted) throw new ProviderError('cancelled');
      if (error instanceof ProviderError) throw error;
      if (isAbortError(error)) throw new ProviderError('cancelled');
      throw new ProviderError('network');
    } finally {
      globalThis.clearTimeout(totalTimeoutId);
      if (idleTimeoutId !== undefined) globalThis.clearTimeout(idleTimeoutId);
      callOptions.signal?.removeEventListener('abort', abortFromCaller);
    }
  };

  return { complete, streamComplete };
};

export const openAICompatibleClient: ChatCompletionAdapter = createOpenAICompatibleClient();
