import type { AIEnhancementFieldValue } from '../model/types';

/** Maximum source size, measured in JavaScript UTF-16 code units. */
export const AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS = 12_000;

/** Highlights are counted as they are serialized into the request's JSON content. */
export const measureEnhancementInputCodeUnits = (source: AIEnhancementFieldValue): number =>
  Array.isArray(source) ? JSON.stringify({ items: source }).length : source.length;
