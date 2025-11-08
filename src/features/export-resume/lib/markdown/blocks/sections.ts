import type { ResumeData } from '@entities/resume';

import { formatDateRange, formatList } from '../../formatters';
import type { IncludePredicate, MarkdownContext } from '../types';

export const renderExperienceBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('experience') || !resume.experience?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.workHeading', 'Work Experience');
  const lines = [`## ${heading}`];
  for (const exp of resume.experience) {
    const header = [exp.company, exp.role, exp.location].filter(Boolean).join(ctx.inlineSeparator);
    const dateRange = formatDateRange(exp.startDate, exp.endDate);
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
  const lines = [`## ${heading}`];
  for (const project of resume.projects) {
    const roleSuffix = project.role ? `${ctx.inlineSeparator}${project.role}` : '';
    lines.push(`### ${project.name || projectNameFallback}${roleSuffix}`);
    if (project.summary) {
      lines.push(project.summary);
    }
    if (project.link) {
      lines.push(`[${projectLinkLabel}](${project.link})`);
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
  const lines = [`## ${heading}`];
  for (const edu of resume.education) {
    const dateRange = formatDateRange(edu.startDate, edu.endDate);
    const base = `- **${edu.school || schoolFallback}** ${ctx.inlineSeparator} ${
      edu.degree || degreeFallback
    }`.trim();
    lines.push(dateRange ? `${base} ${ctx.leftParen}${dateRange}${ctx.rightParen}` : base);

    if (edu.details) {
      lines.push(`  - ${edu.details}`);
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
  const lines = [`## ${heading}`];
  for (const skill of resume.skills) {
    const content = (skill.items || [])
      .map((item) => (item ? item.trim() : ''))
      .filter(Boolean)
      .join(ctx.listSeparator);
    lines.push(`- **${skill.title || skillFallback}**${ctx.colon}${content}`);
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
  const lines = [`## ${heading}`];
  for (const lang of resume.languages) {
    const name = lang.name || nameFallback;
    const level = lang.level || levelFallback;
    lines.push(`- ${name} ${ctx.leftParen}${level}${ctx.rightParen}`);
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
    .filter(Boolean)
    .join(ctx.inlineSeparator);
  if (!interests) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.interestsHeading', 'Interests');
  return [`## ${heading}`, interests];
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
  const lines = [`## ${heading}`];
  for (const award of resume.awards) {
    const suffix = [award.issuer, award.year].filter(Boolean).join(' · ');
    const name = award.name || awardFallback;
    lines.push(suffix ? `- ${name} ${ctx.leftParen}${suffix}${ctx.rightParen}` : `- ${name}`);
  }
  return lines;
};
