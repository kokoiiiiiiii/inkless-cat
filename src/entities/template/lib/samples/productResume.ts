import type { ResumeData } from '@entities/resume';
import { createId } from '@shared/lib/id';

import { buildResume } from './helpers';

const socialsZh = () => [
  { id: createId('social'), label: 'LinkedIn', url: 'https://linkedin.com/in/ranwang' },
  { id: createId('social'), label: '知乎', url: 'https://www.zhihu.com/people/pm-ran' },
];

const socialsEn = () => [
  { id: createId('social'), label: 'LinkedIn', url: 'https://linkedin.com/in/ranwang' },
  { id: createId('social'), label: 'Zhihu', url: 'https://www.zhihu.com/people/pm-ran' },
];

export const productResumeZh: ResumeData = buildResume({
  personal: {
    fullName: '王然',
    title: '资深产品经理 | SaaS & AI',
    email: 'ran.wang@example.com',
    phone: '+86 139-1000-2000',
    location: '北京',
    photo: '',
    summary:
      '7 年 B 端 & SaaS 产品规划经验，擅长从 0 到 1 搭建数据平台与增长体系。推动 AI 能力落地，帮助客户留存提升 18%。',
  },
  socials: socialsZh(),
  experience: [
    {
      id: createId('exp'),
      company: '某某科技公司',
      role: '高级产品经理',
      location: '北京',
      startDate: '2020-03',
      endDate: '至今',
      highlights: [
        '负责 AI 营销云路线规划，协调 15 人跨职能团队完成 3 次核心版本迭代',
        '设计留存增长漏斗与自动化触达，实现企业客户续费率从 62% 提升至 80%',
        '引入数据驱动评审流程，将需求平均交付周期从 18 周缩短至 11 周',
      ],
    },
    {
      id: createId('exp'),
      company: '某某数据公司',
      role: '产品经理',
      location: '上海',
      startDate: '2017-07',
      endDate: '2020-02',
      highlights: [
        '搭建运营数据平台，服务 30+ 事业部，日活运营人员 500+',
        '牵头客户调研与竞品分析，沉淀行业地图与定位策略',
      ],
    },
  ],
  projects: [
    {
      id: createId('proj'),
      name: 'AI 营销自动化平台',
      role: '产品 Owner',
      summary:
        '构建智能推荐与策略编排模块，支持实时人群洞察、推送与 AB 实验，让 MA 操作效率提升 50%。',
      link: 'https://example.com/ai-marketing',
    },
  ],
  education: [
    {
      id: createId('edu'),
      school: '某某大学',
      degree: '信息管理与信息系统 本科',
      startDate: '2013',
      endDate: '2017',
      details: 'GPA 3.7/4.0，校科技创新项目负责人',
    },
  ],
  skills: [
    {
      id: createId('skill'),
      title: '核心技能',
      items: ['产品路线规划', '用户研究', '数据分析', 'OKR & KPI 设计'],
    },
    {
      id: createId('skill'),
      title: '工具',
      items: ['Figma', 'Notion', 'SQL', 'Tableau'],
    },
  ],
  languages: [
    { id: createId('lang'), name: '中文', level: '母语' },
    { id: createId('lang'), name: '英语', level: '熟练（C1）' },
  ],
  interests: [
    { id: createId('interest'), name: '复盘写作' },
    { id: createId('interest'), name: '飞盘' },
  ],
  awards: [
    {
      id: createId('award'),
      name: '年度创新产品奖',
      issuer: '某某科技公司',
      year: '2022',
    },
  ],
});

export const productResumeEn: ResumeData = buildResume({
  personal: {
    fullName: 'Ran Wang',
    title: 'Principal Product Manager | SaaS & AI',
    email: 'ran.wang@example.com',
    phone: '+86 139-1000-2000',
    location: 'Beijing',
    photo: '',
    summary:
      '7 years of B2B/SaaS product strategy experience with a track record of building analytics platforms and growth systems from 0→1. Recently shipped AI capabilities that lifted customer retention by 18%.',
  },
  socials: socialsEn(),
  experience: [
    {
      id: createId('exp'),
      company: 'Aurora Tech',
      role: 'Senior Product Manager',
      location: 'Beijing',
      startDate: '2020-03',
      endDate: 'Present',
      highlights: [
        'Owned roadmap for the AI marketing cloud, steering a 15-person cross-functional squad through three major releases.',
        'Designed retention funnels and automated outreach that increased enterprise renewal rate from 62% to 80%.',
        'Introduced data-driven review rituals, cutting the average delivery cycle from 18 to 11 weeks.',
      ],
    },
    {
      id: createId('exp'),
      company: 'Insight Data',
      role: 'Product Manager',
      location: 'Shanghai',
      startDate: '2017-07',
      endDate: '2020-02',
      highlights: [
        'Launched an operations analytics platform used by 30+ business units and 500+ daily operators.',
        'Led customer research and competitive analysis to establish market positioning and opportunity maps.',
      ],
    },
  ],
  projects: [
    {
      id: createId('proj'),
      name: 'AI Marketing Automation Platform',
      role: 'Product Owner',
      summary:
        'Built recommendation and orchestration modules for real-time audience insights, messaging, and A/B testing, boosting marketing automation efficiency by 50%.',
      link: 'https://example.com/ai-marketing',
    },
  ],
  education: [
    {
      id: createId('edu'),
      school: 'Capital University',
      degree: 'B.S. Information Management & Information Systems',
      startDate: '2013',
      endDate: '2017',
      details: 'GPA 3.7/4.0. Led the university technology innovation initiative.',
    },
  ],
  skills: [
    {
      id: createId('skill'),
      title: 'Core Skills',
      items: ['Roadmapping', 'User Research', 'Data Analysis', 'OKR & KPI Design'],
    },
    {
      id: createId('skill'),
      title: 'Tools',
      items: ['Figma', 'Notion', 'SQL', 'Tableau'],
    },
  ],
  languages: [
    { id: createId('lang'), name: 'Chinese', level: 'Native' },
    { id: createId('lang'), name: 'English', level: 'Advanced (C1)' },
  ],
  interests: [
    { id: createId('interest'), name: 'Retrospective Writing' },
    { id: createId('interest'), name: 'Ultimate Frisbee' },
  ],
  awards: [
    {
      id: createId('award'),
      name: 'Annual Innovation Product Award',
      issuer: 'Aurora Tech',
      year: '2022',
    },
  ],
});

export const productSamples = {
  'zh-CN': productResumeZh,
  en: productResumeEn,
} as const;

export const productResume = productResumeZh;
