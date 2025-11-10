export const topbar = {
  loadSample: 'Load Sample',
  clear: 'Clear',
  import: 'Import',
  export: 'Export',
  exportMarkdown: 'Export Markdown',
  print: 'Print / PDF',
  themeLight: 'Light Mode',
  themeDark: 'Dark Mode',
  toggleLang: '中文',
  importError: 'Import failed. Please ensure the file is a valid JSON resume.',
  logoAlt: 'Inkless Cat logo',
  subtitle: 'Inkless Cat Resume Editor',
  githubLabel: 'GitHub Repository',
  langSwitch: {
    title: 'Switch language',
    description:
      'Switch to the {language} template? Loading the template clears your current content. Switching language only will keep your resume unchanged.',
    languageOnly: 'Switch language only',
    loadTemplate: 'Load {language} template',
    localeNames: {
      en: 'English',
      'zh-CN': 'Chinese',
    },
  },
} as const;
