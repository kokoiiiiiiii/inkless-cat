import { describe, expect, it } from 'vitest';

import { diffText } from './diffText';

describe('diffText', () => {
  it('marks real insertions and deletions without splitting graphemes', () => {
    expect(diffText('你好 👩‍💻', '你好啊 👩‍💻')).toEqual([
      { kind: 'same', text: '你好' },
      { kind: 'insert', text: '啊' },
      { kind: 'same', text: ' 👩‍💻' },
    ]);
    expect(diffText('cafe\u0301', 'café')).toEqual([{ kind: 'same', text: 'café' }]);
  });

  it('handles empty, identical, whitespace and line changes', () => {
    expect(diffText('', 'x')).toEqual([{ kind: 'insert', text: 'x' }]);
    expect(diffText('same', 'same')).toEqual([{ kind: 'same', text: 'same' }]);
    expect(diffText('a\n b', 'a\tb')).toContainEqual({ kind: 'delete', text: '\n ' });
  });

  it('bounds large comparisons with an explicit whole-text replacement', () => {
    const parts = diffText('a'.repeat(1200), 'b'.repeat(1200));
    expect(parts).toEqual([
      { kind: 'delete', text: 'a'.repeat(1200) },
      { kind: 'insert', text: 'b'.repeat(1200) },
    ]);
  });
});
