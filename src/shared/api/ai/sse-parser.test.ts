import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_STREAM_CONTENT_CODE_UNITS, readChatCompletionSSE } from './sse-parser';
import { ProviderError } from './types';

const encoder = new TextEncoder();
const event = (delta: Record<string, unknown>) =>
  `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;
const choiceEvent = (choice: Record<string, unknown>) =>
  `data: ${JSON.stringify({ choices: [choice] })}\n\n`;
const finishEvent = (finishReason: unknown, delta: Record<string, unknown> = {}) =>
  choiceEvent({ delta, finish_reason: finishReason });
const done = 'data: [DONE]\n\n';
const streamOf = (chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
const parse = (chunks: Uint8Array[], onDelta = vi.fn<(delta: string) => void>(), options = {}) =>
  readChatCompletionSSE(streamOf(chunks), { onDelta, ...options }).then((content) => ({
    content,
    onDelta,
  }));
const expectCode = (promise: Promise<unknown>, code: string) =>
  expect(promise).rejects.toMatchObject({ code, message: code });

afterEach(() => vi.restoreAllMocks());

describe('Chat Completions SSE parser', () => {
  it('parses one complete text event and returns the exact delivered content', async () => {
    const { content, onDelta } = await parse([
      encoder.encode(`${event({ content: '你好' })}${done}`),
    ]);
    expect(content).toBe('你好');
    expect(onDelta.mock.calls.flat().join('')).toBe(content);
  });

  it('parses multiple events carried by one network chunk', async () => {
    const { content, onDelta } = await parse([
      encoder.encode(`${event({ content: '你好' })}${event({ content: '，世界' })}${done}`),
    ]);
    expect(content).toBe('你好，世界');
    expect(onDelta.mock.calls.flat().join('')).toBe(content);
  });

  it('joins an SSE event split across network chunks', async () => {
    const frame = `${event({ content: 'split' })}${done}`;
    const encoded = encoder.encode(frame);
    const { content, onDelta } = await parse([
      encoded.slice(0, 9),
      encoded.slice(9, 31),
      encoded.slice(31),
    ]);
    expect(content).toBe('split');
    expect(onDelta.mock.calls.flat().join('')).toBe(content);
  });

  it('handles JSON and JSON strings split at arbitrary byte boundaries', async () => {
    const encoded = encoder.encode(`${event({ content: 'arbitrary "JSON" split' })}${done}`);
    const chunks = Array.from({ length: encoded.length }, (_, index) =>
      encoded.slice(index, index + 1),
    );
    const { content, onDelta } = await parse(chunks);
    expect(content).toBe('arbitrary "JSON" split');
    expect(onDelta.mock.calls.flat().join('')).toBe(content);
  });

  it('decodes a Chinese character split inside its UTF-8 sequence', async () => {
    const encoded = encoder.encode(`${event({ content: '简历' })}${done}`);
    const characterOffset = encoded.indexOf(0xe7);
    const { content } = await parse([
      encoded.slice(0, characterOffset + 1),
      encoded.slice(characterOffset + 1),
    ]);
    expect(content).toBe('简历');
  });

  it('decodes an emoji split inside its UTF-8 sequence', async () => {
    const encoded = encoder.encode(`${event({ content: '✨' })}${done}`);
    const characterOffset = encoded.indexOf(0xe2);
    const { content } = await parse([
      encoded.slice(0, characterOffset + 2),
      encoded.slice(characterOffset + 2),
    ]);
    expect(content).toBe('✨');
  });

  it('accepts CRLF and LF event boundaries', async () => {
    const crlf = `data: ${JSON.stringify({ choices: [{ delta: { content: 'CRLF' } }] })}\r\n\r\ndata: [DONE]\r\n\r\n`;
    const lf = `${event({ content: 'LF' })}${done}`;
    await expect(parse([encoder.encode(crlf)])).resolves.toMatchObject({ content: 'CRLF' });
    await expect(parse([encoder.encode(lf)])).resolves.toMatchObject({ content: 'LF' });
  });

  it('ignores comments and keep-alive lines', async () => {
    const { content } = await parse([
      encoder.encode(`: keep-alive\n\n: proxy ping\n${event({ content: 'ready' })}${done}`),
    ]);
    expect(content).toBe('ready');
  });

  it('joins multiple data lines according to SSE rules', async () => {
    const multiline =
      'data: {"choices":[\ndata: {"delta":{"content":"multi"}}]}\n\ndata: [DONE]\n\n';
    await expect(parse([encoder.encode(multiline)])).resolves.toMatchObject({ content: 'multi' });
  });

  it('allows role-only, null, empty, and usage control chunks', async () => {
    const body = [
      `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n\n`,
      event({ content: null }),
      event({ content: '' }),
      `data: ${JSON.stringify({ choices: [], usage: { completion_tokens: 1 } })}\n\n`,
      done,
    ].join('');
    await expect(parse([encoder.encode(body)])).resolves.toMatchObject({ content: '' });
  });

  it('ignores tool-call control data instead of appending it to the resume text', async () => {
    const body =
      `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ function: { arguments: 'danger' } }] } }] })}\n\n` +
      done;
    await expect(parse([encoder.encode(body)])).resolves.toMatchObject({ content: '' });
  });

  it.each([
    [
      'null',
      finishEvent(null, { content: 'Null is an unfinished chunk.' }),
      'Null is an unfinished chunk.',
    ],
    ['stop', finishEvent('stop', { content: 'Complete text.' }), 'Complete text.'],
    ['omitted', event({ content: 'Compatible text.' }), 'Compatible text.'],
  ])('accepts %s finish_reason behavior with a valid [DONE]', async (_label, chunk, content) => {
    await expect(parse([encoder.encode(`${chunk}${done}`)])).resolves.toMatchObject({ content });
  });

  it('accepts stop in a separate empty-delta completion chunk', async () => {
    const body = `${event({ content: 'Complete text.' })}${finishEvent('stop')}${done}`;
    await expect(parse([encoder.encode(body)])).resolves.toMatchObject({
      content: 'Complete text.',
    });
  });

  it('accepts stop alongside the final text delta', async () => {
    const body = `${event({ content: 'Almost ' })}${finishEvent('stop', {
      content: 'complete.',
    })}${done}`;
    await expect(parse([encoder.encode(body)])).resolves.toMatchObject({
      content: 'Almost complete.',
    });
  });

  it('rejects length even when the abnormal completion is followed by [DONE]', async () => {
    await expectCode(
      parse([encoder.encode(`${event({ content: 'partial' })}${finishEvent('length')}${done}`)]),
      'stream_truncated',
    );
  });

  it('rejects length with the final text delta before delivering that delta', async () => {
    const onDelta = vi.fn<(delta: string) => void>();
    const promise = parse(
      [encoder.encode(`${finishEvent('length', { content: 'truncated final text' })}${done}`)],
      onDelta,
    );
    await expectCode(promise, 'stream_truncated');
    expect(onDelta).not.toHaveBeenCalled();
  });

  it('rejects content_filter after partial text instead of returning it', async () => {
    const onDelta = vi.fn<(delta: string) => void>();
    const promise = parse(
      [encoder.encode(`${event({ content: 'partial ' })}${finishEvent('content_filter')}${done}`)],
      onDelta,
    );
    await expectCode(promise, 'stream_filtered');
    expect(onDelta.mock.calls.flat().join('')).toBe('partial ');
  });

  it.each([
    ['tool_calls', 'stream_not_text'],
    ['function_call', 'stream_not_text'],
    ['provider_specific_reason', 'stream_not_text'],
  ])('rejects unsupported finish_reason %s', async (finishReason, code) => {
    await expectCode(parse([encoder.encode(`${finishEvent(finishReason)}${done}`)]), code);
  });

  it.each([5, false, {}, []])('rejects non-string, non-null finish_reason %j', async (value) => {
    await expectCode(parse([encoder.encode(`${finishEvent(value)}${done}`)]), 'stream_invalid');
  });

  it('rejects length after multiple deltas without resolving their accumulated text', async () => {
    const onDelta = vi.fn<(delta: string) => void>();
    const promise = parse(
      [
        encoder.encode(
          `${event({ content: 'first ' })}${event({ content: 'second ' })}${finishEvent('length')}${done}`,
        ),
      ],
      onDelta,
    );
    await expectCode(promise, 'stream_truncated');
    expect(onDelta.mock.calls.flat().join('')).toBe('first second ');
  });

  it('rejects a non-normal reason even if [DONE] is present in the same network chunk', async () => {
    const body = `${event({ content: 'partial' })}${finishEvent('content_filter')}${done}`;
    await expectCode(parse([encoder.encode(body)]), 'stream_filtered');
  });

  it('does not treat stop as successful without the required [DONE] transport marker', async () => {
    await expectCode(
      parse([encoder.encode(`${event({ content: 'finished' })}${finishEvent('stop')}`)]),
      'stream_interrupted',
    );
  });

  it('ignores keep-alive and unrelated control chunks before a normal stop', async () => {
    const body =
      `: keep-alive\n\n${choiceEvent({ delta: { role: 'assistant' }, finish_reason: null })}` +
      `${choiceEvent({ delta: { content: null } })}` +
      `data: ${JSON.stringify({ choices: [], usage: { completion_tokens: 2 } })}\n\n` +
      `${finishEvent('stop', { content: 'valid' })}${done}`;
    await expect(parse([encoder.encode(body)])).resolves.toMatchObject({ content: 'valid' });
  });

  it('does not include resume text in errors for abnormal completion reasons', async () => {
    const privateText = 'private resume content from the model';
    const error = await parse([
      encoder.encode(`${event({ content: privateText })}${finishEvent('length')}${done}`),
    ]).catch((error_: unknown) => error_);
    expect(error).toMatchObject({ code: 'stream_truncated', message: 'stream_truncated' });
    expect(String(error)).not.toContain(privateText);
  });

  it('requires the [DONE] marker even after delivering visible deltas', async () => {
    const onDelta = vi.fn<(delta: string) => void>();
    const promise = parse([encoder.encode(event({ content: 'partial' }))], onDelta);
    await expectCode(promise, 'stream_interrupted');
    expect(onDelta.mock.calls.flat().join('')).toBe('partial');
  });

  it('rejects empty streams and early EOF without treating them as success', async () => {
    await expectCode(parse([]), 'stream_interrupted');
    await expectCode(
      parse([encoder.encode(`${event({ content: 'partial' })}data: [DONE]`)]),
      'stream_interrupted',
    );
  });

  it('rejects invalid JSON and malformed protocol structures', async () => {
    await expectCode(parse([encoder.encode(`data: {invalid}\n\n${done}`)]), 'stream_invalid');
    await expectCode(
      parse([encoder.encode(`data: {"choices":[{"message":{"content":"x"}}]}\n\n${done}`)]),
      'stream_invalid',
    );
    await expectCode(
      parse([encoder.encode(`data: {"choices":[{"delta":{"content":5}}]}\n\n${done}`)]),
      'stream_invalid',
    );
  });

  it('rejects an unknown critical delta structure', async () => {
    await expectCode(
      parse([
        encoder.encode(
          `data: {"choices":[{"delta":{"content":"ok","custom_output":{"text":"hidden"}}}]}\n\n${done}`,
        ),
      ]),
      'stream_invalid',
    );
  });

  it('bounds total response, single-event, and accumulated content sizes', async () => {
    await expectCode(
      readChatCompletionSSE(streamOf([encoder.encode(`${event({ content: 'a' })}${done}`)]), {
        onDelta: vi.fn(),
        maxResponseBytes: 4,
      }),
      'stream_too_large',
    );
    await expectCode(
      readChatCompletionSSE(streamOf([encoder.encode(`${event({ content: 'event' })}${done}`)]), {
        onDelta: vi.fn(),
        maxEventCharacters: 20,
      }),
      'stream_too_large',
    );
    await expectCode(
      readChatCompletionSSE(
        streamOf([encoder.encode(`${event({ content: 'too long' })}${done}`)]),
        {
          onDelta: vi.fn(),
          maxContentCodeUnits: 3,
        },
      ),
      'stream_too_large',
    );
    expect(MAX_STREAM_CONTENT_CODE_UNITS).toBeGreaterThan(30_000);
  });

  it('classifies an incomplete UTF-8 sequence as invalid stream data', async () => {
    const body = new Uint8Array([
      ...encoder.encode('data: {"choices":[{"delta":{"content":"'),
      0xe4,
    ]);
    await expectCode(parse([body]), 'stream_invalid');
  });

  it('cancels immediately and ignores later events in the same network chunk', async () => {
    const abort = new AbortController();
    const onDelta = vi.fn((delta: string) => {
      if (delta === 'first') abort.abort();
    });
    const body = encoder.encode(
      `${event({ content: 'first' })}${event({ content: 'late' })}${done}`,
    );
    const promise = readChatCompletionSSE(streamOf([body]), { onDelta, signal: abort.signal });
    await expectCode(promise, 'cancelled');
    expect(onDelta.mock.calls.flat()).toEqual(['first']);
  });

  it('classifies reader failures as interrupted streams without exposing their text', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('private response text'));
      },
    });
    const error = await readChatCompletionSSE(body, { onDelta: vi.fn() }).catch(
      (error_: unknown) => error_,
    );
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: 'stream_interrupted', message: 'stream_interrupted' });
    expect(String(error)).not.toContain('private response text');
  });
});
