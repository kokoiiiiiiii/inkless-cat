export const template = {
  panelTitle: 'Templates & Styles',
  panelDescription:
    'Thumbnails illustrate each layout. Applying a style changes appearance only; loading a sample replaces resume content after confirmation.',
  selectionLegend:
    'Choose one resume template. Applying a style will not change your resume content.',
  thumbnailLabel: 'Layout',
  systemTemplates: 'System Templates',
  customTemplates: 'Custom Templates',
  customTemplatesHint: 'Save the current resume as a template to switch quickly',
  emptyCustomTip: 'No custom templates yet. Use the form below to save one.',
  actions: {
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
    unnamedName: 'Unnamed template',
    descriptionPlaceholder: 'What this template is for',
  },
  validation: {
    nameRequired: 'A template name is required. The previous valid name has been restored.',
    nameTooLong:
      'Template names can contain up to {limit} characters. The previous valid name has been restored.',
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
      description: 'Warm colors with a storytelling feel for brand and marketing roles.',
    },
    customizable: {
      name: 'Custom Theme',
      description: 'Customize the accent and typography to match a brand.',
    },
  },
  gallery: {
    eyebrow: 'PROFESSIONAL TEMPLATE GALLERY',
    title: 'Template Gallery',
    description:
      'Browse built-in and custom templates. Opening details does not change your selected template or resume.',
    detailsTitle: 'Template Details',
    detailsDescription: 'Review this template’s identity and illustrative layout.',
    livePreviewTitle: 'Live Resume Preview',
    livePreviewDescription:
      'Preview this template with your current resume and active sections. Returning to the gallery does not apply it.',
    livePreview: 'Live Preview',
    previewOnly: 'Preview only',
    livePreviewNotice:
      'This uses your current resume and active sections. It has not been applied and will not change your saved workspace.',
    liveResumePreview: 'Live resume preview',
    previewUnavailable: 'Live preview unavailable',
    previewUnavailableDescription:
      'This template is no longer available in the registry. Return to the gallery to choose another template.',
    unsupportedPreviewStyle:
      'This template uses the unsupported preview style “{style}”. A live preview is unavailable because no matching renderer exists.',
    unknownStyle: 'unknown',
    searchAndFilter: 'Search and filter templates',
    searchLabel: 'Search templates',
    searchPlaceholder: 'Search by name or description',
    clearSearch: 'Clear search',
    filterLabel: 'Filter templates by source',
    allTemplates: 'All templates',
    builtIn: 'Built-in',
    custom: 'Custom',
    source: 'Source',
    templateId: 'Template ID',
    singleTemplateCount: '1 template',
    templateCount: '{count} templates',
    current: 'Current',
    currentlyApplied: 'Currently applied',
    notCurrentlyApplied: 'Not currently applied',
    missingTemplate: 'Missing template',
    missingCurrentDescription:
      'Saved template “{templateId}” is unavailable. “{fallbackName}” is shown as a display fallback only; it has not been selected or written to state.',
    noResultsTitle: 'No templates found',
    noResultsDescription: 'No template name or description matches “{query}”.',
    emptyGroupDescription: 'There are no templates in this group yet.',
    noBuiltInTemplates: 'No built-in templates are available.',
    noCustomTemplates: 'No custom templates yet.',
    noDescription: 'No description provided.',
    unnamedTemplate: 'Unnamed template',
    viewDetails: 'View Details',
    backToGallery: 'Back to Gallery',
    backToWorkspace: 'Back to Workspace',
    manageTemplates: 'Manage templates',
    illustrativeThumbnail: 'Illustrative thumbnail',
    illustrativeNote:
      'This thumbnail uses fixed sample content to illustrate the layout. It does not show your resume.',
    thumbnailUnavailable: 'Illustrative thumbnail unavailable for this template style.',
    thumbnailUnavailableShort: 'Unavailable',
    detailUnavailable: 'Template unavailable',
    detailUnavailableDescription:
      'This template is no longer in the registry. Return to the gallery to choose another detail view.',
  },
} as const;
