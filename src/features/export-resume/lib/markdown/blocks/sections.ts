import type { ResumeData } from '@entities/resume';
import { normalizeExternalUrl } from '@shared/lib/urls';

import { escapeMarkdownText, formatDateRange, formatList } from '../../formatters';
import type { IncludePredicate, MarkdownContext } from '../types';

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

export const renderExperienceBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('experience') || !resume.experience?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.workHeading', 'Work Experience');
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const exp of resume.experience) {
    const header = [exp.company, exp.role, exp.location]
      .filter((value) => isNonEmptyString(value))
      .map((value) => escapeMarkdownText(value))
      .join(ctx.inlineSeparator);
    const dateRange = escapeMarkdownText(formatDateRange(exp.startDate, exp.endDate));
    const title = header ? `### ${header}` : `### ${heading}`;
    lines.push(dateRange ? `${title}${ctx.leftParen}${dateRange}${ctx.rightParen}` : title);
    if (exp.highlights?.length) {
      lines.push(formatList(exp.highlights));
    }
    lines.push('');
  }
  return lines;
};

export const renderProjectsBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('projects') || !resume.projects?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.projectsHeading', 'Projects');
  const projectNameFallback = ctx.translate('exporter.markdown.projectNameFallback', 'Project');
  const projectLinkLabel = ctx.translate('exporter.markdown.projectLinkLabel', 'Project Link');
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const project of resume.projects) {
    const roleSuffix = project.role
      ? `${ctx.inlineSeparator}${escapeMarkdownText(project.role)}`
      : '';
    lines.push(`### ${escapeMarkdownText(project.name || projectNameFallback)}${roleSuffix}`);
    if (project.summary) {
      lines.push(escapeMarkdownText(project.summary));
    }
    const projectUrl = normalizeExternalUrl(project.link);
    if (projectUrl) {
      lines.push(`[${escapeMarkdownText(projectLinkLabel)}](<${projectUrl}>)`);
    }
    if (project.highlights.length > 0) {
      lines.push(formatList(project.highlights));
    }
    lines.push('');
  }
  return lines;
};

export const renderEducationBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('education') || !resume.education?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.educationHeading', 'Education');
  const schoolFallback = ctx.translate('exporter.markdown.schoolFallback', 'School');
  const degreeFallback = ctx.translate('exporter.markdown.degreeFallback', 'Degree');
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const edu of resume.education) {
    const dateRange = formatDateRange(edu.startDate, edu.endDate);
    const base =
      `- **${escapeMarkdownText(edu.school || schoolFallback)}** ${ctx.inlineSeparator} ${escapeMarkdownText(
        edu.degree || degreeFallback,
      )}`.trim();
    lines.push(
      dateRange
        ? `${base} ${ctx.leftParen}${escapeMarkdownText(dateRange)}${ctx.rightParen}`
        : base,
    );

    if (edu.details) {
      lines.push(`  - ${escapeMarkdownText(edu.details)}`);
    }
    lines.push('');
  }
  return lines;
};

export const renderSkillsBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('skills') || !resume.skills?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.skillsHeading', 'Skills');
  const skillFallback = ctx.translate('exporter.markdown.skillTitleFallback', 'Skill');
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const skill of resume.skills) {
    const content = (skill.items || [])
      .map((item) => (item ? item.trim() : ''))
      .filter(Boolean)
      .join(ctx.listSeparator);
    lines.push(
      `- **${escapeMarkdownText(skill.title || skillFallback)}**${ctx.colon}${escapeMarkdownText(content)}`,
    );
  }
  return lines;
};

export const renderLanguagesBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('languages') || !resume.languages?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.languagesHeading', 'Languages');
  const levelFallback = ctx.translate('exporter.markdown.languageLevelFallback', 'Proficiency');
  const nameFallback = ctx.translate('exporter.markdown.languageNameFallback', 'Language');
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const lang of resume.languages) {
    const name = lang.name || nameFallback;
    const level = lang.level || levelFallback;
    lines.push(
      `- ${escapeMarkdownText(name)} ${ctx.leftParen}${escapeMarkdownText(level)}${ctx.rightParen}`,
    );
  }
  return lines;
};

export const renderInterestsBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('interests') || !resume.interests?.length) {
    return [];
  }
  const interests = resume.interests
    .map((interest) => interest.name)
    .filter((interest) => isNonEmptyString(interest))
    .map((interest) => escapeMarkdownText(interest))
    .join(ctx.inlineSeparator);
  if (!interests) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.interestsHeading', 'Interests');
  return [`## ${escapeMarkdownText(heading)}`, interests];
};

export const renderAwardsBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('awards') || !resume.awards?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.awardsHeading', 'Awards');
  const awardFallback = ctx.translate('exporter.markdown.awardNameFallback', 'Award');
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const award of resume.awards) {
    const suffix = [award.issuer, award.year]
      .filter((value) => isNonEmptyString(value))
      .map((value) => escapeMarkdownText(value))
      .join(' · ');
    const name = escapeMarkdownText(award.name || awardFallback);
    lines.push(suffix ? `- ${name} ${ctx.leftParen}${suffix}${ctx.rightParen}` : `- ${name}`);
  }
  return lines;
};
