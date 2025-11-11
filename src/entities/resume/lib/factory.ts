import type { Locale } from '@shared/i18n';
import { createId } from '@shared/lib';

import type {
  ResumeAward,
  ResumeCustomSection,
  ResumeData,
  ResumeExperience,
  ResumeInterest,
  ResumeLanguage,
  ResumePersonalExtra,
  ResumeProject,
  ResumeSkill,
} from '../types';

const generateId = (prefix: string): string => createId(prefix);

const createSkills = (locale: Locale): ResumeSkill[] => {
  if (locale === 'en') {
    return [
      {
        id: generateId('skill'),
        title: 'Full-Stack Development',
        items: ['React', 'TypeScript', 'Redux Toolkit', 'Tailwind CSS'],
      },
      {
        id: generateId('skill'),
        title: 'Engineering Practices',
        items: ['Unit Testing', 'CI/CD', 'Performance Optimization', 'Design Systems'],
      },
    ];
  }
  return [
    {
      id: generateId('skill'),
      title: '全栈开发',
      items: ['React', 'TypeScript', 'Redux Toolkit', 'Tailwind CSS'],
    },
    {
      id: generateId('skill'),
      title: '工程实践',
      items: ['单元测试', '持续集成', '性能优化', '设计系统'],
    },
  ];
};

const createExperience = (locale: Locale): ResumeExperience[] => {
  if (locale === 'en') {
    return [
      {
        id: generateId('exp'),
        company: 'Acme Tech Group',
        role: 'Senior Engineer',
        location: 'Shanghai',
        startDate: '2021-05',
        endDate: 'Present',
        highlights: [
          'Led the rollout of the company design system, shipping 30+ reusable components and boosting UI delivery efficiency by 45%.',
          'Owned performance optimisation for the flagship product, reducing first paint time by 38%.',
          'Partnered with backend and product to ship multiple major releases, sustaining 90%+ user satisfaction.',
        ],
      },
      {
        id: generateId('exp'),
        company: 'Atlas Corp',
        role: 'Frontend Engineer',
        location: 'Beijing',
        startDate: '2018-07',
        endDate: '2021-04',
        highlights: [
          'Built an online editor with templated layouts and realtime sync, dramatically shortening delivery timelines.',
          'Established an automated testing stack with 80% coverage.',
          'Championed modern tooling (TypeScript, ESLint, Prettier) across the team.',
        ],
      },
    ];
  }
  return [
    {
      id: generateId('exp'),
      company: '某某科技公司',
      role: '高级工程师',
      location: '上海',
      startDate: '2021-05',
      endDate: '至今',
      highlights: [
        '主导公司设计系统落地，构建 30+ 复用组件，将 UI 交付效率提升 45%',
        '负责核心产品性能优化，首页首次加载时间下降 38%',
        '协同后端与产品完成多次大型版本迭代，持续获得 90%+ 用户好评',
      ],
    },
    {
      id: generateId('exp'),
      company: '某某企业',
      role: '前端工程师',
      location: '北京',
      startDate: '2018-07',
      endDate: '2021-04',
      highlights: [
        '构建在线编辑器，支持模板化配置与实时同步，大幅减少交付时间',
        '搭建前端自动化测试体系，覆盖率提升至 80%',
        '推动团队使用现代化工具链（TypeScript、ESLint、Prettier）',
      ],
    },
  ];
};

const createEducation = (locale: Locale): ResumeData['education'] => {
  if (locale === 'en') {
    return [
      {
        id: generateId('edu'),
        school: 'Metropolitan University',
        degree: 'B.S. Computer Science and Technology',
        startDate: '2014',
        endDate: '2018',
        details:
          'Graduated with honours; ACM team member. Capstone project built a visual page builder for the web.',
      },
    ];
  }
  return [
    {
      id: generateId('edu'),
      school: '某某大学',
      degree: '计算机科学与技术 本科',
      startDate: '2014',
      endDate: '2018',
      details: '优秀毕业生、ACM 校队成员，毕业设计为前端可视化搭建平台',
    },
  ];
};

const createProjects = (locale: Locale): ResumeProject[] => {
  if (locale === 'en') {
    return [
      {
        id: generateId('proj'),
        name: 'ResumeCraft Online Builder',
        role: 'Full-Stack Developer',
        summary:
          'Built a visual resume editor with drag-and-drop layout, template switching, and PDF export, serving 50k+ users.',
        link: 'https://github.com/example/resume-craft',
      },
      {
        id: generateId('proj'),
        name: 'FlowChart Pro Collaboration Board',
        role: 'Frontend Lead',
        summary:
          'Implemented multi-user realtime collaboration via WebSocket and optimised drawing experience for the education sector.',
        link: '',
      },
    ];
  }
  return [
    {
      id: generateId('proj'),
      name: 'ResumeCraft 在线简历平台',
      role: '全栈开发者',
      summary: '打造可视化简历编辑器，支持拖拽排版、模板切换与 PDF 导出，服务 5w+ 用户',
      link: 'https://github.com/example/resume-craft',
    },
    {
      id: generateId('proj'),
      name: 'FlowChart Pro 协同画板',
      role: '前端负责人',
      summary: '基于 WebSocket 实现多人实时协作，优化绘制体验并在教育行业落地',
      link: '',
    },
  ];
};

