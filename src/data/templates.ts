import { createEmptyResume, createSampleResume } from './sampleResume';
import { createId } from '../utils/id';
import type { ResumeData, ResumeTemplate } from '../types/resume';

const buildResume = (overrides: Partial<ResumeData>): ResumeData =>
  ({
    ...createEmptyResume(),
    ...overrides,
  }) as ResumeData;

const productResume: ResumeData = buildResume({
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
  socials: [
    { id: createId('social'), label: 'LinkedIn', url: 'https://linkedin.com/in/ranwang' },
    { id: createId('social'), label: '知乎', url: 'https://www.zhihu.com/people/pm-ran' },
  ],
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

const designerResume = buildResume({
  personal: {
    fullName: '李穗',
    title: '品牌 & 视觉设计师',
    email: 'sui.li@example.com',
    phone: '+86 138-5555-6666',
    location: '上海 / 远程',
    photo: '',
    summary:
      '自由职业视觉设计师，服务科技与生活方式品牌。擅长品牌重塑、设计系统搭建与插画，帮助客户实现品牌曝光增长与商业化转化。',
  },
  socials: [
    { id: createId('social'), label: 'Portfolio', url: 'https://lisui.design' },
    { id: createId('social'), label: 'Behance', url: 'https://www.behance.net/lisui' },
    { id: createId('social'), label: 'Dribbble', url: 'https://dribbble.com/lisui' },
  ],
  experience: [
    {
      id: createId('exp'),
      company: '某某设计工作室',
      role: '视觉设计师',
      location: '远程',
      startDate: '2019-01',
      endDate: '至今',
      highlights: [
        '主导 15+ 品牌升级项目，覆盖消费电子、教育与生活方式行业',
        '在保留核心品牌调性的前提下打造可延展设计系统，节省设计协作成本 30%',
        '通过插画与动效包装，帮助客户新品预售转化率提升 40%',
      ],
    },
    {
      id: createId('exp'),
      company: '某某互动公司',
      role: '视觉设计师',
      location: '上海',
      startDate: '2016-07',
      endDate: '2018-12',
      highlights: [
        '负责核心产品视觉语言与运营活动设计，累计服务 500w+ 用户',
        '与产品、前端协作建立设计资源库，实现页面交付效率翻倍',
      ],
    },
  ],
  projects: [
    {
      id: createId('proj'),
      name: 'Luna Coffee 品牌重塑',
      role: '主视觉设计师',
      summary:
        '打造完整品牌识别系统与包装插画，在新品上线三个月内带动销量提升 120%。',
      link: 'https://lisui.design/luna',
    },
    {
      id: createId('proj'),
      name: 'Flow Habit App',
      role: '视觉负责人',
      summary:
        '设计健康习惯应用的视觉系统，定义插画风格并输出 30+ UI 组件，获 2023 年度最佳 App 视觉奖。',
      link: '',
    },
  ],
  education: [
    {
      id: createId('edu'),
      school: '某某艺术学院',
      degree: '设计学 本科',
      startDate: '2012',
      endDate: '2016',
      details: '主修视觉传达与插画，多次获得学院优秀作品奖',
    },
  ],
  skills: [
    {
      id: createId('skill'),
      title: '设计专长',
      items: ['品牌识别', '设计系统', '插画', '动效'],
    },
    {
      id: createId('skill'),
      title: '软件工具',
      items: ['Figma', 'Adobe Illustrator', 'After Effects', 'Blender'],
    },
  ],
  languages: [
    { id: createId('lang'), name: '中文', level: '母语' },
    { id: createId('lang'), name: '英语', level: '中高级（B2）' },
  ],
  interests: [
    { id: createId('interest'), name: '手作工坊' },
    { id: createId('interest'), name: '模拟城市游戏' },
    { id: createId('interest'), name: '志愿讲师' },
  ],
  awards: [
    {
      id: createId('award'),
      name: 'ADC 年度设计奖',
      issuer: 'Art Directors Club',
      year: '2021',
    },
  ],
});

export const templates: ResumeTemplate[] = [
  {
    id: 'modern',
    name: '现代蓝',
    description: '适合互联网与工程岗位，强调结构化信息与品牌色点缀。',
    accentColor: '#2563eb',
    previewStyle: 'modern',
    sample: createSampleResume(),
  },
  {
    id: 'classic',
    name: '商务黑',
    description: '面向产品/运营岗位，排版稳重，突出业务数据与成果。',
    accentColor: '#0ea5e9',
    previewStyle: 'classic',
    sample: productResume,
  },
  {
    id: 'creative',
    name: '创意暖调',
    description: '为设计师/创意岗位准备，加入更多留白与装饰元素。',
    accentColor: '#ec4899',
    previewStyle: 'creative',
    sample: designerResume,
  },
];
