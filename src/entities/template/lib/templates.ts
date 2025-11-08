import { createSampleResume } from '@entities/resume';

import type { ResumeTemplate } from '../types';
import { designerSamples } from './samples/designerResume';
import { engineerSamples } from './samples/engineerResume';
import { productSamples } from './samples/productResume';

const defaultSamples = {
  'zh-CN': createSampleResume('zh-CN'),
  en: createSampleResume('en'),
} as const;

export const templates: ResumeTemplate[] = [
  {
    id: 'modern-blue',
    name: '现代蓝',
    description: '适合科技互联网岗位，强调清晰的信息层级与稳重的配色。',
    accentColor: '#2563eb',
    previewStyle: 'modern',
    sample: defaultSamples['zh-CN'],
    localizedSamples: {
      'zh-CN': defaultSamples['zh-CN'],
      en: defaultSamples.en,
    },
  },
  {
    id: 'dark-contrast',
    name: '暗黑质感',
    description: '适合求职设计、创意类岗位，深浅对比强化视觉风格。',
    accentColor: '#22d3ee',
    previewStyle: 'classic',
    sample: designerSamples['zh-CN'],
    localizedSamples: {
      'zh-CN': designerSamples['zh-CN'],
      en: designerSamples.en,
    },
  },
  {
    id: 'creative-pastel',
    name: '柔彩创意',
    description: '暖色调突出亲和力，适合品牌/市场等需要故事性的岗位。',
    accentColor: '#fb7185',
    previewStyle: 'creative',
    sample: productSamples['zh-CN'],
    localizedSamples: {
      'zh-CN': productSamples['zh-CN'],
      en: productSamples.en,
    },
  },
  {
    id: 'customizable',
    name: '自定义主题',
    description: '支持自定义主色与字体，可快速匹配企业品牌调性。',
    accentColor: '#6366f1',
    previewStyle: 'custom',
    sample: engineerSamples['zh-CN'],
    localizedSamples: {
      'zh-CN': engineerSamples['zh-CN'],
      en: engineerSamples.en,
    },
    theme: {
      accent: '#6366f1',
      heading: '#0f172a',
      subheading: '#312e81',
      text: '#1e293b',
      muted: '#64748b',
      background: '#f8fafc',
      cardBackground: '#ffffff',
      cardBorder: '#e2e8f0',
      divider: '#e2e8f0',
    },
  },
];
