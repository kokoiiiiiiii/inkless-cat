import { getCustomSectionKey } from '@entities/module';
import type { ResumeCustomSection, ResumeData } from '@entities/resume';

import { formatDateRange, formatList, normalizeField } from './formatters';

type MarkdownOptions = {
  activeSections?: string[];
};

type IncludePredicate = (sectionKey: string) => boolean;

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

const createIncludePredicate = (activeSections?: string[]): IncludePredicate => {
  if (!Array.isArray(activeSections)) {
    return () => true;
  }
  const allowed = new Set(activeSections);
  return (sectionKey) => allowed.has(sectionKey);
};

const renderPersonalBlock = (resume: ResumeData): string[] => {
  const { personal } = resume;
  const lines: string[] = [`# ${personal.fullName || '姓名'}`];
  if (personal.title) {
    lines.push(`**${personal.title}**`);
  }
  lines.push('');

  const contact = [personal.email, personal.phone, personal.location].filter(Boolean).join(' ｜ ');
  if (contact) {
    lines.push(contact, '');
  }

  const extras = (personal.extras || [])
    .map((item) => {
      const label = typeof item?.label === 'string' ? item.label.trim() : '';
      const value = typeof item?.value === 'string' ? item.value.trim() : '';
      if (!label && !value) return '';
      return label ? `${label}：${value}` : value;
    })
    .filter(Boolean);

  if (extras.length > 0) {
    lines.push(extras.join(' ｜ '), '');
  }

  return lines;
};

const renderSummaryBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('summary')) {
    return [];
  }
  const summary = resume.personal.summary;
  if (!summary) {
    return [];
  }
  return ['## 个人简介', summary];
};

const renderSocialsBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('socials') || !resume.socials?.length) {
    return [];
  }
  const lines = ['## 社交与链接'];
  for (const social of resume.socials) {
    lines.push(`- ${social.label || '平台'}：${social.url || ''}`);
  }
  return lines;
};

const renderExperienceBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('experience') || !resume.experience?.length) {
    return [];
  }
  const lines = ['## 工作经历'];
  for (const exp of resume.experience) {
    const header = [exp.company, exp.role, exp.location].filter(Boolean).join(' ｜ ');
    const dateRange = formatDateRange(exp.startDate, exp.endDate);
    const title = header ? `### ${header}` : '### 工作经历';
    lines.push(dateRange ? `${title}（${dateRange}）` : title);
    if (exp.highlights?.length) {
      lines.push(formatList(exp.highlights));
    }
    lines.push('');
  }
  return lines;
};

const renderProjectsBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('projects') || !resume.projects?.length) {
    return [];
  }
  const lines = ['## 项目经历'];
  for (const project of resume.projects) {
    const roleSuffix = project.role ? ` ｜ ${project.role}` : '';
    lines.push(`### ${project.name || '项目名称'}${roleSuffix}`);
    if (project.summary) {
      lines.push(project.summary);
    }
    if (project.link) {
      lines.push(`[项目链接](${project.link})`);
    }
    lines.push('');
  }
  return lines;
};

const renderEducationBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('education') || !resume.education?.length) {
    return [];
  }
  const lines = ['## 教育背景'];
  for (const edu of resume.education) {
    const dateRange = formatDateRange(edu.startDate, edu.endDate);
    const base = `- **${edu.school || '学校'}** ｜ ${edu.degree || ''}`;
    lines.push(dateRange ? `${base} ${dateRange}` : base);
    if (edu.details) {
      lines.push(`  - ${edu.details}`);
    }
  }
  return lines;
};

const renderSkillsBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('skills') || !resume.skills?.length) {
    return [];
  }
  const lines = ['## 技能特长'];
  for (const skill of resume.skills) {
    const content = (skill.items || [])
      .map((item) => (item ? item.trim() : ''))
      .filter(Boolean)
      .join('，');
    lines.push(`- **${skill.title || '技能方向'}**：${content}`);
  }
  return lines;
};

const renderLanguagesBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('languages') || !resume.languages?.length) {
    return [];
  }
  const lines = ['## 语言'];
  for (const lang of resume.languages) {
    lines.push(`- ${lang.name}（${lang.level || '水平'}）`);
  }
  return lines;
};

const renderInterestsBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('interests') || !resume.interests?.length) {
    return [];
  }
  const interests = resume.interests
    .map((interest) => interest.name)
    .filter(Boolean)
    .join(' ｜ ');
  if (!interests) {
    return [];
  }
  return ['## 兴趣', interests];
};

const renderAwardsBlock = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
  if (!includeSection('awards') || !resume.awards?.length) {
    return [];
  }
  const lines = ['## 荣誉奖项'];
  for (const award of resume.awards) {
    const suffix = [award.issuer, award.year].filter(Boolean).join(' · ');
    lines.push(`- ${award.name}${suffix ? `（${suffix}）` : ''}`);
  }
  return lines;
};

const renderCustomSectionContent = (section: ResumeCustomSection): string[] => {
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
        return `- **${field.label}**：${field.value}`;
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

const renderCustomSections = (resume: ResumeData, includeSection: IncludePredicate): string[] => {
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
    lines.push(`## ${section.title || '自定义模块'}`);
    const content = renderCustomSectionContent(section);
    if (content.length > 0) {
      lines.push(...content);
    }
    lines.push('');
  }
  return lines;
};

export const resumeToMarkdown = (resume: ResumeData, options: MarkdownOptions = {}): string => {
  const includeSection = createIncludePredicate(options.activeSections);

  const blocks = [
    renderPersonalBlock(resume),
    renderSummaryBlock(resume, includeSection),
    renderSocialsBlock(resume, includeSection),
    renderExperienceBlock(resume, includeSection),
    renderProjectsBlock(resume, includeSection),
    renderEducationBlock(resume, includeSection),
    renderSkillsBlock(resume, includeSection),
    renderLanguagesBlock(resume, includeSection),
    renderInterestsBlock(resume, includeSection),
    renderAwardsBlock(resume, includeSection),
    renderCustomSections(resume, includeSection),
  ];

  const lines = blocks
    .filter((block) => block.length > 0)
    .flatMap((block) => normalizeLines(block));

  return lines.join('\n').trim();
};
