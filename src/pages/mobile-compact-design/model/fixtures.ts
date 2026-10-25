import type { ResumeData } from '@entities/resume';
import type { ResumeTemplate } from '@entities/template';

export type PrototypeLocale = 'zh-CN' | 'en';

const copy = {
  'zh-CN': {
    name: '林岚',
    title: '产品设计师 · 设计系统与服务体验',
    summary:
      '专注把复杂工作流整理成清晰、可靠的产品体验。与产品、研究和工程团队协作，持续验证设计决策并跟进上线后的结果。',
    company: '栖木工作室',
    role: '资深产品设计师',
    school: '海岸理工学院',
    degree: '交互设计 · 本科',
    project: '移动服务工作台',
    skill: '产品与设计',
    customTitle: '补充亮点',
    customText: '合成内容：用于检查长文本、中文换行与自定义模块。',
  },
  en: {
    name: 'Morgan Lee',
    title: 'Senior Product Designer · Systems and Service Design',
    summary:
      'I turn complex workflows into clear, dependable product experiences. I partner with product, research, and engineering teams to test design decisions and follow their impact after launch.',
    company: 'Northshore Studio',
    role: 'Senior Product Designer',
    school: 'Coastal Institute of Technology',
    degree: 'B.A. Interaction Design',
    project: 'Mobile Service Workspace',
    skill: 'Product and Design',
    customTitle: 'Additional highlights',
    customText: 'Synthetic content for checking long text, wrapping, and custom sections.',
  },
} as const;

const repeatedDetail = (locale: PrototypeLocale, index: number) =>
  locale === 'zh-CN'
    ? `梳理第 ${index + 1} 组用户流程，与研究和工程团队共同验证关键步骤，交付清晰的状态反馈、可访问的表单和可持续维护的组件。`
    : `Mapped workflow ${index + 1} with research and engineering partners, then shipped clearer state feedback, accessible forms, and components that teams could maintain across products.`;

export const createM0Resume = (
  locale: PrototypeLocale,
  length: 'single' | 'long' = 'single',
): ResumeData => {
  const content = copy[locale];
  const experienceCount = length === 'long' ? 6 : 1;
  const bulletCount = length === 'long' ? 4 : 2;

  return {
    schemaVersion: 1,
    personal: {
      fullName: content.name,
      title: content.title,
      email: 'morgan.lee@example.test',
      emailLabel: locale === 'zh-CN' ? '邮箱' : 'Email',
      phone: '+1 202 555 0148',
      phoneLabel: locale === 'zh-CN' ? '电话' : 'Phone',
      location: locale === 'zh-CN' ? '杭州 · 远程' : 'Remote · Pacific time',
      locationLabel: locale === 'zh-CN' ? '所在地' : 'Location',
      photo: '',
      summary: content.summary,
      extras: [],
    },
    socials: [
      {
        id: 'm0-social-portfolio',
        label: locale === 'zh-CN' ? '作品集' : 'Portfolio',
        url: 'https://portfolio.example.test/case-studies/service-design/long-project-reference/accessible-workflow-v2',
      },
      {
        id: 'm0-social-github',
        label: 'GitHub',
        url: 'https://github.com/example/mobile-compact-studio',
      },
    ],
    experience: Array.from({ length: experienceCount }, (_, index) => ({
      id: 'm0-experience-' + String(index + 1),
      company: length === 'long' ? content.company + ' ' + String(index + 1) : content.company,
      role: content.role,
      location: locale === 'zh-CN' ? '杭州' : 'Remote',
      startDate: '2021-04',
      endDate: locale === 'zh-CN' ? '至今' : 'Present',
      highlights: Array.from({ length: bulletCount }, (_, bulletIndex) => {
        const detail = repeatedDetail(locale, index + bulletIndex);
        return length === 'long' ? detail + ' ' + detail : detail;
      }),
    })),
    projects: [
      {
        id: 'm0-project-workspace',
        name: content.project,
        role: locale === 'zh-CN' ? '设计负责人' : 'Design Lead',
        summary:
          locale === 'zh-CN'
            ? '为一线服务团队设计移动工作流，覆盖任务分配、异常处理与交接。'
            : 'Designed mobile workflows for frontline teams, covering task handoff, exceptions, and service recovery.',
        link: 'https://projects.example.test/mobile-service-workspace',
        highlights: [],
      },
    ],
    education: [
      {
        id: 'm0-education',
        school: content.school,
        degree: content.degree,
        startDate: '2014',
        endDate: '2018',
        details:
          locale === 'zh-CN'
            ? '研究方向：移动服务与信息可视化。'
            : 'Focus: mobile services and information visualization.',
      },
    ],
    skills: [
      {
        id: 'm0-skill-design',
        title: content.skill,
        items:
          locale === 'zh-CN'
            ? ['原型验证', '信息架构', '设计系统', '服务蓝图']
            : ['Prototyping', 'Information Architecture', 'Design Systems', 'Service Blueprints'],
      },
    ],
    languages: [
      {
        id: 'm0-language-zh',
        name: locale === 'zh-CN' ? '中文' : 'Chinese',
        level: locale === 'zh-CN' ? '母语' : 'Native',
      },
      {
        id: 'm0-language-en',
        name: locale === 'zh-CN' ? '英语' : 'English',
        level: locale === 'zh-CN' ? '流利' : 'Fluent',
      },
    ],
    interests: [
      { id: 'm0-interest-1', name: locale === 'zh-CN' ? '城市漫步' : 'Urban walks' },
      { id: 'm0-interest-2', name: locale === 'zh-CN' ? '独立出版' : 'Independent publishing' },
    ],
    awards: [
      {
        id: 'm0-award-1',
        name: locale === 'zh-CN' ? '服务体验设计奖' : 'Service Experience Design Award',
        issuer: locale === 'zh-CN' ? '设计开放周' : 'Open Design Week',
        year: '2023',
      },
    ],
    customSections: [
      {
        id: 'm0-proof',
        title: content.customTitle,
        mode: 'text',
        items: [],
        fields: [],
        text: content.customText,
      },
    ],
    settings: {
      personal: {
        showPhoto: false,
        photoSize: 88,
        photoPosition: 'right',
      },
    },
  };
};

