export type Locale = 'zh' | 'en';
export type LocalizedText = { zh: string; en: string };
export type ResumeLength = 'short' | 'long';
export type Direction = 'draftbook' | 'pageboard';
export type StudioMode = 'edit' | 'modules' | 'templates' | 'preview' | 'canvas';
export type SectionId =
  | 'profile'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills'
  | 'languages'
  | 'awards'
  | 'interests'
  | `custom:${string}`;

export interface DemoExperience {
  id: string;
  company: string;
  role: LocalizedText;
  location: LocalizedText;
  dates: string;
  highlights: LocalizedText;
}

export interface DemoProject {
  id: string;
  name: string;
  role: LocalizedText;
  dates: string;
  description: LocalizedText;
  link: string;
}

export interface DemoEducation {
  id: string;
  school: string;
  degree: LocalizedText;
  dates: string;
  detail: LocalizedText;
}

export interface DemoCustomSection {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
}

export interface DemoResume {
  fullName: LocalizedText;
  headline: LocalizedText;
  summary: LocalizedText;
  email: string;
  phone: string;
  location: LocalizedText;
  website: string;
  experiences: DemoExperience[];
  projects: DemoProject[];
  education: DemoEducation[];
  skills: LocalizedText[];
  languages: { name: LocalizedText; level: LocalizedText }[];
  awards: { name: LocalizedText; organization: string; year: string }[];
  interests: LocalizedText[];
  customSections: DemoCustomSection[];
}

export interface DemoModule {
  id: SectionId;
  title: LocalizedText;
  enabled: boolean;
}

const text = (zh: string, en: string): LocalizedText => ({ zh, en });

