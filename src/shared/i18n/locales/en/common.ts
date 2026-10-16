export const common = {
  ok: 'OK',
  cancel: 'Cancel',
  dismiss: 'Dismiss notification',
  confirmations: {
    clearResume: 'Clear all current resume content? You can undo this for 12 seconds.',
    importResume:
      'Importing this file will replace the current resume and, for a workspace file, its settings. Continue?',
    loadSample:
      'Replace the current resume with the selected sample? You can undo this for 12 seconds.',
    updateTemplateSample: 'Replace this template’s saved sample with the current resume?',
    deleteTemplate: 'Delete the custom template “{name}”? You can undo this for 12 seconds.',
  },
  feedback: {
    errorTitle: 'Action failed',
    successTitle: 'Action completed',
    infoTitle: 'Info',
    importResumeSuccess: 'Resume imported.',
    importWorkspaceSuccess: 'Workspace restored.',
    exportResumeSuccess: 'Resume JSON exported.',
    exportWorkspaceSuccess: 'Workspace JSON exported.',
    exportMarkdownSuccess: 'Markdown exported.',
    printStarted: 'Switched to preview and started printing.',
    undoAvailableTitle: 'Undo is available briefly',
    undo: 'Undo',
    undoLastChange:
      'Your previous resume and workspace settings are saved temporarily. Undo is available for 12 seconds.',
    undoThisSessionOnly:
      'You can undo this for 12 seconds on this page. Refreshing will end the undo window.',
    undoComplete: 'The previous resume and workspace settings were restored.',
    undoUnavailable:
      'The data changed after this action. Undo was cancelled to protect the newer changes.',
  },
  errors: {
    invalidJson: 'Import failed. The file is not valid JSON.',
    invalidResume: 'Import failed. The resume payload is invalid.',
    invalidWorkspace: 'Import failed. The workspace payload is invalid.',
    unsupportedResumeVersion: 'Import failed. This resume version is not supported.',
    unsupportedWorkspaceVersion: 'Import failed. This workspace version is not supported.',
    importFailed: 'Import failed. Please review the file content.',
    exportFailed: 'Export failed. Please try again.',
    printFailed: 'Print failed. Please check browser print support.',
    fileReadFailed: 'Failed to read the file. Please try again.',
    fileTooLarge: 'The file is too large. Please choose a smaller file.',
    limitExceeded: 'The content limit ({limit}) has been reached. This change was not applied.',
    operationFailed: 'The action failed. The previous data was restored.',
    storageFailed: 'Local storage failed. Some data may not have been restored.',
  },
} as const;
