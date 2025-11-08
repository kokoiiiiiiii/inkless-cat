export const template = {
  panelTitle: '模板与样式',
  panelDescription: '选择不同模板快速切换配色与排版，也可创建属于自己的模板。',
  systemTemplates: '系统模板',
  customTemplates: '自定义模板',
  customTemplatesHint: '保存当前简历为模板，随时快速切换',
  emptyCustomTip: '还没有自定义模板，填写下方表单即可保存当前简历。',
  actions: {
    useStyle: '使用样式',
    loadSample: '填充示例',
    updateSample: '更新示例',
    delete: '删除',
  },
  badges: {
    current: '当前',
    custom: '自定义',
  },
  inputs: {
    namePlaceholder: '自定义模板',
    descriptionPlaceholder: '模板用途说明',
  },
  creation: {
    nameLabel: '模板名称',
    namePlaceholder: '例如：深色商务模板',
    styleLabel: '风格',
    descriptionLabel: '模板描述（可选）',
    descriptionPlaceholder: '简要说明适用场景或亮点',
    accentLabel: '品牌色',
    submit: '保存当前简历为模板',
  },
  confirmLoadSample: '将使用该模板的示例数据覆盖当前内容，是否继续？',
  controls: {
    styleLabel: '风格',
    accentLabel: '品牌色',
  },
  styleOptions: {
    modern: '现代风格（Modern）',
    classic: '商务风格（Classic）',
    creative: '创意风格（Creative）',
    custom: '自定义风格（Custom）',
  },
  themeFields: {
    background: '背景',
    heading: '标题',
    subheading: '副标题',
    text: '正文',
    muted: '次要信息',
    cardBackground: '卡片背景',
    cardBorder: '卡片边框',
    divider: '分隔线',
  },
  systems: {
    'modern-blue': {
      name: '现代蓝',
      description: '适合科技互联网岗位，强调清晰的信息层级与稳重的配色。',
    },
    'dark-contrast': {
      name: '暗黑质感',
      description: '适合求职设计、创意类岗位，深浅对比强化视觉风格。',
    },
    'creative-pastel': {
      name: '柔彩创意',
      description: '暖色调突出亲和力，适合品牌/市场等需要故事性的岗位。',
    },
    customizable: {
      name: '自定义主题',
      description: '支持自定义主色与字体，可快速匹配企业品牌调性。',
    },
  },
} as const;
