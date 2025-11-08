import type { ResumeData } from '@entities/resume';

import type { IncludePredicate, MarkdownContext } from '../types';

export const renderPersonalBlock = (resume: ResumeData, ctx: MarkdownContext): string[] => {
  const { personal } = resume;
  const nameFallback = ctx.translate('exporter.markdown.nameFallback', 'Name');
  const lines: string[] = [`# ${personal.fullName || nameFallback}`];
  if (personal.title) {
    lines.push(`**${personal.title}**`);
  }
  lines.push('');

  const contact = [personal.email, personal.phone, personal.location]
    .filter(Boolean)
    .join(ctx.inlineSeparator);
  if (contact) {
    lines.push(contact, '');
  }

  const extras = (personal.extras || [])
    .map((item) => {
      const label = typeof item?.label === 'string' ? item.label.trim() : '';
      const value = typeof item?.value === 'string' ? item.value.trim() : '';
      if (!label && !value) return '';
      return label ? `${label}${ctx.colon}${value}` : value;
    })
    .filter(Boolean);

  if (extras.length > 0) {
    lines.push(extras.join(ctx.extrasSeparator), '');
  }

  return lines;
};

export const renderSummaryBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('summary')) {
    return [];
  }
  const summary = resume.personal.summary;
  if (!summary) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.summaryHeading', 'Summary');
  return [`## ${heading}`, summary];
};

export const renderSocialsBlock = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  if (!includeSection('socials') || !resume.socials?.length) {
    return [];
  }
  const heading = ctx.translate('exporter.markdown.socialsHeading', 'Socials & Links');
  const labelFallback = ctx.translate('exporter.markdown.socialsLabelFallback', 'Platform');
  const lines = [`## ${heading}`];
  for (const social of resume.socials) {
    lines.push(`- ${social.label || labelFallback}${ctx.colon}${social.url || ''}`.trimEnd());
  }
  return lines;
};
