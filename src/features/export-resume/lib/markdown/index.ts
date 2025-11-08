import type { ResumeData } from '@entities/resume';

import { renderCustomSections } from './blocks/custom';
import { renderPersonalBlock, renderSocialsBlock, renderSummaryBlock } from './blocks/personal';
import {
  renderAwardsBlock,
  renderEducationBlock,
  renderExperienceBlock,
  renderInterestsBlock,
  renderLanguagesBlock,
  renderProjectsBlock,
  renderSkillsBlock,
} from './blocks/sections';
import { createContext, createIncludePredicate, normalizeBlocks } from './context';
import type { MarkdownOptions } from './types';

export type { MarkdownOptions } from './types';

export const resumeToMarkdown = (resume: ResumeData, options: MarkdownOptions = {}): string => {
  const includeSection = createIncludePredicate(options.activeSections);
  const ctx = createContext(options.t);

  const blocks = [
    renderPersonalBlock(resume, ctx),
    renderSummaryBlock(resume, includeSection, ctx),
    renderSocialsBlock(resume, includeSection, ctx),
    renderExperienceBlock(resume, includeSection, ctx),
    renderProjectsBlock(resume, includeSection, ctx),
    renderEducationBlock(resume, includeSection, ctx),
    renderSkillsBlock(resume, includeSection, ctx),
    renderLanguagesBlock(resume, includeSection, ctx),
    renderInterestsBlock(resume, includeSection, ctx),
    renderAwardsBlock(resume, includeSection, ctx),
    renderCustomSections(resume, includeSection, ctx),
  ];

  return normalizeBlocks(blocks).join('\n').trim();
};
