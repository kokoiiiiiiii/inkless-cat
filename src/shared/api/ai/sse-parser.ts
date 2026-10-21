import { MAX_RESUME_TEXT_LENGTH, MAX_SECTION_ITEMS } from '@shared/lib/limits';

import { ProviderError } from './types';

export const MAX_STREAM_EVENT_CHARACTERS = 512 * 1024;
export const MAX_STREAM_RESPONSE_BYTES = 16 * 1024 * 1024;
export const MAX_STREAM_CONTENT_CODE_UNITS =
  MAX_RESUME_TEXT_LENGTH * MAX_SECTION_ITEMS + MAX_SECTION_ITEMS * 16 + 4096;

const boundedLimit = (value: number | undefined, fallback: number, maximum: number) =>
  Number.isSafeInteger(value) && (value as number) >= 0
    ? Math.min(value as number, maximum)
    : fallback;

export type ChatCompletionSSEOptions = {
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
  onChunk?: (byteLength: number) => void;
  maxEventCharacters?: number;
  maxResponseBytes?: number;
  maxContentCodeUnits?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const hasValidUsage = (value: unknown) => isRecord(value);

const nonTextDeltaFields = new Set([
  'tool_calls',
  'function_call',
  'refusal',
  'audio',
  'reasoning',
  'reasoning_content',
  'images',
  'annotations',
]);

const validateAndReadTextDelta = (value: unknown): string | null => {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    throw new ProviderError('stream_invalid');
  }

  if (value.choices.length === 0) {
    if (hasValidUsage(value.usage)) return null;
    throw new ProviderError('stream_invalid');
  }
  if (value.choices.length !== 1) throw new ProviderError('stream_invalid');

  const choice = value.choices[0];
  if (!isRecord(choice) || !isRecord(choice.delta)) {
    throw new ProviderError('stream_invalid');
  }
  for (const key of Object.keys(choice)) {
    if (!['index', 'delta', 'logprobs', 'finish_reason'].includes(key)) {
      throw new ProviderError('stream_invalid');
    }
  }
  if ('index' in choice && typeof choice.index !== 'number') {
    throw new ProviderError('stream_invalid');
  }
  if (
    'finish_reason' in choice &&
    choice.finish_reason !== null &&
    typeof choice.finish_reason !== 'string'
  ) {
    throw new ProviderError('stream_invalid');
  }
  if ('logprobs' in choice && choice.logprobs !== null && !isRecord(choice.logprobs)) {
    throw new ProviderError('stream_invalid');
  }

  const delta = choice.delta;
  for (const key of Object.keys(delta)) {
    if (key !== 'role' && key !== 'content' && !nonTextDeltaFields.has(key)) {
      throw new ProviderError('stream_invalid');
    }
  }
  if ('role' in delta && typeof delta.role !== 'string') {
    throw new ProviderError('stream_invalid');
  }
  if ('content' in delta && delta.content !== null && typeof delta.content !== 'string') {
    throw new ProviderError('stream_invalid');
  }
  if ('refusal' in delta && delta.refusal !== null && typeof delta.refusal !== 'string') {
    throw new ProviderError('stream_invalid');
  }
  if ('tool_calls' in delta && !Array.isArray(delta.tool_calls)) {
    throw new ProviderError('stream_invalid');
  }
  if ('function_call' in delta && delta.function_call !== null && !isRecord(delta.function_call)) {
    throw new ProviderError('stream_invalid');
  }

  return typeof delta.content === 'string' ? delta.content : null;
};

