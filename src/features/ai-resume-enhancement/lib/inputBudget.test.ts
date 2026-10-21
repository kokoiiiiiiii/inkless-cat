import { describe, expect, it } from 'vitest';

import type { AIEnhancementFieldValue } from '../model/types';
import {
  AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS,
  measureEnhancementInputCodeUnits,
} from './inputBudget';

describe('AI enhancement input budget', () => {
  it('measures empty and ordinary text in JavaScript UTF-16 code units', () => {
    expect(measureEnhancementInputCodeUnits('')).toBe(0);
    expect(measureEnhancementInputCodeUnits('Backend developer')).toBe(17);
    expect(measureEnhancementInputCodeUnits('中文简历')).toBe(4);
    expect(measureEnhancementInputCodeUnits('😀')).toBe(2);
    expect(measureEnhancementInputCodeUnits('a"b')).toBe(3);
  });

  it('accepts the exact text budget and measures one code unit over it', () => {
    expect(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS).toBe(12_000);
    expect(
      measureEnhancementInputCodeUnits('x'.repeat(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS)),
    ).toBe(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS);
    expect(
      measureEnhancementInputCodeUnits(
        'x'.repeat(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS + 1),
      ),
    ).toBe(AI_ENHANCEMENT_INPUT_BUDGET_UTF16_CODE_UNITS + 1);
  });

  it('counts every Highlights entry and its JSON serialization overhead', () => {
    const highlights = ['Builds APIs', '使用 Redis'] satisfies AIEnhancementFieldValue;
    expect(measureEnhancementInputCodeUnits(highlights)).toBe(
      JSON.stringify({ items: highlights }).length,
    );
    expect(measureEnhancementInputCodeUnits(highlights)).toBeGreaterThan(
      highlights.reduce((total, item) => total + item.length, 0),
    );
  });

  it('counts JSON escaping for quotes and backslashes in Highlights', () => {
    const highlights = ['a"b', String.raw`c\d`];
    expect(measureEnhancementInputCodeUnits(highlights)).toBe(
      JSON.stringify({ items: highlights }).length,
    );
    expect(measureEnhancementInputCodeUnits(highlights)).toBeGreaterThan(
      highlights.reduce((total, item) => total + item.length, 0),
    );
  });
});
