import { MAX_RESUME_TEXT_LENGTH } from '@shared/lib/limits';

import type { AIEnhancementFieldValue, AIEnhancementTarget } from '../model/types';

export type EnhancementValidationError =
  | 'invalid_response'
  | 'empty_output'
  | 'response_too_long'
  | 'invalid_control_characters'
  | 'code_fence'
  | 'invalid_highlights'
  | 'item_count_mismatch'
  | 'item_too_long';

export type EnhancementValidationResult =
  | { ok: true; value: AIEnhancementFieldValue }
  | { ok: false; error: EnhancementValidationError };

const forbiddenControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const hasCodeFence = (value: string) => value.includes('```');

const validateText = (
  value: string,
  allowLineBreaks: boolean,
): EnhancementValidationError | null => {
  if (!value.trim()) return 'empty_output';
  if (value.length > MAX_RESUME_TEXT_LENGTH) return 'response_too_long';
  if (forbiddenControlCharacters.test(value)) return 'invalid_control_characters';
  if (!allowLineBreaks && /[\r\n]/u.test(value)) return 'invalid_highlights';
  return null;
};

export const validateEnhancementResult = (
  response: unknown,
  target: AIEnhancementTarget,
  source: AIEnhancementFieldValue,
): EnhancementValidationResult => {
  if (typeof response !== 'string') return { ok: false, error: 'invalid_response' };
  if (!response.trim()) return { ok: false, error: 'empty_output' };
  if (hasCodeFence(response)) return { ok: false, error: 'code_fence' };

  if (target.kind !== 'experience-highlights') {
    const textError = validateText(response, true);
    return textError ? { ok: false, error: textError } : { ok: true, value: response };
  }

  if (!Array.isArray(source)) return { ok: false, error: 'invalid_highlights' };
  const maximumResponseLength =
    MAX_RESUME_TEXT_LENGTH * Math.max(1, source.length) + source.length * 16 + 4096;
  if (response.length > maximumResponseLength) {
    return { ok: false, error: 'response_too_long' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    return { ok: false, error: 'invalid_highlights' };
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.keys(parsed).length !== 1 ||
    !('items' in parsed) ||
    !Array.isArray((parsed as { items?: unknown }).items)
  ) {
    return { ok: false, error: 'invalid_highlights' };
  }

  const items = (parsed as { items: unknown[] }).items;
  if (items.length !== source.length) return { ok: false, error: 'item_count_mismatch' };
  const validatedItems: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') return { ok: false, error: 'invalid_highlights' };
    const textError = validateText(item, false);
    if (textError === 'response_too_long') return { ok: false, error: 'item_too_long' };
    if (textError) return { ok: false, error: textError };
    validatedItems.push(item);
  }
  return { ok: true, value: validatedItems };
};

export const validateEditedCandidate = (
  candidate: unknown,
  target: AIEnhancementTarget,
  source: AIEnhancementFieldValue,
): EnhancementValidationResult => {
  if (target.kind !== 'experience-highlights') {
    if (typeof candidate !== 'string') return { ok: false, error: 'invalid_response' };
    if (hasCodeFence(candidate)) return { ok: false, error: 'code_fence' };
    const textError = validateText(candidate, true);
    return textError ? { ok: false, error: textError } : { ok: true, value: candidate };
  }

  if (typeof candidate !== 'string' || !Array.isArray(source)) {
    return { ok: false, error: 'invalid_response' };
  }
  if (hasCodeFence(candidate)) return { ok: false, error: 'code_fence' };
  const items = candidate.split(/\r?\n/u);
  if (items.length !== source.length) return { ok: false, error: 'item_count_mismatch' };
  for (const item of items) {
    const textError = validateText(item, false);
    if (textError === 'response_too_long') return { ok: false, error: 'item_too_long' };
    if (textError) return { ok: false, error: textError };
  }
  return { ok: true, value: items };
};
