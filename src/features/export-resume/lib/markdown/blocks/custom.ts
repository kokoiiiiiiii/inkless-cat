import { getCustomSectionKey } from '@entities/module';
import type { ResumeCustomSection, ResumeData } from '@entities/resume';

import { formatList, normalizeField } from '../../formatters';
import type { IncludePredicate, MarkdownContext } from '../types';

const renderCustomSectionContent = (
  section: ResumeCustomSection,
  ctx: MarkdownContext,
): string[] => {
  const mode = section.mode || 'list';
  if (mode === 'fields') {
    const fields = (section.fields || [])
      .map((field) => normalizeField(field))
      .filter((field) => field.label || field.value);
    if (fields.length === 0) {
      return [];
    }
    return fields.map((field) => {
      if (field.label && field.value) {
        return `- **${field.label}**${ctx.colon}${field.value}`;
      }
      if (field.label) {
        return `- **${field.label}**`;
      }
      return `- ${field.value}`;
    });
  }

  if (mode === 'text') {
    const text = typeof section.text === 'string' ? section.text.trim() : '';
    return text ? [text] : [];
  }

  if (Array.isArray(section.items) && section.items.length > 0) {
    return [formatList(section.items)];
  }

  return [];
};

export const renderCustomSections = (
  resume: ResumeData,
  includeSection: IncludePredicate,
  ctx: MarkdownContext,
): string[] => {
  const sections: ResumeCustomSection[] = Array.isArray(resume.customSections)
    ? resume.customSections
    : [];
  if (sections.length === 0) {
    return [];
  }

  const lines: string[] = [];
  for (const section of sections) {
    const key = getCustomSectionKey(section.id);
    if (!includeSection(key)) {
      continue;
    }
    const fallback = ctx.translate('exporter.markdown.customHeadingFallback', 'Custom Module');
    lines.push(`## ${section.title || fallback}`);
    const content = renderCustomSectionContent(section, ctx);
    if (content.length > 0) {
      lines.push(...content);
    }
    lines.push('');
  }
  return lines;
};
