import { describe, expect, it } from 'vitest';

import { validateEditedCandidate, validateEnhancementResult } from './validateEnhancementResult';

describe('validateEnhancementResult', () => {
  it('accepts plain text and rejects empty, over-limit, control, and fenced responses', () => {
    const target = { kind: 'personal-summary' } as const;

    expect(validateEnhancementResult('Clear, factual summary.', target, 'Original')).toEqual({
      ok: true,
      value: 'Clear, factual summary.',
    });
    expect(validateEnhancementResult(' \n ', target, 'Original')).toMatchObject({
      ok: false,
      error: 'empty_output',
    });
    expect(validateEnhancementResult('```text\nsummary\n```', target, 'Original')).toMatchObject({
      ok: false,
      error: 'code_fence',
    });
    expect(validateEnhancementResult('invalid\u0000text', target, 'Original')).toMatchObject({
      ok: false,
      error: 'invalid_control_characters',
    });
    expect(validateEnhancementResult('x'.repeat(30_001), target, 'Original')).toMatchObject({
      ok: false,
      error: 'response_too_long',
    });
    expect(validateEnhancementResult({ text: 'wrong type' }, target, 'Original')).toMatchObject({
      ok: false,
    });
  });

  it('requires a strict highlights object with the exact original number of single-line items', () => {
    const target = { kind: 'experience-highlights', itemId: 'exp-1' } as const;
    const source = ['first', 'second'];

    expect(
      validateEnhancementResult(
        JSON.stringify({ items: ['Edited first', 'Edited second'] }),
        target,
        source,
      ),
    ).toEqual({ ok: true, value: ['Edited first', 'Edited second'] });
    expect(
      validateEnhancementResult(JSON.stringify({ items: ['Only one'] }), target, source),
    ).toMatchObject({ ok: false, error: 'item_count_mismatch' });
    expect(
      validateEnhancementResult(
        JSON.stringify({ items: ['one', 'two'], extra: 'field' }),
        target,
        source,
      ),
    ).toMatchObject({ ok: false, error: 'invalid_highlights' });
    expect(validateEnhancementResult('one\ntwo', target, source)).toMatchObject({
      ok: false,
      error: 'invalid_highlights',
    });
    expect(
      validateEnhancementResult(JSON.stringify({ items: ['one\ntwo', 'second'] }), target, source),
    ).toMatchObject({ ok: false, error: 'invalid_highlights' });
  });

  it('keeps manual edits within the existing field type and item count', () => {
    const target = { kind: 'experience-highlights', itemId: 'exp-1' } as const;
    expect(validateEditedCandidate('first\nsecond', target, ['a', 'b'])).toEqual({
      ok: true,
      value: ['first', 'second'],
    });
    expect(validateEditedCandidate('only one', target, ['a', 'b'])).toMatchObject({
      ok: false,
      error: 'item_count_mismatch',
    });
  });
});
