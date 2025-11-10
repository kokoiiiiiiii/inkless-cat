export const topbar = {
  loadSample: '载入示例',
  clear: '清空',
  import: '导入',
  export: '导出',
  exportMarkdown: '导出 Markdown',
  print: '打印 / PDF',
  themeLight: '日间模式',
  themeDark: '夜间模式',
  toggleLang: 'English',
  importError: '导入失败，请确认文件内容为合法的 JSON 简历数据。',
  logoAlt: 'Inkless Cat 标志',
  subtitle: '无墨猫简历编辑器',
  githubLabel: 'GitHub 仓库',
  langSwitch: {
    title: '切换语言',
    description:
      '是否切换到{language}模板？选择“加载{language}模板”将清空当前内容，仅切换语言则保留当前内容。',
    languageOnly: '仅切换语言',
    loadTemplate: '加载{language}模板',
    localeNames: {
      en: '英文',
      'zh-CN': '中文',
    },
  },
} as const;
