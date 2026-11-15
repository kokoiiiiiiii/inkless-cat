import type { ActiveSectionKey, ResumeData } from '@entities/resume';
import type { AIEnhancementTarget } from '@features/ai-resume-enhancement';
import { readEnhancementTarget, targetFieldKey } from '@features/ai-resume-enhancement';

export type StudioModuleKey = ActiveSectionKey | 'personal';

export type StudioFieldValue = string | string[] | null;

export type StudioFieldIdentity = {
  moduleKey: StudioModuleKey;
  sectionKey: string;
  fieldId: string;
  itemKey: string;
};

export type StudioSelectionRange = {
  start: number;
  end: number;
  direction: 'forward' | 'backward' | 'none';
};

export type StudioFieldContextMetadata = {
  sourceRevision?: number;
  workspaceGeneration?: number;
  selectionRange?: StudioSelectionRange | null;
};

export type StudioFieldContextData = StudioFieldIdentity & {
  sourceValue: StudioFieldValue;
  aiTarget: AIEnhancementTarget | null;
  writeTarget: string | null;
  sourceRevision: number;
  workspaceGeneration: number;
  selectionRange: StudioSelectionRange | null;
  requestContext: {
    moduleKey: StudioModuleKey;
    itemKey: string;
    fieldId: string;
    sourceValue: StudioFieldValue;
    targetPath: string | null;
    sourceRevision: number;
    workspaceGeneration: number;
    selectionRange: StudioSelectionRange | null;
  };
};

const resolveTarget = (fieldId: string): AIEnhancementTarget | null => {
  if (fieldId === 'personal.summary') return { kind: 'personal-summary' };

  const experienceMatch = /^experience\.(.+)\.highlights$/u.exec(fieldId);
  if (experienceMatch?.[1]) {
    return { kind: 'experience-highlights', itemId: experienceMatch[1] };
  }

  const projectMatch = /^projects\.(.+)\.summary$/u.exec(fieldId);
  if (projectMatch?.[1]) {
    return { kind: 'project-summary', itemId: projectMatch[1] };
  }

  return null;
};

const asFieldValue = (value: unknown): StudioFieldValue => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return [...value];
  return null;
};

export const readStudioFieldValue = (
  resume: ResumeData,
  sectionKey: string,
  itemKey: string,
  fieldId: string,
): StudioFieldValue => {
  if (sectionKey === 'summary' || fieldId === 'personal.summary') {
    return typeof resume.personal.summary === 'string' ? resume.personal.summary : '';
  }

  if (sectionKey === 'personal' || fieldId.startsWith('personal.')) {
    const extraMatch = /^personal\.extras\.(.+)\.(label|value)$/u.exec(fieldId);
    if (extraMatch?.[1] && extraMatch[2]) {
      const matches = (resume.personal.extras ?? []).filter((extra) => extra.id === extraMatch[1]);
      if (matches.length !== 1) return null;
      const extra = matches[0];
      return extraMatch[2] === 'label' ? (extra?.label ?? '') : (extra?.value ?? '');
    }

    const fieldKey = fieldId.startsWith('personal.') ? fieldId.slice('personal.'.length) : '';
    if (!fieldKey || fieldKey === 'extras') return null;
    return asFieldValue((resume.personal as unknown as Record<string, unknown>)[fieldKey]);
  }

  if (sectionKey.startsWith('custom:')) {
    const sectionId = sectionKey.slice('custom:'.length);
    const matches = (resume.customSections ?? []).filter((section) => section.id === sectionId);
    if (matches.length !== 1) return null;
    const section = matches[0];
    if (!section) return null;
    const prefix = `customSections.${sectionId}.`;
    if (!fieldId.startsWith(prefix)) return null;
    const path = fieldId.slice(prefix.length);
    if (path === 'title' || path === 'mode' || path === 'text') {
      return asFieldValue(section[path]);
    }
    if (path === 'items') return asFieldValue(section.items);
    if (path.startsWith('fields.')) {
      const fieldPath = path.slice('fields.'.length);
      const propertyBoundary = fieldPath.lastIndexOf('.');
      if (propertyBoundary < 1) return null;
      const fieldId = fieldPath.slice(0, propertyBoundary);
      const property = fieldPath.slice(propertyBoundary + 1);
      if (property !== 'label' && property !== 'value') return null;
      if (section.mode !== 'fields') return null;
      const fields = section.fields ?? [];
      const fieldMatches = fields.filter((field) => field.id === fieldId);
      if (fieldMatches.length !== 1) return null;
      return asFieldValue(fieldMatches[0]?.[property]);
    }
  }

  if (
    sectionKey === 'experience' ||
    sectionKey === 'projects' ||
    sectionKey === 'education' ||
    sectionKey === 'skills' ||
    sectionKey === 'languages' ||
    sectionKey === 'interests' ||
    sectionKey === 'awards' ||
    sectionKey === 'socials'
  ) {
    const entries = resume[sectionKey] as Array<Record<string, unknown>>;
    const matches = entries.filter((item) => item.id === itemKey);
    if (matches.length !== 1) return null;
    const prefix = `${sectionKey}.${itemKey}.`;
    const fieldKey = fieldId.startsWith(prefix) ? fieldId.slice(prefix.length) : '';
    if (!fieldKey) return null;
    return asFieldValue(matches[0]?.[fieldKey]);
  }

  return null;
};

export const createStudioFieldContext = (
  resume: ResumeData,
  identity: StudioFieldIdentity,
  metadata: StudioFieldContextMetadata = {},
): StudioFieldContextData => {
  const sourceValue = readStudioFieldValue(
    resume,
    identity.sectionKey,
    identity.itemKey,
    identity.fieldId,
  );
  const candidateTarget = resolveTarget(identity.fieldId);
  const targetResolution = candidateTarget ? readEnhancementTarget(resume, candidateTarget) : null;
  const aiTarget = targetResolution?.status === 'found' ? candidateTarget : null;
  const resolvedSource =
    targetResolution?.status === 'found' ? targetResolution.value : sourceValue;
  const writeTarget = aiTarget ? targetFieldKey(aiTarget) : null;

  return {
    ...identity,
    sourceValue: resolvedSource,
    aiTarget,
    writeTarget,
    sourceRevision: metadata.sourceRevision ?? 0,
    workspaceGeneration: metadata.workspaceGeneration ?? 0,
    selectionRange: metadata.selectionRange ?? null,
    requestContext: {
      moduleKey: identity.moduleKey,
      itemKey: identity.itemKey,
      fieldId: identity.fieldId,
      sourceValue: resolvedSource,
      targetPath: writeTarget,
      sourceRevision: metadata.sourceRevision ?? 0,
      workspaceGeneration: metadata.workspaceGeneration ?? 0,
      selectionRange: metadata.selectionRange ?? null,
    },
  };
};
