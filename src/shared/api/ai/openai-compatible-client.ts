import {
  type ChatCompletionRequest,
  type ChatCompletionResult,
  type ChatMessage,
  type ProviderConfig,
  ProviderError,
  type RuntimeCredentials,
} from './types';

export type CompleteOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type OpenAICompatibleClientOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type ChatCompletionAdapter = {
  complete: (
    config: ProviderConfig,
    credentials: RuntimeCredentials,
    messages: ChatMessage[],
    options?: CompleteOptions,
  ) => Promise<ChatCompletionResult>;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const SENSITIVE_QUERY_NAMES =
  /^(?:api.?key|key|token|access.?token|authorization|secret|password|credential)$/iu;

const isLocalDevelopmentHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname === '::1' ||
  hostname.endsWith('.localhost');

const assertConfiguration = (config: ProviderConfig, credentials: RuntimeCredentials) => {
  if (!config.baseUrl.trim() || !config.model.trim() || !credentials.apiKey.trim()) {
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
  const apiKey = credentials.apiKey.trim();
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

  return baseUrl;
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

  const complete = async (
    config: ProviderConfig,
    credentials: RuntimeCredentials,
    messages: ChatMessage[],
    callOptions: CompleteOptions = {},
  ): Promise<ChatCompletionResult> => {
    const parsedUrl = assertConfiguration(config, credentials);
    const url = buildChatCompletionsUrl(parsedUrl);
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
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
        redirect: 'error',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      });
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

  return { complete };
};

export const openAICompatibleClient: ChatCompletionAdapter = createOpenAICompatibleClient();
