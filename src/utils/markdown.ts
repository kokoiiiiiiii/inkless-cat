import { getCustomSectionKey } from '../data/sections';
import type { ResumeCustomSection, ResumeData } from '../types/resume';

const formatList = (items: string[] = []): string =>
  items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join('\n');

const formatDateRange = (start?: string, end?: string): string => {
  if (!start && !end) return '';
  if (start && end) return `${start} — ${end}`;
  return start || end || '';
};

type MarkdownOptions = {
  activeSections?: string[];
};

export const resumeToMarkdown = (resume: ResumeData, options: MarkdownOptions = {}): string => {
  const lines: string[] = [];
  const { personal } = resume;
  const { activeSections } = options;

  const includeSection = (sectionKey: string): boolean =>
    !Array.isArray(activeSections) || activeSections.includes(sectionKey);

  lines.push(`# ${personal.fullName || '姓名'}`);
  if (personal.title) {
    lines.push(`**${personal.title}**`);
  }
  lines.push('');

  const contact = [personal.email, personal.phone, personal.location]
    .filter(Boolean)
    .join(' ｜ ');
  if (contact) {
    lines.push(contact);
    lines.push('');
  }

  if (personal.summary) {
    lines.push('## 个人简介');
    lines.push(personal.summary);
    lines.push('');
  }

  if (includeSection('socials') && resume.socials?.length) {
    lines.push('## 社交与链接');
    resume.socials.forEach((item) => {
      const label = item.label || item.url;
      if (!label) return;
      if (item.url) {
        lines.push(`- [${label}](${item.url})`);
      } else {
        lines.push(`- ${label}`);
      }
    });
    lines.push('');
  }

  if (includeSection('experience') && resume.experience?.length) {
    lines.push('## 工作经历');
    resume.experience.forEach((exp) => {
      lines.push(
        `### ${exp.role || '职位'} ｜ ${exp.company || ''} ${formatDateRange(exp.startDate, exp.endDate)}`,
      );
      if (exp.location) {
        lines.push(`*地点：${exp.location}*`);
      }
      if (exp.highlights?.length) {
        lines.push(formatList(exp.highlights));
      }
      lines.push('');
    });
  }

  if (includeSection('projects') && resume.projects?.length) {
    lines.push('## 项目经历');
    resume.projects.forEach((project) => {
      lines.push(`### ${project.name || '项目名称'}${project.role ? ` ｜ ${project.role}` : ''}`);
      if (project.summary) {
        lines.push(project.summary);
      }
      if (project.link) {
        lines.push(`[项目链接](${project.link})`);
      }
      lines.push('');
    });
  }

  if (includeSection('education') && resume.education?.length) {
    lines.push('## 教育背景');
    resume.education.forEach((edu) => {
      lines.push(
        `- **${edu.school || '学校'}** ｜ ${edu.degree || ''} ${formatDateRange(edu.startDate, edu.endDate)}`,
      );
      if (edu.details) {
        lines.push(`  - ${edu.details}`);
      }
    });
    lines.push('');
  }

  if (includeSection('skills') && resume.skills?.length) {
    lines.push('## 技能特长');
    resume.skills.forEach((skill) => {
      const items = (skill.items || []).filter((item) => item && item.trim()).join('，');
      lines.push(`- **${skill.title || '技能方向'}**：${items}`);
    });
    lines.push('');
  }

  if (includeSection('languages') && resume.languages?.length) {
    lines.push('## 语言');
    resume.languages.forEach((lang) => {
      lines.push(`- ${lang.name}（${lang.level || '水平'}）`);
    });
    lines.push('');
  }

  if (includeSection('interests') && resume.interests?.length) {
    lines.push('## 兴趣');
    lines.push(
      resume.interests
        .map((interest) => interest.name)
        .filter(Boolean)
        .join(' ｜ '),
    );
    lines.push('');
  }

  if (includeSection('awards') && resume.awards?.length) {
    lines.push('## 荣誉奖项');
    resume.awards.forEach((award) => {
      const suffix = [award.issuer, award.year].filter(Boolean).join(' · ');
      lines.push(`- ${award.name}${suffix ? `（${suffix}）` : ''}`);
    });
    lines.push('');
  }

  const customSections: ResumeCustomSection[] = Array.isArray(resume.customSections)
    ? (resume.customSections as ResumeCustomSection[])
    : [];
  customSections.forEach((section) => {
    const key = getCustomSectionKey(section.id);
    if (!includeSection(key)) return;
    lines.push(`## ${section.title || '自定义模块'}`);
    const mode = section.mode || 'list';
    if (mode === 'fields') {
      const fields = (section.fields || [])
        .map((field) => ({
          label: typeof field.label === 'string' ? field.label.trim() : '',
          value: typeof field.value === 'string' ? field.value.trim() : '',
        }))
        .filter((field) => field.label || field.value);
      if (fields.length) {
        fields.forEach((field) => {
          if (field.label && field.value) {
            lines.push(`- **${field.label}**：${field.value}`);
          } else if (field.label) {
            lines.push(`- **${field.label}**`);
          } else if (field.value) {
            lines.push(`- ${field.value}`);
          }
        });
      }
    } else if (mode === 'text') {
      const text = typeof section.text === 'string' ? section.text.trim() : '';
      if (text) {
        lines.push(text);
      }
    } else if (section.items?.length) {
      lines.push(formatList(section.items));
    }
    lines.push('');
  });

  return lines.join('\n').trim();
};
