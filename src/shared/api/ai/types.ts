export type ProviderConfig = {
  baseUrl: string;
  model: string;
};

export type RuntimeCredentials = {
  apiKey: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  stream: false;
};

export type ChatCompletionResult = {
  content: string;
};

export type ProviderConnectionStatus =
  | 'not_configured'
  | 'incomplete'
  | 'invalid'
  | 'ready'
  | 'testing'
  | 'success'
  | 'failure'
  | 'cancelled';

export type ProviderErrorCode =
  | 'incomplete_config'
  | 'invalid_url'
  | 'insecure_url'
  | 'embedded_credential'
  | 'authentication'
  | 'permission'
  | 'quota_or_rate_limit'
  | 'model_not_found'
  | 'server_error'
  | 'http_error'
  | 'timeout'
  | 'cancelled'
  | 'network'
  | 'incompatible_response';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly statusCode?: number;

  constructor(code: ProviderErrorCode, statusCode?: number) {
    super(code);
    this.name = 'ProviderError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