/** Reads and validates an OpenAI-compatible Chat Completions text SSE stream. */
export const readChatCompletionSSE = async (
  body: ReadableStream<Uint8Array>,
  options: ChatCompletionSSEOptions,
): Promise<string> => {
  const maxEventCharacters = boundedLimit(
    options.maxEventCharacters,
    MAX_STREAM_EVENT_CHARACTERS,
    MAX_STREAM_EVENT_CHARACTERS,
  );
  const maxResponseBytes = boundedLimit(
    options.maxResponseBytes,
    MAX_STREAM_RESPONSE_BYTES,
    MAX_STREAM_RESPONSE_BYTES,
  );
  const maxContentCodeUnits = boundedLimit(
    options.maxContentCodeUnits,
    MAX_STREAM_CONTENT_CODE_UNITS,
    MAX_STREAM_CONTENT_CODE_UNITS,
  );
  if (options.signal?.aborted) throw new ProviderError('cancelled');

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const contentParts: string[] = [];
  let contentCodeUnits = 0;
  let responseBytes = 0;
  let currentLine = '';
  let previousWasCarriageReturn = false;
  let eventData: string[] = [];
  let eventCharacters = 0;
  let receivedDone = false;
  let completed = false;
  let readEnded = false;

  const finishEvent = () => {
    if (eventData.length === 0) return;
    const data = eventData.join('\n');
    eventData = [];
    eventCharacters = 0;
    if (data === '[DONE]') {
      receivedDone = true;
      return;
    }
    if (data.length === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new ProviderError('stream_invalid');
    }
    const delta = validateAndReadTextDelta(parsed);
    if (delta === null || delta.length === 0) return;
    contentCodeUnits += delta.length;
    if (contentCodeUnits > maxContentCodeUnits) {
      throw new ProviderError('stream_too_large');
    }
    contentParts.push(delta);
    try {
      options.onDelta(delta);
    } catch {
      throw new ProviderError('stream_invalid');
    }
  };

  const processLine = (line: string) => {
    if (line === '') {
      finishEvent();
      return;
    }
    if (line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field !== 'data') return;

    eventCharacters += value.length + (eventData.length > 0 ? 1 : 0);
    if (eventCharacters > maxEventCharacters) throw new ProviderError('stream_too_large');
    eventData.push(value);
  };

  const consumeText = (text: string) => {
    for (let index = 0; index < text.length && !receivedDone; index += 1) {
      if (options.signal?.aborted) throw new ProviderError('cancelled');
      const character = text[index];
      if (previousWasCarriageReturn) {
        previousWasCarriageReturn = false;
        if (character === '\n') continue;
      }
      if (character === '\r' || character === '\n') {
        processLine(currentLine);
        currentLine = '';
        previousWasCarriageReturn = character === '\r';
        if (options.signal?.aborted) throw new ProviderError('cancelled');
      } else {
        currentLine += character;
        if (currentLine.length > maxEventCharacters) {
          throw new ProviderError('stream_too_large');
        }
      }
    }
  };

  const cancelReader = () => {
    void reader.cancel().catch(() => false);
  };
  const abortReader = () => cancelReader();
  options.signal?.addEventListener('abort', abortReader, { once: true });

  try {
    while (!receivedDone) {
      if (options.signal?.aborted) throw new ProviderError('cancelled');
      const result = await reader.read();
      if (options.signal?.aborted) throw new ProviderError('cancelled');
      if (result.done) {
        readEnded = true;
        break;
      }
      if (result.value.byteLength === 0) continue;

      responseBytes += result.value.byteLength;
      if (responseBytes > maxResponseBytes) throw new ProviderError('stream_too_large');
      options.onChunk?.(result.value.byteLength);

      let text: string;
      try {
        text = decoder.decode(result.value, { stream: true });
      } catch {
        throw new ProviderError('stream_invalid');
      }
      consumeText(text);
    }

    if (options.signal?.aborted) throw new ProviderError('cancelled');
    if (!receivedDone) {
      try {
        decoder.decode();
      } catch {
        throw new ProviderError('stream_invalid');
      }
    }
    if (!receivedDone) throw new ProviderError('stream_interrupted');
    completed = true;
    return contentParts.join('');
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (options.signal?.aborted) throw new ProviderError('cancelled');
    throw new ProviderError('stream_interrupted');
  } finally {
    options.signal?.removeEventListener('abort', abortReader);
    if (!completed || !readEnded) cancelReader();
    reader.releaseLock();
  }
};