const LONG_RESUME: DemoResume = {
  fullName: text('林知远', 'Zhi-Yuan Lin'),
  headline: text('高级产品设计师 · Senior Product Designer', 'Senior Product Designer'),
  summary: text(
    '拥有 7 年 B2B 产品设计经验，擅长把复杂工作流整理成清晰、可验证的产品体验。近年聚焦设计系统与 AI 协作工具，与研究、工程和运营团队共同交付从试点到规模化的产品。',
    'Product designer with 7 years of experience turning complex B2B workflows into clear, testable products. Focused on design systems and AI-assisted work tools, partnering with research, engineering, and operations from pilot to scale.',
  ),
  email: 'zhi-yuan@example.test',
  phone: '+86 138 0000 2468',
  location: text('上海 · 可远程', 'Shanghai · Open to remote'),
  website: 'zhiyuan.design',
  experiences: [
    {
      id: 'exp-1',
      company: 'Northstar Labs',
      role: text('高级产品设计师', 'Senior Product Designer'),
      location: text('上海', 'Shanghai'),
      dates: '2022.04 — Present',
      highlights: text(
        '重新设计企业客户的配置流程，将首次成功部署率从 61% 提升至 84%。\n牵头 42 个组件的跨产品设计系统，季度重复 UI 需求减少 31%。\n与产品和工程共同定义 AI 摘要的确认机制，避免未经确认的内容写回。',
        'Redesigned enterprise onboarding, raising first successful deployment from 61% to 84%.\nLed a 42-component cross-product design system, reducing repeated UI requests by 31%.\nDefined a review-before-apply model for AI summaries with product and engineering.',
      ),
    },
    {
      id: 'exp-2',
      company: 'Morrow Commerce',
      role: text('产品设计师', 'Product Designer'),
      location: text('杭州', 'Hangzhou'),
      dates: '2019.08 — 2022.03',
      highlights: text(
        '把 6 个独立的商家后台整合为统一工作台，商家客服相关工单下降 24%。\n建立与研究团队共用的可用性测试流程，每个版本至少验证 5 位商家。\n设计订单、库存和履约的批量操作，平均处理时长缩短 18%。',
        'Unified six merchant tools into one workspace, reducing support tickets by 24%.\nBuilt a usability testing loop with research, validating each release with at least five merchants.\nDesigned bulk order, inventory, and fulfillment workflows, cutting handling time by 18%.',
      ),
    },
    {
      id: 'exp-3',
      company: 'Open Field Studio',
      role: text('交互设计师', 'Interaction Designer'),
      location: text('南京', 'Nanjing'),
      dates: '2017.07 — 2019.07',
      highlights: text(
        '为 3 个早期产品建立从用户访谈、流程图到可用性测试的设计方法。\n与前端工程师搭建首版组件库，让产品团队可以独立组装高频页面。',
        'Created an end-to-end design practice for three early products, from interviews to usability tests.\nPartnered with frontend engineers on the first component library for high-frequency workflows.',
      ),
    },
  ],
  projects: [
    {
      id: 'project-1',
      name: 'Northstar Design System',
      role: text('设计负责人', 'Design Lead'),
      dates: '2023 — 2025',
      description: text(
        '建立跨 Web 产品的组件规范与 Figma 库，覆盖 42 个常用模式；通过迁移指南和贡献流程帮助 4 个小组逐步接入。',
        'Established a shared component spec and Figma library across web products. A migration guide and contribution flow helped four teams adopt it gradually.',
      ),
      link: 'northstar.example.test/design-system',
    },
    {
      id: 'project-2',
      name: 'Field Notes · Research Kit',
      role: text('个人项目', 'Independent project'),
      dates: '2022 — 2023',
      description: text(
        '为分布式产品团队设计轻量研究记录工具，让访谈证据可以追溯到具体决策，而不是停留在长文档中。',
        'A lightweight research notebook that connects interview evidence to product decisions instead of leaving it in long documents.',
      ),
      link: 'fieldnotes.example.test',
    },
    {
      id: 'project-3',
      name: 'AI Review Patterns',
      role: text('产品设计师', 'Product Designer'),
      dates: '2024',
      description: text(
        '探索 AI 建议、原文对照、明确采纳与恢复路径的交互模式，试点覆盖摘要和批量文案任务。',
        'Explored review, source comparison, explicit apply, and recovery patterns for AI suggestions across summary and bulk-copy workflows.',
      ),
      link: 'patterns.example.test/ai-review',
    },
  ],
  education: [
    {
      id: 'edu-1',
      school: '东南大学',
      degree: text('工业设计 · 学士', 'BFA, Industrial Design'),
      dates: '2013 — 2017',
      detail: text(
        '交互设计方向；优秀毕业设计提名',
        'Interaction design focus · Graduating project nominee',
      ),
    },
  ],
  skills: [
    text('产品策略与信息架构', 'Product strategy & IA'),
    text('交互与原型设计', 'Interaction & prototyping'),
    text('设计系统', 'Design systems'),
    text('定性研究', 'Qualitative research'),
    text('Figma · FigJam', 'Figma · FigJam'),
    text('HTML · CSS 基础', 'HTML · CSS fundamentals'),
  ],
  languages: [
    { name: text('中文', 'Chinese'), level: text('母语', 'Native') },
    {
      name: text('英语', 'English'),
      level: text('专业工作水平', 'Professional working proficiency'),
    },
  ],
  awards: [
    {
      name: text('年度协作奖', 'Collaboration Award'),
      organization: 'Northstar Labs',
      year: '2024',
    },
    {
      name: text('青年设计提名', 'Emerging Designer Nominee'),
      organization: 'Design Week',
      year: '2020',
    },
  ],
  interests: [
    text('城市步行', 'Urban walking'),
    text('独立出版', 'Independent publishing'),
    text('开源设计工具', 'Open design tools'),
  ],
  customSections: [
    {
      id: 'custom-community',
      title: text('社区与分享', 'Community'),
      body: text(
        '每季度组织一次设计复盘；为非营利社区项目提供志愿设计支持。',
        'Hosts a quarterly design critique and volunteers design support for community projects.',
      ),
    },
  ],
};

export function createDemoResume(length: ResumeLength): DemoResume {
  const resume = structuredClone(LONG_RESUME);

  if (length === 'short') {
    resume.experiences = resume.experiences.slice(0, 1);
    resume.projects = resume.projects.slice(0, 1);
    resume.awards = resume.awards.slice(0, 1);
    resume.interests = resume.interests.slice(0, 2);
    resume.customSections = [];
    resume.summary.zh = '7 年 B2B 产品设计经验，擅长复杂工作流、设计系统与 AI 协作工具。';
    resume.summary.en =
      'Product designer with 7 years in B2B workflows, design systems, and AI-assisted tools.';
  }

  return resume;
}

export function createDemoModules(length: ResumeLength): DemoModule[] {
  const modules: DemoModule[] = [
    { id: 'experience', title: text('工作经历', 'Experience'), enabled: true },
    { id: 'projects', title: text('项目经历', 'Selected work'), enabled: true },
    { id: 'education', title: text('教育背景', 'Education'), enabled: true },
    { id: 'skills', title: text('专业能力', 'Capabilities'), enabled: true },
    { id: 'languages', title: text('语言能力', 'Languages'), enabled: true },
    { id: 'awards', title: text('认可与奖项', 'Recognition'), enabled: length === 'long' },
    {
      id: 'interests',
      title: text('兴趣与社区', 'Interests & community'),
      enabled: length === 'long',
    },
  ];

  return modules;
}
