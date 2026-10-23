export const aiProvider = {
  open: 'AI settings',
  title: 'AI provider settings',
  description: 'Connect to a service that supports the OpenAI Chat Completions format.',
  baseUrlLabel: 'API Base URL',
  baseUrlHelp:
    'Enter the API prefix, for example https://example.com/v1. A trailing slash is fine.',
  apiKeyLabel: 'API Key',
  apiKeyHelp:
    'The key stays in this page session and is not saved to browser storage or resume files.',
  showKey: 'Show API Key',
  hideKey: 'Hide API Key',
  modelLabel: 'Model ID',
  modelHelp: 'Enter the model identifier supplied by your service. Letter case is preserved.',
  trustNote:
    'Your browser sends this key and the short test prompt directly to the endpoint you enter. Inkless Cat does not receive or store the key. Use only an endpoint you trust.',
  probeCost: 'A connection test sends one short request and may use a small amount of API quota.',
  futureNote: 'Use AI interview questions or polish selected resume fields.',
  save: 'Save for this session',
  saved: 'Saved for this session',
  test: 'Test connection',
  cancelTest: 'Cancel test',
  clear: 'Clear settings',
  close: 'Close AI settings',
  notConfigured: 'No AI service is configured.',
  incomplete: 'Enter a Base URL, API Key, and Model ID.',
  invalid: 'Check the Base URL and its security requirements.',
  ready: 'Configuration is ready. Save it for this session to enable testing.',
  testing: 'Testing the connection…',
  success:
    'Connection test succeeded for {model} at {time}. This does not guarantee future availability.',
  cancelled: 'Connection test cancelled.',
  failureTitle: 'Connection test failed',
  errors: {
    incomplete_config: 'Enter a Base URL, API Key, and Model ID.',
    invalid_url: 'The Base URL must be a valid HTTP or HTTPS URL.',
    insecure_url: 'Use HTTPS for remote services. HTTP is allowed only for localhost development.',
    embedded_credential: 'Remove credentials, API keys, or fragments from the Base URL.',
    invalid_api_key: 'The API Key cannot contain control characters or line breaks.',
    authentication: 'Authentication failed. Check the API Key.',
    permission: 'The key does not have permission to use this endpoint or model.',
    quota_or_rate_limit:
      'The service reported a quota or rate limit. Check your account or try again later.',
    model_not_found: 'The endpoint or model was not found. Check the Base URL and Model ID.',
    server_error: 'The service returned a server error. Try again later.',
    http_error:
      'The service rejected the request (HTTP {status}). Check its API compatibility and settings.',
    timeout: 'The request timed out. Check the endpoint and try again.',
    cancelled: 'Connection test cancelled.',
    network:
      'The browser could not read a response. Possible causes include network, DNS, TLS, or endpoint CORS restrictions. Check that the service is reachable and allows browser requests from this site.',
    incompatible_response:
      'The endpoint response did not include a valid Chat Completions message.',
    stream_unsupported:
      'The endpoint did not return an OpenAI-compatible SSE stream. Check that streaming Chat Completions are supported.',
    stream_interrupted:
      'The response stream ended before its completion marker arrived. No partial suggestion was kept.',
    stream_invalid:
      'The endpoint returned invalid or unsupported streaming data. No partial suggestion was kept.',
    stream_truncated:
      'The model reached its output limit, so the result may be incomplete. Shorten the source or adjust it and try again.',
    stream_filtered:
      'The model service stopped generation because of its content safety policy. This result was not kept.',
    stream_not_text:
      'The model did not complete text generation normally. Check model compatibility and try again.',
    stream_too_large:
      'The response stream exceeded the supported size limit. No partial suggestion was kept.',
  },
} as const;
