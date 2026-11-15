import type { ResumeData } from '@entities/resume';
import { createEmptyResume } from '@entities/resume';

export const penpotGeometryResume = (): ResumeData => {
  const resume = createEmptyResume();
  resume.personal = {
    ...resume.personal,
    fullName: '林悦（Yue Lin）',
    title: '高级产品战略负责人 / AI 产品与增长负责人',
    email: 'linyue+product-strategy@northstar.example.com',
    phone: '+86 138 0000 0000',
    location: '上海 · 中国',
    summary:
      '拥有 10 年产品与市场战略经验，负责从用户研究、产品策略到全球化产品落地的完整闭环。擅长推动企业级工具从 0 到 1，以数据分析、需求优先级和清晰沟通提升业务效率。擅长推动复杂项目协同与团队共识建设；期待在全球化产品团队中持续创造可验证的用户价值。',
    extras: [
      {
        id: 'extra-portfolio',
        label: '个人网站',
        value: 'yuelin.work / strategy-notes',
      },
      {
        id: 'extra-linkedin',
        label: 'LinkedIn',
        value: 'linkedin.com/in/yue-lin',
      },
    ],
  };
  resume.experience = [
    {
      id: 'experience-northstar',
      company: 'Northstar 产品战略团队',
      role: '产品战略负责人',
      location: '上海',
      startDate: '2021.06',
      endDate: '至今',
      highlights: [
        '制定企业产品路线图，推动核心工具活跃度增长 32%。',
        '协调产品、设计与工程团队，将交付周期缩短 24%。',
      ],
    },
    {
      id: 'experience-cloud',
      company: 'Northstar Cloud Services',
      role: '高级产品经理',
      location: '上海',
      startDate: '2017.04',
      endDate: '2021.05',
      highlights: ['建立客户反馈机制，季度留存提升 12%。'],
    },
  ];
  resume.projects = [
    {
      id: 'project-collaboration',
      name: '企业协作平台升级',
      role: '产品负责人',
      summary: '为跨区域团队提供统一的协作与项目分析体验。',
      link: 'https://northstar.example.com/collaboration',
      highlights: ['统一关键工作流，减少重复沟通。'],
    },
  ];
  resume.education = [
    {
      id: 'education-northstar',
      school: 'Northstar 大学',
      degree: '信息管理 · 本科',
      startDate: '2013.09',
      endDate: '2017.06',
      details: '产品研究与组织管理方向。',
    },
  ];
  resume.skills = [
    { id: 'skill-product', title: '产品策略', items: ['用户研究', '路线图', '增长分析'] },
    { id: 'skill-tools', title: '工具', items: ['Figma', 'SQL', '实验设计'] },
  ];
  return resume;
};

export const productScreenshotResume = (): ResumeData => {
  const resume = createEmptyResume();
  resume.personal = {
    ...resume.personal,
    fullName: 'Mina Chen',
    title: 'Product Designer · Enterprise SaaS',
    email: 'mina.chen@example.test',
    phone: '+1 415 555 0198',
    location: 'San Francisco, CA',
    summary:
      'Product designer with eight years of experience shaping complex workflows into clear, accessible products. Partners with research, engineering, and operations teams to connect customer needs with measurable outcomes.',
    extras: [
      { id: 'extra-portfolio', label: 'Portfolio', value: 'https://mina.example.test' },
      { id: 'extra-linkedin', label: 'LinkedIn', value: 'linkedin.com/in/mina-chen' },
    ],
  };
  resume.experience = [
    {
      id: 'experience-orbit',
      company: 'Orbit Systems',
      role: 'Senior Product Designer',
      location: 'San Francisco',
      startDate: '2022.03',
      endDate: 'Present',
      highlights: [
        'Redesigned onboarding for enterprise workspaces, increasing activation by 21%.',
        'Built a shared design system used across four product teams.',
      ],
    },
    {
      id: 'experience-mosaic',
      company: 'Mosaic Works',
      role: 'Product Designer',
      location: 'Oakland',
      startDate: '2018.06',
      endDate: '2022.02',
      highlights: ['Improved accessibility and completion rates in billing workflows.'],
    },
  ];
  resume.projects = [
    {
      id: 'project-studio',
      name: 'Workspace Studio',
      role: 'Design Lead',
      summary: 'A modular workspace that gives growing teams a clear view of their work.',
      highlights: ['Reduced time to configure a workspace from days to minutes.'],
      link: 'https://orbit.example.test/studio',
    },
  ];
  resume.education = [
    {
      id: 'education-artcenter',
      school: 'Pacific Arts College',
      degree: 'BFA, Interaction Design',
      startDate: '2014',
      endDate: '2018',
      details: 'Focus in accessibility and information design.',
    },
  ];
  resume.skills = [
    { id: 'skill-design', title: 'Design', items: ['Research', 'Prototyping', 'Accessibility'] },
    { id: 'skill-tools', title: 'Tools', items: ['Figma', 'SQL', 'Design systems'] },
  ];
  return resume;
};
