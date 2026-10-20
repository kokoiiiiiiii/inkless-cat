import {
  extractCustomSectionId,
  getCustomSectionKey,
  isCustomSectionKey,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
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
import type { IncludePredicate, MarkdownContext, MarkdownOptions } from './types';

export type { MarkdownOptions } from './types';

type StandardSectionRenderer = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
) => string[];

const standardSectionRenderers: Record<StandardSectionKey, StandardSectionRenderer> = {
  socials: renderSocialsBlock,
  experience: renderExperienceBlock,
  education: renderEducationBlock,
  projects: renderProjectsBlock,
  skills: renderSkillsBlock,
  languages: renderLanguagesBlock,
  interests: renderInterestsBlock,
  awards: renderAwardsBlock,
};

const isStandardSectionKey = (value: string): value is StandardSectionKey =>
  sectionOrder.includes(value as StandardSectionKey);

export const resumeToMarkdown = (resume: ResumeData, options: MarkdownOptions = {}): string => {
  const includeSection = createIncludePredicate(options.activeSections);
  const ctx = createContext(options.t);
  const sectionsToRender = Array.isArray(options.activeSections)
    ? options.activeSections
    : [
        ...sectionOrder,
        ...(resume.customSections ?? []).map((section) => getCustomSectionKey(section.id)),
      ];

  const orderedSectionBlocks = sectionsToRender.flatMap((key) => {
    if (isStandardSectionKey(key)) {
      return [standardSectionRenderers[key](resume, includeSection, ctx)];
    }
    if (!isCustomSectionKey(key)) return [];

    const sectionId = extractCustomSectionId(key);
    if (!sectionId || !resume.customSections.some((section) => section.id === sectionId)) return [];
    return [renderCustomSections(resume, (candidate) => candidate === key, ctx)];
  });

  const blocks = [
    renderPersonalBlock(resume, ctx),
    renderSummaryBlock(resume, () => true, ctx),
    ...orderedSectionBlocks,
  ];

  return normalizeBlocks(blocks).join('\n').trim();
};
