import type { ResumeData } from '@entities/resume';

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export type MarkdownOptions = {
  activeSections?: string[];
  t?: Translator;
};

export type IncludePredicate = (sectionKey: string) => boolean;

export type MarkdownContext = {
  translate: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  inlineSeparator: string;
  extrasSeparator: string;
  colon: string;
  listSeparator: string;
  leftParen: string;
  rightParen: string;
};

export type MarkdownBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
) => string[];
