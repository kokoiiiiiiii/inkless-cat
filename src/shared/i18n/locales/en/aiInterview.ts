export const aiInterview = {
  trigger: 'Create Resume with AI',
  title: 'AI resume interview',
  subtitle: 'A guided conversation about your own experience',
  close: 'Pause interview and close',
  closeOnly: 'Close',
  pause: 'Pause',
  cancelInterview: 'Cancel interview',
  startNew: 'Start a new interview',
  startAi: 'Start with AI follow-ups',
  startTemplate: 'Start with guide questions',
  fromScratch: 'Start from scratch',
  startTitle: 'Begin with the opportunity you want',
  startDescription:
    'The interview will ask about your work, projects, education, and skills one step at a time. Skip anything that does not apply, edit earlier answers, or pause at any time. It will not generate or change your formal resume.',
  configureProvider: 'Open AI settings',
  providerConfigured: 'AI service is configured for this page session.',
  providerNotConfigured: 'No AI service is configured. You can still use the interview guide.',
  sessionOnlyNotice:
    'Interview answers stay in this tab’s memory. They are not saved to your resume or browser storage. Refreshing or closing this tab clears them.',
  sessionOnlyTitle: 'Temporary in this page only',
  templateNoNetwork:
    'Guide questions do not send network requests. After configuring AI, you can choose to have the model ask follow-ups based on your answers.',
  privacyTitle: 'Before you send an answer to AI',
  privacyNotice:
    'When you choose AI follow-ups, your answer and a small amount of relevant interview context go directly from this browser to the model service you configured. That service may process them under its own policies. Inkless Cat does not receive them through a server or proxy. AI uses at most 8 recent complete answers, up to 500 characters each and 6,000 characters for the full context. Older answers left out of the context stay in this interview. No example resume is included. You can choose guide questions instead.',
  aiMode: 'AI follow-ups',
  templateMode: 'Guide questions only',
  tabInterview: 'Interview',
  tabSummary: 'Summary',
  phases: {
    targetRole: 'Target role',
    basics: 'Basic details',
    work: 'Work experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    review: 'Answer summary',
  },
  phaseDescriptions: {
    targetRole: 'Set a direction for the conversation. This can be broad or left blank.',
    basics:
      'Share a preferred name or focus only on professional details. Personal details are optional.',
    work: 'Describe your responsibilities and team boundaries. Recent graduates can skip this phase.',
    projects: 'Tell me what you personally contributed and what the project was for.',
    education: 'Share relevant education or training, or skip anything you do not want to include.',
    skills: 'Name the tools and skills you use, with examples if helpful.',
    review: 'Review what you shared. This is an interview summary, not a finished resume.',
  },
  questions: {
    targetRole: {
      initial:
        'What role or kind of opportunity are you aiming for? A broad answer is fine, and you may skip it.',
      fallback: 'What strengths or kinds of work would you like the next role to make use of?',
    },
    basics: {
      initial:
        'What name or professional title, if any, would you like to use? You can skip personal identifiers.',
      fallback: 'Which parts of your background would you most like an interviewer to notice?',
    },
    work: {
      initial:
        'What work experience would you like to share? If you have none, you can say so or skip this phase.',
      fallback:
        'Which responsibilities did you personally own, and which were shared with your team?',
    },
    projects: {
      initial: 'Tell me about a project you would like to include, and what it was meant to do.',
      fallback:
        'What did you personally build or contribute, and what technologies did you use? If there was no measurable result, you can say so.',
    },
    education: {
      initial:
        'What education, training, or coursework is relevant to your goals? You may skip this phase.',
      fallback: 'Is there a particular subject, course, or credential you would like to mention?',
    },
    skills: {
      initial:
        'Which skills or technologies do you use most often, and where have you applied them?',
      fallback: 'Which of those skills are strongest today, and which are you still developing?',
    },
    review: {
      initial: 'Would you like to review your answers before finishing?',
      fallback: 'Would you like to review your answers before finishing?',
    },
  },
  progress: 'Phase {current} of {total}',
  phaseActive: 'In progress',
  phaseSkipped: 'Skipped: {phase}',
  questionSource: {
    ai: 'AI follow-up',
    template: 'Guide question',
  },
  generating: 'AI is organizing one follow-up question…',
  validating: 'Checking the question…',
  preview: 'Question preview (not yet accepted)',
  waiting: 'Waiting for the completed question…',
  answerLabel: 'Your answer',
  answerPlaceholder:
    'Write what you remember. “I don’t know” or “no measurable result” is a useful answer too.',
  answerBudget:
    'AI receives at most 8 recent complete answers, up to 500 characters each and 6,000 characters total. Older answers outside this context remain in the interview.',
  answerCounter: '{count} / 500 characters (some emoji count as 2)',
  answerOverBudget:
    'This answer exceeds AI’s 500-character limit. Your full draft is still here; shorten it before sending.',
  answerDraftTooLong:
    'A draft can contain up to 20,000 characters. This paste did not change your current draft; shorten the text and try again.',
  send: 'Send answer',
  enterHint: 'Enter to send · Shift + Enter for a new line',
  skipQuestion: 'Skip question',
  skipPhase: 'Skip this phase',
  nextPhase: 'Continue to next phase',
  editAnswer: 'Edit answer',
  editConfirmTitle: 'Return to this answer and restart the later interview branch?',
  editConfirmBody:
    'This removes {questionCount} later questions and {answerCount} answered responses, then starts again here. Cancel to keep the interview unchanged. After confirming, you can restore the previous interview before submitting a new answer or moving to another question.',
  keepCurrentInterview: 'Keep current interview',
  confirmEditAnswer: 'Return and edit',
  restorePreviousInterview: 'Restore previous interview',
  restoreInterviewNotice:
    'The complete interview from before this edit is available to restore. Restoring replaces the current unsent draft.',
  answerSkipped: 'Skipped',
  emptyAnswer: 'No answer yet',
  continueWithTemplate: 'Continue with a guide question',
  retryQuestion: 'Retry AI question',
  chooseAiAgain: 'Choose AI follow-ups again',
  cancelGeneration: 'Cancel question generation',
  cancelled: 'Generation was cancelled. Your answer is still here.',
  retryHint:
    'Your answer is preserved. Retry when you are ready, or continue with a guide question.',
  consentTitle: 'Choose how to continue',
  consentBody:
    'Your answer and a small amount of relevant interview context will go directly from this browser to the model service you configured. That service may process this content under its own policies. Inkless Cat does not receive it through a server or proxy. Your API key stays only in this page session’s memory. No example resume is included. Choose AI follow-ups to send it; otherwise, continue with guide questions without a model request.',
  consentAi: 'Send this answer and use AI',
  consentTemplate: 'Keep answers here and use guide questions',
  summaryTitle: 'Interview summary',
  summaryDisclaimer:
    'These are your interview answers, not a generated resume. Nothing has been written to your resume.',
  summaryEmpty: 'Your answers and skipped phases will appear here as you go.',
  summaryUnknown: 'Not provided',
  facts: {
    title: 'Verify facts',
    description:
      'Turn answers into source-linked candidate facts. Review and confirm each AI-extracted item yourself.',
    semanticReviewNotice:
      'A matching phrase links a suggestion to its source; it does not prove the value belongs in that field. Review every labeled field before confirming.',
    originAi: 'AI suggestion',
    originManual: 'Added by you',
    sourceLinked: 'Source answer linked',
    sourceChanged: 'Source answer changed or unavailable',
    pendingCount: '{count} items need review',
    confirmedCount: '{count} confirmed',
    unconfirmedCount: '{count} unconfirmed',
    staleCount: '{count} invalidated',
    extract: 'Extract facts with AI',
    retryExtraction: 'Review and retry',
    extracting: 'Extracting…',
    extractingStatus: 'Extracting candidate facts. This request will not retry automatically.',
    addManually: 'Organize facts manually',
    closeManual: 'Close manual entry',
    manualWithoutProvider:
      'No AI service is available. You can still add facts manually and link them to an interview answer.',
    consentTitle: 'Answers that will be sent',
    consentBody:
      'These {count} answers ({characters} characters) will be sent directly to {model} ({endpoint}) for fact extraction. Your API key is not included in the model messages, and no example resume is sent. Review the answers before sending.',
    omittedAnswers: '{count} earlier answers will be left out.',
    sendAndExtract: 'Send these answers and extract',
    cancel: 'Cancel',
    cancelRequest: 'Cancel request',
    empty:
      'No candidate facts yet. Extract or organize them here; nothing is written to your resume automatically.',
    manualTitle: 'Add a fact',
    factType: 'Fact type',
    sourceAnswer: 'Source answer',
    chooseSource: 'Choose an answered question',
    addFact: 'Add unconfirmed fact',
    invalidFact:
      'Enter valid content. Each value is limited to 600 characters and each list to 12 items.',
    editing: 'Editing candidate fact',
    edit: 'Edit',
    saveEdit: 'Save and review again',
    cancelEdit: 'Cancel edit',
    confirmReviewed: 'I reviewed these fields',
    reject: 'Reject',
    viewSource: 'View source answer',
    sourceQuestion: 'Question',
    sourceIds: 'Question ID: {questionId} · Answer ID: {answerId}',
    sourceUnavailable:
      'The source answer changed, was removed, or the interview restarted. This fact cannot be used for generation.',
    conflictNotice:
      'Only the fields listed below conflict. Confirming this version removes those disputed values from the other candidate and keeps its independent fields for your review.',
    conflictFields: 'Conflicting fields',
    staleNotice:
      'The source answer changed or is unavailable. This fact is invalidated; extract it again or organize it manually.',
    confirmedSummary: 'Confirmed facts ({count})',
    kinds: {
      targetRole: 'Target role',
      personal: 'Personal details',
      experience: 'Work experience',
      project: 'Project experience',
      education: 'Education',
      skill: 'Skill',
    },
    fields: {
      targetRole: 'Target role',
      fullName: 'Name',
      email: 'Email',
      phone: 'Phone',
      location: 'Location',
      summary: 'Summary',
      company: 'Employer / company (not a client)',
      role: 'Job title',
      startDate: 'Start date',
      endDate: 'End date',
      responsibilities: 'Responsibilities (ownership unspecified)',
      individualResponsibilities: 'Personally owned',
      teamResponsibilities: 'Shared with the team',
      achievements: 'Outcome or achievement',
      projectName: 'Project name',
      link: 'Link',
      school: 'School',
      degree: 'Degree or field',
      details: 'Details',
      skill: 'Skill',
    },
    status: {
      pending: 'Field meanings need your review',
      confirmed: 'You confirmed these field meanings',
      rejected: 'Rejected',
      conflict: 'Conflict',
      stale: 'Invalidated',
    },
    errors: {
      providerError:
        'Fact extraction failed. Your answers remain in this page. Review what will be sent before manually retrying, or organize facts by hand.',
      timeout: 'Fact extraction timed out. Review the answers and retry manually.',
      cancelled: 'Fact extraction was cancelled. No candidate result was stored.',
      providerChanged:
        'The AI service configuration changed and the old response was discarded. Review the answers before trying again.',
      sourceChanged:
        'A source answer changed during extraction, so the old response was discarded. Review the answers before trying again.',
      providerNotConfigured: 'No AI service is configured. You can organize facts manually.',
      noAnswers: 'There are no answered questions to extract.',
      inputTooLong:
        'The answers exceed this extraction request’s size limit. Shorten relevant answers or organize facts manually.',
      invalidOutput:
        'The model output failed structure or source validation. No candidate facts were saved.',
    },
  },
  generation: {
    title: 'Build a resume draft',
    description:
      'Build a separate draft only from facts you confirmed whose source answers are still current. AI will not infer facts or send an extra request automatically.',
    deterministicNotice:
      'Using {count} confirmed facts with current sources. Fields use fixed mappings; no sample resume is read or mixed in.',
    build: 'Build draft',
    rebuild: 'Rebuild from current facts',
    noConfirmedFacts:
      'Review and confirm facts above first. Pending, conflicted, and invalidated facts are excluded.',
    conflictsTitle: 'Unresolved conflicts ({count})',
    conflictsExcluded:
      'Conflicted candidate facts are excluded. Resolve them and rebuild from the current facts.',
    staleDraft:
      'The facts, interview, or AI service changed. This older draft is invalid and cannot be written; rebuild it.',
    missingTitle: 'Missing fields ({count})',
    noMissing:
      'These common fields have content. Review each fact and resume wording before applying.',
    schemaError: 'The draft failed ResumeData Schema validation. Fix the fields before continuing.',
    editTitle: 'Edit candidate resume',
    experience: 'Experience {index}',
    project: 'Project {index}',
    education: 'Education {index}',
    responsibilityBoundary:
      'Keep each responsibility prefix: personally owned, shared with the team, or ownership unspecified.',
    previewTitle: 'Separate draft preview',
    includedFacts:
      'This draft uses {count} confirmed facts. Interview answers and candidate facts remain in this page’s memory.',
    prepareReplace: 'Review and replace current resume',
    replaceTitle: 'Confirm resume replacement',
    replaceNotice:
      'This replaces the single active Workspace resume. The app checks for changes before writing and keeps an in-memory snapshot that you can undo on this page.',
    replaceAcknowledgement:
      'I reviewed the candidate preview and understand it will replace the current resume.',
    confirmReplace: 'Confirm resume replacement',
    cancel: 'Back to review',
    resumeChanged:
      'The active resume changed while you were confirming. Nothing was written; review it again before confirming.',
    applied:
      'The candidate resume was applied. You can restore the previous resume from its in-memory snapshot on this page.',
    undo: 'Undo and restore previous resume',
    undoUnavailable:
      'The active resume changed again. The old snapshot is disabled to avoid overwriting later edits.',
    undone: 'The active resume has been restored to its previous version.',
    missing: {
      name: 'Name',
      title: 'Target role/title',
      contact: 'Email or phone',
      summary: 'Summary',
      experience: 'Work experience',
      experienceCompany: 'Employer/company in experience',
      experienceRole: 'Role in experience',
      experienceDates: 'Dates in experience',
      projects: 'Projects',
      projectName: 'Project name',
      education: 'Education',
      educationSchool: 'School',
      educationDegree: 'Degree or field',
      skills: 'Skills',
    },
    fields: {
      name: 'Name',
      title: 'Target role/title',
      email: 'Email',
      phone: 'Phone',
      location: 'Location',
      summary: 'Summary',
      company: 'Employer/company',
      role: 'Role or responsibility',
      startDate: 'Start date',
      endDate: 'End date',
      highlights: 'Responsibilities and outcomes',
      project: 'Project name',
      link: 'Project link',
      school: 'School',
      degree: 'Degree or field',
      details: 'Details',
      skills: 'Skills (one per line)',
    },
  },
  finish: 'Finish interview',
  completedTitle: 'Interview complete',
  completedBody:
    'Your answers remain available in this tab until you start over, cancel, or refresh.',
  cancelConfirmTitle: 'Discard this interview?',
  cancelConfirmBody:
    'This removes the interview answers from this tab’s memory. Your existing resume will not change.',
  keepInterview: 'Keep interview',
  confirmCancel: 'Discard answers',
  cancelledTitle: 'Interview cancelled',
  cancelledBody:
    'The interview answers were cleared from this tab. Your existing resume was not changed.',
  errors: {
    providerChanged:
      'The AI service configuration changed. Choose how to continue before sending more answers.',
    providerNotConfigured: 'Configure an AI service or continue with guide questions.',
    invalidQuestion:
      'The model returned a question that did not meet the interview rules. Your answer is preserved.',
    providerError:
      'The AI request failed. Your answer is preserved. You can retry or continue with a guide question.',
  },
} as const;
