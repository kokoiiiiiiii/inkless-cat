import type { ResumeData } from '@entities/resume';
import { normalizeExternalUrl } from '@shared/lib/urls';

import { escapeMarkdownText } from '../../formatters';
import type { IncludePredicate, MarkdownContext } from '../types';

export const renderPersonalBlock = (resume: ResumeData, ctx: MarkdownContext): string[] => {
  const { personal } = resume;
  const nameFallback = ctx.translate('exporter.markdown.nameFallback', 'Name');
  const lines: string[] = [`# ${escapeMarkdownText(personal.fullName || nameFallback)}`];
  if (personal.title) {
    lines.push(`**${escapeMarkdownText(personal.title)}**`);
  }
  lines.push('');

  const contact = [personal.email, personal.phone, personal.location]
    .map((item) => (item ? escapeMarkdownText(item) : item))
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
      return label
        ? `${escapeMarkdownText(label)}${ctx.colon}${escapeMarkdownText(value)}`
        : escapeMarkdownText(value);
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
  return [`## ${escapeMarkdownText(heading)}`, escapeMarkdownText(summary)];
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
  const lines = [`## ${escapeMarkdownText(heading)}`];
  for (const social of resume.socials) {
    const label = escapeMarkdownText(social.label || labelFallback);
    const safeUrl = normalizeExternalUrl(social.url);
    const visibleUrl = escapeMarkdownText(safeUrl ?? social.url ?? '');
    lines.push(`- ${label}${ctx.colon}${visibleUrl}`.trimEnd());
  }
  return lines;
};