export const createM0Templates = (locale: PrototypeLocale, resume: ResumeData) => {
  const isChinese = locale === 'zh-CN';
  const shared = {
    sample: resume,
    localizedSamples: { 'zh-CN': resume, en: resume },
  };

  const builtInTemplates: ResumeTemplate[] = [
    {
      id: 'modern-blue',
      name: isChinese ? '现代蓝' : 'Modern Blue',
      description: isChinese
        ? '清晰、克制，适合多数岗位。'
        : 'Clear and calm for a wide range of roles.',
      accentColor: '#547b9a',
      previewStyle: 'modern',
      ...shared,
    },
    {
      id: 'dark-contrast',
      name: isChinese ? '暗黑质感' : 'Dark Contrast',
      description: isChinese
        ? '使用深色标题与明确信息分组。'
        : 'Uses darker headings and clear grouping.',
      accentColor: '#38bdf8',
      previewStyle: 'classic',
      ...shared,
    },
    {
      id: 'creative-pastel',
      name: isChinese ? '柔彩创意' : 'Creative Pastel',
      description: isChinese ? '柔和暖色强调个人表达。' : 'Soft warm accents for a personal touch.',
      accentColor: '#e8798f',
      previewStyle: 'creative',
      ...shared,
    },
  ];

  const customTemplates: ResumeTemplate[] = [
    {
      id: 'm0-custom',
      name: isChinese ? '林岚简约' : 'Morgan Minimal',
      description: isChinese ? '自定义字体与品牌色。' : 'Custom type and brand color.',
      accentColor: '#67867f',
      previewStyle: 'custom',
      ...shared,
      theme: {
        accent: '#67867f',
        heading: '#263b42',
        subheading: '#496871',
        text: '#35454b',
        muted: '#66777b',
        background: '#ffffff',
        cardBackground: '#f5f8f7',
        cardBorder: '#dce6e2',
        divider: '#dce6e2',
      },
    },
  ];

  return { builtInTemplates, customTemplates };
};

export const M0_ACTIVE_SECTIONS = ['experience', 'education', 'skills', 'custom:m0-proof'];
