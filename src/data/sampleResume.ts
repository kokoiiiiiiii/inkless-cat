import { createId } from '../utils/id';
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
} from '../types/resume';

const generateId = (prefix: string): string => createId(prefix);

const createSkills = (): ResumeSkill[] => [
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

const createExperience = (): ResumeExperience[] => [
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

const createEducation = (): ResumeData['education'] => [
  {
    id: generateId('edu'),
    school: '某某大学',
    degree: '计算机科学与技术 本科',
    startDate: '2014',
    endDate: '2018',
    details: '优秀毕业生、ACM 校队成员，毕业设计为前端可视化搭建平台',
  },
];

const createProjects = (): ResumeProject[] => [
  {
    id: generateId('proj'),
    name: 'ResumeCraft 在线简历平台',
    role: '全栈开发者',
    summary:
      '打造可视化简历编辑器，支持拖拽排版、模板切换与 PDF 导出，服务 5w+ 用户',
    link: 'https://github.com/example/resume-craft',
  },
  {
    id: generateId('proj'),
    name: 'FlowChart Pro 协同画板',
    role: '前端负责人',
    summary:
      '基于 WebSocket 实现多人实时协作，优化绘制体验并在教育行业落地',
    link: '',
  },
];

const createSocials = (): ResumeData['socials'] => [
  { id: generateId('social'), label: 'GitHub', url: 'https://github.com/username' },
  { id: generateId('social'), label: 'LinkedIn', url: 'https://www.linkedin.com/in/username' },
  { id: generateId('social'), label: '个人主页', url: 'https://username.dev' },
];

export const createSampleResume = (): ResumeData => ({
  personal: {
    fullName: '陈情',
    title: '高级全栈工程师 | React & TypeScript & .NET',
    email: 'chenqing@example.com',
    phone: '+86 138-0000-0000',
    location: '上海',
    photo: '',
    summary:
      '拥有 6 年全栈开发经验，专注于构建高性能、可维护的 Web 应用。在设计系统、复杂交互和工程化方面有丰富实践，擅长与跨职能团队协作推动产品创新。',
    extras: [
      { id: generateId('extra'), label: '个人网站', value: 'https://chenqing.dev' },
      { id: generateId('extra'), label: 'GitHub', value: 'https://github.com/chenqing' },
    ] satisfies ResumePersonalExtra[],
  },
  socials: createSocials(),
  experience: createExperience(),
  education: createEducation(),
  projects: createProjects(),
  skills: createSkills(),
  languages: [
    { id: generateId('lang'), name: '中文', level: '母语' },
    { id: generateId('lang'), name: '英语', level: '熟练（C1）' },
  ] satisfies ResumeLanguage[],
  interests: [
    { id: generateId('interest'), name: '开源贡献' },
    { id: generateId('interest'), name: '骑行与户外' },
    { id: generateId('interest'), name: '技术写作' },
  ] satisfies ResumeInterest[],
  awards: [
    {
      id: generateId('award'),
      name: '公司年度技术创新奖',
      issuer: '某某科技公司',
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
});

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
