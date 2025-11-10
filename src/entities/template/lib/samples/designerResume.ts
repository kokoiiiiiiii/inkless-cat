import type { ResumeData } from '@entities/resume';
import { createId } from '@shared/lib/id';

import { buildResume } from './helpers';

const socials = () => [
  { id: createId('social'), label: 'Portfolio', url: 'https://lisui.design' },
  { id: createId('social'), label: 'Behance', url: 'https://www.behance.net/lisui' },
  { id: createId('social'), label: 'Dribbble', url: 'https://dribbble.com/lisui' },
];

export const designerResumeZh: ResumeData = buildResume({
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
  socials: socials(),
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
      summary: '打造完整品牌识别系统与包装插画，在新品上线三个月内带动销量提升 120%。',
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

export const designerResumeEn: ResumeData = buildResume({
  personal: {
    fullName: 'Sui Li',
    title: 'Brand & Visual Designer',
    email: 'sui.li@example.com',
    phone: '+86 138-5555-6666',
    location: 'Shanghai · Remote',
    photo: '',
    summary:
      'Freelance visual designer partnering with tech and lifestyle brands. Specialises in rebrands, scalable design systems, and illustration that drive brand awareness and conversion.',
  },
  socials: socials(),
  experience: [
    {
      id: createId('exp'),
      company: 'Brightwave Studio',
      role: 'Visual Designer',
      location: 'Remote',
      startDate: '2019-01',
      endDate: 'Present',
      highlights: [
        'Led 15+ rebrand projects across consumer electronics, education, and lifestyle verticals.',
        'Delivered extensible design systems that preserved brand voice while cutting design ops effort by 30%.',
        'Crafted illustration and motion packages that lifted pre-launch conversion by 40%.',
      ],
    },
    {
      id: createId('exp'),
      company: 'Pixel Interaction Co.',
      role: 'Visual Designer',
      location: 'Shanghai',
      startDate: '2016-07',
      endDate: '2018-12',
      highlights: [
        'Owned product visual language and campaign design for a platform serving 5M+ users.',
        'Partnered with product and frontend teams to build a shared asset library, doubling delivery efficiency.',
      ],
    },
  ],
  projects: [
    {
      id: createId('proj'),
      name: 'Luna Coffee Rebrand',
      role: 'Lead Visual Designer',
      summary:
        'Created a complete identity system and packaging illustration that boosted new product sales by 120% within three months.',
      link: 'https://lisui.design/luna',
    },
    {
      id: createId('proj'),
      name: 'Flow Habit App',
      role: 'Visual Lead',
      summary:
        'Defined the illustration style and shipped 30+ UI components for a wellness app, earning the 2023 Best App Visual Award.',
      link: '',
    },
  ],
  education: [
    {
      id: createId('edu'),
      school: 'Central Art Academy',
      degree: 'B.A. in Visual Communication',
      startDate: '2012',
      endDate: '2016',
      details:
        'Focused on visual communication and illustration; multiple Excellence in Design awards.',
    },
  ],
  skills: [
    {
      id: createId('skill'),
      title: 'Design Focus',
      items: ['Brand Identity', 'Design Systems', 'Illustration', 'Motion Graphics'],
    },
    {
      id: createId('skill'),
      title: 'Tools',
      items: ['Figma', 'Adobe Illustrator', 'After Effects', 'Blender'],
    },
  ],
  languages: [
    { id: createId('lang'), name: 'Chinese', level: 'Native' },
    { id: createId('lang'), name: 'English', level: 'Upper Intermediate (B2)' },
  ],
  interests: [
    { id: createId('interest'), name: 'Ceramics Workshop' },
    { id: createId('interest'), name: 'City-Building Games' },
    { id: createId('interest'), name: 'Volunteer Instructor' },
  ],
  awards: [
    {
      id: createId('award'),
      name: 'ADC Annual Design Award',
      issuer: 'Art Directors Club',
      year: '2021',
    },
  ],
});

export const designerSamples = {
  'zh-CN': designerResumeZh,
  en: designerResumeEn,
} as const;

export const designerResume = designerResumeZh;
