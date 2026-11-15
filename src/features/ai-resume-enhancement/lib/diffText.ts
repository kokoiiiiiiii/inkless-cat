export type TextDiffPart = { kind: 'same' | 'insert' | 'delete'; text: string };

const graphemes = (text: string): string[] => {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map(({ segment }) => segment);
  }
  return [...text];
};

/** Grapheme-safe LCS with a bounded matrix; very large inputs degrade to a clear replace. */
export const diffText = (original: string, suggestion: string): TextDiffPart[] => {
  const left = graphemes(original);
  const right = graphemes(suggestion);
  const leftKeys = left.map((part) => part.normalize('NFC'));
  const rightKeys = right.map((part) => part.normalize('NFC'));
  if (leftKeys.join('') === rightKeys.join('')) return [{ kind: 'same', text: original }];
  if ((left.length + 1) * (right.length + 1) > 1_000_000) {
    return [
      ...(original ? [{ kind: 'delete' as const, text: original }] : []),
      ...(suggestion ? [{ kind: 'insert' as const, text: suggestion }] : []),
    ];
  }
  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint32Array(cols));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      dp[i]![j] =
        leftKeys[i] === rightKeys[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const parts: TextDiffPart[] = [];
  const push = (kind: TextDiffPart['kind'], text: string) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && leftKeys[i] === rightKeys[j]) {
      push('same', left[i]!);
      i++;
      j++;
    } else if (j < right.length && (i === left.length || dp[i]![j + 1]! >= dp[i + 1]![j]!))
      push('insert', right[j++]!);
    else push('delete', left[i++]!);
  }
  return parts;
};
