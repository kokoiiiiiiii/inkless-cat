import type { ResumeData } from '@entities/resume';
import { createId } from '@shared/lib/id';

import { buildResume } from './helpers';

export const engineerResume: ResumeData = buildResume({
  personal: {
    fullName: '赵一',
    title: '前端工程师 | 编辑器 & 可视化',
    email: 'yizhao@example.com',
    phone: '+86 136-8888-0000',
    location: '深圳',
    photo: '',
    summary:
      '专注前端工程化与低代码编辑器的高级工程师，擅长复杂交互、性能优化与多端适配。推动可视化搭建工具落地，降低交付成本 40%。',
  },
  socials: [
    { id: createId('social'), label: 'GitHub', url: 'https://github.com/yizhao-dev' },
    { id: createId('social'), label: '技术博客', url: 'https://blog.yizhao.dev' },
  ],
  experience: [
    {
      id: createId('exp'),
      company: '某某创新科技',
      role: '高级前端工程师',
      location: '深圳',
      startDate: '2020-08',
      endDate: '至今',
      highlights: [
        '负责主站拖拽式页面搭建器，构建模块化插件体系，实现模块复用率 70%',
        '引入可视化调试与性能分析工具，降低首屏渲染时间 35%',
        '搭建 CI/CD 流水线并引入 E2E 测试，线上事故率下降 60%',
      ],
    },
    {
      id: createId('exp'),
      company: '某某互联网公司',
      role: '前端工程师',
      location: '广州',
      startDate: '2017-03',
      endDate: '2020-07',
      highlights: [
        '参与构建数据可视化平台，支持 10+ 图表类型与自定义指标配置',
        '负责组件库重构与设计语言统一，减少重复实现 80%',
      ],
    },
  ],
  projects: [
    {
      id: createId('proj'),
      name: 'Flow Builder 可视化搭建器',
      role: '前端负责人',
      summary:
        '搭建流程设计器与表单自动化工具，支持节点配置、版本管理与权限控制，帮助业务团队自主搭建运营活动。',
      link: 'https://github.com/yizhao-dev/flow-builder',
    },
  ],
  education: [
    {
      id: createId('edu'),
      school: '某某理工大学',
      degree: '软件工程 本科',
      startDate: '2012',
      endDate: '2016',
      details: 'GPA 3.6/4.0，论文研究方向为 WebGL 可视化',
    },
  ],
  skills: [
    {
      id: createId('skill'),
      title: '技术能力',
      items: ['React', 'TypeScript', 'Node.js', 'WebGL', 'Electron'],
    },
    {
      id: createId('skill'),
      title: '工程化',
      items: ['Monorepo', '微前端', '自动化测试', '性能优化'],
    },
  ],
  languages: [
    { id: createId('lang'), name: '中文', level: '母语' },
    { id: createId('lang'), name: '英语', level: '熟练（C1）' },
  ],
  interests: [
    { id: createId('interest'), name: '技术分享' },
    { id: createId('interest'), name: '骑行' },
    { id: createId('interest'), name: '摄影' },
  ],
  awards: [
    {
      id: createId('award'),
      name: '最佳团队协作奖',
      issuer: '某某创新科技',
      year: '2021',
    },
  ],
});