const createSocials = (locale: Locale): ResumeData['socials'] => {
  if (locale === 'en') {
    return [
      { id: generateId('social'), label: 'GitHub', url: 'https://github.com/username' },
      { id: generateId('social'), label: 'LinkedIn', url: 'https://www.linkedin.com/in/username' },
      { id: generateId('social'), label: 'Portfolio', url: 'https://username.dev' },
    ];
  }
  return [
    { id: generateId('social'), label: 'GitHub', url: 'https://github.com/username' },
    { id: generateId('social'), label: 'LinkedIn', url: 'https://www.linkedin.com/in/username' },
    { id: generateId('social'), label: '个人主页', url: 'https://username.dev' },
  ];
};

export const createSampleResume = (locale: Locale = 'zh-CN'): ResumeData => {
  const isEnglish = locale === 'en';
  return {
    personal: {
      fullName: isEnglish ? 'Qing Chen' : '陈情',
      title: isEnglish
        ? 'Senior Full-Stack Engineer | React · TypeScript · .NET'
        : '高级全栈工程师 | React & TypeScript & .NET',
      email: 'chenqing@example.com',
      phone: '+86 138-0000-0000',
      location: isEnglish ? 'Shanghai' : '上海',
      photo: '',
      summary: isEnglish
        ? 'Six years of full-stack experience building high-performance, maintainable web apps. Strong in design systems, complex interactions, and engineering workflows; collaborates closely with cross-functional teams to ship product innovations.'
        : '拥有 6 年全栈开发经验，专注于构建高性能、可维护的 Web 应用。在设计系统、复杂交互和工程化方面有丰富实践，擅长与跨职能团队协作推动产品创新。',
      extras: [
        {
          id: generateId('extra'),
          label: isEnglish ? 'Portfolio' : '个人网站',
          value: 'https://chenqing.dev',
        },
        { id: generateId('extra'), label: 'GitHub', value: 'https://github.com/chenqing' },
      ] satisfies ResumePersonalExtra[],
    },
    socials: createSocials(locale),
    experience: createExperience(locale),
    education: createEducation(locale),
    projects: createProjects(locale),
    skills: createSkills(locale),
    languages: [
      {
        id: generateId('lang'),
        name: isEnglish ? 'Chinese' : '中文',
        level: isEnglish ? 'Native' : '母语',
      },
      {
        id: generateId('lang'),
        name: isEnglish ? 'English' : '英语',
        level: isEnglish ? 'Advanced (C1)' : '熟练（C1）',
      },
    ] satisfies ResumeLanguage[],
    interests: [
      { id: generateId('interest'), name: isEnglish ? 'Open-Source Contributions' : '开源贡献' },
      { id: generateId('interest'), name: isEnglish ? 'Cycling & Outdoors' : '骑行与户外' },
      { id: generateId('interest'), name: isEnglish ? 'Technical Writing' : '技术写作' },
    ] satisfies ResumeInterest[],
    awards: [
      {
        id: generateId('award'),
        name: isEnglish ? 'Annual Technology Innovation Award' : '公司年度技术创新奖',
        issuer: isEnglish ? 'Acme Tech Group' : '某某科技公司',
        year: '2023',
      },
    ] satisfies ResumeAward[],
    customSections: [] as ResumeCustomSection[],
    settings: {
      personal: {
        showPhoto: true,
        photoSize: 120,
        photoPosition: 'right',
      },
    },
  };
};

export const createEmptyResume = (): ResumeData => ({
  personal: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    photo: '',
    summary: '',
    extras: [] as ResumePersonalExtra[],
  },
  socials: [] as ResumeData['socials'],
  experience: [] as ResumeExperience[],
  education: [] as ResumeData['education'],
  projects: [] as ResumeProject[],
  skills: [] as ResumeSkill[],
  languages: [] as ResumeLanguage[],
  interests: [] as ResumeInterest[],
  awards: [] as ResumeAward[],
  customSections: [] as ResumeCustomSection[],
  settings: {
    personal: {
      showPhoto: true,
      photoSize: 120,
      photoPosition: 'right',
    },
  },
});
