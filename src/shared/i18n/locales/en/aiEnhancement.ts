export const aiEnhancement = {
  trigger: 'AI polish',
  triggerWithField: 'Polish {field} with AI',
  title: 'AI resume enhancement',
  close: 'Close AI enhancement',
  fields: {
    personalSummary: 'Personal summary',
    experienceHighlights: 'Experience · Highlights',
    projectSummary: 'Project summary',
  },
  providerNotConfigured: 'Configure a model service in AI settings first.',
  providerStatus: {
    incomplete: 'Provider status: configuration is incomplete.',
    invalid: 'Provider status: check the configuration.',
    ready: 'Provider status: configured and ready.',
    testing: 'Provider status: testing the connection.',
    success: 'Provider status: the latest connection test succeeded.',
    failure: 'Provider status: the latest connection test failed.',
    cancelled: 'Provider status: the latest connection test was cancelled.',
  },
  modeLabel: 'Enhancement mode',
  modes: {
    professional: {
      label: 'Professionalize',
      description: 'Make the wording clear and professional for a formal resume.',
    },
    concise: {
      label: 'Make concise',
      description: 'Remove redundancy while keeping key facts, technologies, and meaning.',
    },
    expand: {
      label: 'Expand',
      description:
        'Improve completeness using source facts only; stay conservative when details are sparse.',
    },
    outcome: {
      label: 'Outcome focused',
      description:
        'Emphasize supported actions and outcomes without adding metrics or achievements.',
    },
  },
  original: 'Original',
  emptyOriginal: 'This field is empty. Add factual content before generating a suggestion.',
  suggestion: 'AI suggestion (editable)',
  manualEditHint:
    'Experience highlights must keep the original number and order of items. Verify facts and proper nouns before applying.',
  privacyNotice:
    'The selected content is sent to the third-party AI service you configured. It may include personal information and may incur API costs. AI can be inaccurate; review the suggestion before applying it.',
  generating: 'Generating suggestion…',
  validating: 'Checking the completed suggestion…',
  suggestionReady: 'Suggestion is ready to review. Your resume has not changed.',
  livePreview: 'Live preview (not applied)',
  structuredPreview: 'Generating structured suggestions (preview only)',
  structuredPreviewHint:
    'This is incomplete JSON progress. It cannot be edited or applied until generation and validation finish.',
  waitingForContent: 'Waiting for the first response…',
  cancelled: 'Request cancelled. Your resume has not changed.',
  generate: 'Polish with AI',
  regenerate: 'Regenerate',
  cancelRequest: 'Cancel generation',
  keepOriginal: 'Keep original',
  apply: 'Apply suggestion',
  applied: 'AI suggestion applied. You can undo this change.',
  undoComplete: 'The AI change was undone.',
  undoUnavailable: 'The workspace changed, so this AI change cannot be undone.',
  undoConflict:
    'This field changed after the AI edit. Undo was skipped to protect the newer content.',
  inputBudget: 'Input size: {current} / {limit} UTF-16 code units.',
  errors: {
    empty_output: 'The AI returned an empty result. Generate a new suggestion.',
    response_too_long:
      'The suggestion exceeds this field’s length limit. Regenerate or shorten it manually.',
    invalid_control_characters:
      'The suggestion contains unsupported control characters and cannot be applied.',
    code_fence: 'The suggestion contains an extra Markdown code fence. Generate a new suggestion.',
    invalid_highlights:
      'The experience suggestion has an invalid format. Generate a new suggestion.',
    item_count_mismatch:
      'The number of experience items changed. Regenerate or correct the list manually.',
    item_too_long: 'An experience item exceeds its length limit and cannot be applied.',
    invalid_response: 'The AI returned an invalid response format. Generate a new suggestion.',
    target_missing: 'This field no longer exists. Close the panel and choose a field again.',
    source_changed: 'The original text changed. Generate a new suggestion.',
    workspace_changed: 'The resume workspace changed. Open the enhancement panel again.',
    provider_changed: 'The AI service configuration changed. Check it and generate again.',
    empty_source: 'There is no text to enhance. Add source content first.',
    input_too_long:
      'The selected content exceeds the AI enhancement input limit. Shorten it and try again.',
    provider_error:
      'The AI request failed. Check the configuration, network, or service and try again.',
  },
} as const;
