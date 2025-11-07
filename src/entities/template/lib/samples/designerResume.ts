import type { ResumeData } from '@entities/resume';
import { createId } from '@shared/lib/id';

import { buildResume } from './helpers';

export const designerResume: ResumeData = buildResume({
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
