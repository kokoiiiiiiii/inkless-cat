export const template = {
  panelTitle: 'Templates & Styles',
  panelDescription: 'Switch layouts and palettes instantly, or create your own template.',
  systemTemplates: 'System Templates',
  customTemplates: 'Custom Templates',
  customTemplatesHint: 'Save the current resume as a template to switch quickly',
  emptyCustomTip: 'No custom templates yet. Use the form below to save one.',
  actions: {
    useStyle: 'Use Style',
    loadSample: 'Load Sample',
    updateSample: 'Update Sample',
    delete: 'Delete',
  },
  badges: {
    current: 'Current',
    custom: 'Custom',
  },
  inputs: {
    namePlaceholder: 'Custom Template',
    descriptionPlaceholder: 'What this template is for',
  },
  creation: {
    nameLabel: 'Template Name',
    namePlaceholder: 'e.g. Dark Business Template',
    styleLabel: 'Style',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'Briefly describe scenarios or highlights',
    accentLabel: 'Brand Color',
    submit: 'Save Current Resume as Template',
  },
  confirmLoadSample: 'This will replace your current resume with the template sample. Continue?',
  controls: {
    styleLabel: 'Style',
    accentLabel: 'Brand Color',
  },
  styleOptions: {
    modern: 'Modern',
    classic: 'Classic',
    creative: 'Creative',
    custom: 'Custom',
  },
  themeFields: {
    background: 'Background',
    heading: 'Heading',
    subheading: 'Subheading',
    text: 'Body Text',
    muted: 'Muted Text',
    cardBackground: 'Card Background',
    cardBorder: 'Card Border',
    divider: 'Divider',
  },
  systems: {
    'modern-blue': {
      name: 'Modern Blue',
      description: 'Great for tech roles; crisp hierarchy and steady colors.',
    },
    'dark-contrast': {
      name: 'Dark Contrast',
      description: 'Tailored for creative roles with bold light/dark contrast.',
    },
    'creative-pastel': {
      name: 'Creative Pastel',
      description: 'Warm palette with storytelling flair for brand/marketing roles.',
    },
    customizable: {
      name: 'Custom Theme',
      description: 'Match company branding with fully customizable colors and fonts.',
    },
  },
} as const;
