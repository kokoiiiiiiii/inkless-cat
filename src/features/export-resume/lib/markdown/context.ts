import type { IncludePredicate, MarkdownContext, Translator } from './types';

const normalizeLines = (lines: string[]): string[] => {
  const normalized = [...lines];
  while (normalized.length > 0 && normalized.at(-1) === '') {
    normalized.pop();
  }
  if (normalized.length === 0) {
    return normalized;
  }
  normalized.push('');
  return normalized;
};

export const normalizeBlocks = (blocks: string[][]): string[] =>
  blocks.filter((block) => block.length > 0).flatMap((block) => normalizeLines(block));

export const createIncludePredicate = (activeSections?: string[]): IncludePredicate => {
  if (!Array.isArray(activeSections)) {
    return () => true;
  }
  const allowed = new Set(activeSections);
  return (sectionKey) => allowed.has(sectionKey);
};

const createTranslate = (t?: Translator) => {
  return (key: string, fallback: string, vars?: Record<string, string | number>) => {
    if (!t) return fallback;
    const value = t(key, vars);
    return value && value !== key ? value : fallback;
  };
};

export const createContext = (t?: Translator): MarkdownContext => {
  const translate = createTranslate(t);
  return {
    translate,
    inlineSeparator: translate('exporter.markdown.inlineSeparator', ' ｜ '),
    extrasSeparator: translate('exporter.markdown.extrasSeparator', ' ｜ '),
    colon: translate('exporter.markdown.colon', '：'),
    listSeparator: translate('exporter.markdown.listSeparator', '，'),
    leftParen: translate('exporter.markdown.parentheses.left', '（'),
    rightParen: translate('exporter.markdown.parentheses.right', '）'),
  };
};
