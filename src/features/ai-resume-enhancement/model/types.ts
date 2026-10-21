export type AIEnhancementTarget =
  | { kind: 'personal-summary' }
  | { kind: 'experience-highlights'; itemId: string }
  | { kind: 'project-summary'; itemId: string };

export type AIEnhancementMode = 'professional' | 'concise' | 'expand' | 'outcome';

export type AIEnhancementLocale = 'zh-CN' | 'en';

export type AIEnhancementFieldValue = string | string[];

export type AIEnhancementStatus = 'idle' | 'generating' | 'suggested' | 'error' | 'cancelled';

export type AIEnhancementErrorCode =
  | 'empty_output'
  | 'response_too_long'
  | 'invalid_control_characters'
  | 'code_fence'
  | 'invalid_highlights'
  | 'item_count_mismatch'
  | 'item_too_long'
  | 'invalid_response'
  | 'target_missing'
  | 'source_changed'
  | 'workspace_changed'
  | 'provider_changed'
  | 'empty_source'
  | 'input_too_long'
  | 'provider_error';

export type AIEnhancementSession = {
  id: number;
  target: AIEnhancementTarget;
  original: AIEnhancementFieldValue;
  originalText: string;
  workspaceGeneration: number;
  mode: AIEnhancementMode;
  status: AIEnhancementStatus;
  candidate: string;
  errorCode?: AIEnhancementErrorCode;
  inputCodeUnits?: number;
  providerErrorCode?: string;
  providerStatusCode?: number;
};
