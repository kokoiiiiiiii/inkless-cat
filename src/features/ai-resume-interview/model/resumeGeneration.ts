import { createEmptyResume, type ResumeData, resumeSchema } from '@entities/resume';

import { isFactCurrent, type ResumeFact } from './facts';
import type { InterviewSession } from './types';

export type ResumeGenerationLocale = 'zh-CN' | 'en';

export type ResumeGenerationResult = {
  resume: ResumeData;
  includedFactIds: string[];
  excludedFactIds: string[];
  recordFactIds: Array<{
    recordId: string;
    kind: 'experience' | 'project' | 'education';
    factIds: string[];
  }>;
  entityWarnings: Array<{
    kind: 'experience' | 'project' | 'education';
    factIds: string[];
    reason: 'identity-ambiguous' | 'field-conflict';
  }>;
  missingFields: string[];
  validationError: string | null;
};

type EntityFactKind = 'experience' | 'project' | 'education';

type FactEntityIdentity = {
  kind: EntityFactKind;
  key: string | null;
  weakKey: string | null;
};

type FactEntityGroup = {
  kind: EntityFactKind;
  key: string | null;
  facts: ResumeFact[];
  value: Record<string, unknown>;
};

const cleanId = (value: string): string =>
  value.replaceAll(/[^A-Za-z0-9_-]/gu, '-').slice(0, 92) || 'fact';

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getText = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getTextList = (record: Record<string, unknown>, key: string): string[] => {
  const value = record[key];
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .map((item) => item.trim())
    : [];
};

const normalizeIdentityPart = (value: string): string =>
  value.normalize('NFKC').replaceAll(/\s+/gu, ' ').trim().toLocaleLowerCase('en-US');

const normalizeProjectLink = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
};

/** Resolve identity only from exact, user-confirmed anchors. Similar names are never compared. */
export const resolveFactEntityIdentity = (fact: ResumeFact): FactEntityIdentity | null => {
  if (fact.kind !== 'experience' && fact.kind !== 'project' && fact.kind !== 'education') {
    return null;
  }
  const value = getRecord(fact.value);
  if (fact.kind === 'experience') {
    const company = getText(value, 'company');
    const role = getText(value, 'role');
    const weakKey = company ? `experience:${normalizeIdentityPart(company)}` : null;
    return {
      kind: fact.kind,
      key:
        company && role
          ? `experience:${normalizeIdentityPart(company)}|${normalizeIdentityPart(role)}`
          : null,
      weakKey,
    };
  }
  if (fact.kind === 'education') {
    const school = getText(value, 'school');
    const degree = getText(value, 'degree');
    const weakKey = school ? `education:${normalizeIdentityPart(school)}` : null;
    return {
      kind: fact.kind,
      key:
        school && degree
          ? `education:${normalizeIdentityPart(school)}|${normalizeIdentityPart(degree)}`
          : null,
      weakKey,
    };
  }

  const name = getText(value, 'name');
  const link = getText(value, 'link');
  const normalizedLink = link ? normalizeProjectLink(link) : null;
  return {
    kind: fact.kind,
    key: normalizedLink ? `project:${normalizedLink}` : null,
    weakKey: name ? `project:${normalizeIdentityPart(name)}` : null,
  };
};

const entityScalarFields: Record<EntityFactKind, string[]> = {
  experience: ['company', 'role', 'location', 'startDate', 'endDate'],
  project: ['name', 'role', 'summary', 'link'],
  education: ['school', 'degree', 'startDate', 'endDate', 'details'],
};

const entityListFields = [
  'responsibilities',
  'individualResponsibilities',
  'teamResponsibilities',
  'achievements',
] as const;

const compareFacts = (left: ResumeFact, right: ResumeFact): number =>
  left.extractedAt - right.extractedAt || left.id.localeCompare(right.id);

const getDistinctScalarValues = (facts: ResumeFact[], field: string): string[] => {
  const values = facts
    .map((fact) => getText(getRecord(fact.value), field))
    .filter((value): value is string => value !== undefined);
  return [...new Set(values.map((value) => normalizeIdentityPart(value)))];
};

/** Merge only exact-compatible scalar values; responsibility lists retain their source boundary. */
export const mergeCompatibleFactValues = (
  facts: ResumeFact[],
): { ok: true; value: Record<string, unknown> } | { ok: false; conflictFields: string[] } => {
  const first = facts[0];
  if (
    !first ||
    (first.kind !== 'experience' && first.kind !== 'project' && first.kind !== 'education')
  ) {
    return { ok: false, conflictFields: [] };
  }
  const kind = first.kind;
  if (facts.some((fact) => fact.kind !== kind)) return { ok: false, conflictFields: [] };

  const orderedFacts = [...facts].sort(compareFacts);
  const conflictFields = entityScalarFields[kind].filter(
    (field) => getDistinctScalarValues(orderedFacts, field).length > 1,
  );
  if (conflictFields.length > 0) return { ok: false, conflictFields };

  const value: Record<string, unknown> = {};
  for (const field of entityScalarFields[kind]) {
    const chosen = orderedFacts
      .map((fact) => getText(getRecord(fact.value), field))
      .find((item): item is string => item !== undefined);
    if (chosen) value[field] = chosen;
  }
  for (const field of entityListFields) {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const fact of orderedFacts) {
      for (const item of getTextList(getRecord(fact.value), field)) {
        const key = normalizeIdentityPart(item);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    }
    if (merged.length > 0) value[field] = merged;
  }
  return { ok: true, value };
};

const hasAmbiguousIdentityPair = (left: ResumeFact, right: ResumeFact): boolean => {
  const leftIdentity = resolveFactEntityIdentity(left);
  const rightIdentity = resolveFactEntityIdentity(right);
  if (!leftIdentity || !rightIdentity || leftIdentity.kind !== rightIdentity.kind) return false;
  if (!leftIdentity.weakKey || leftIdentity.weakKey !== rightIdentity.weakKey) return false;
  return !leftIdentity.key || !rightIdentity.key;
};

/** Groups current confirmed entity facts; unclear identities and conflicting fields stay separate. */
export const groupConfirmedFactsByEntity = (
  session: InterviewSession | null,
  facts: ResumeFact[],
): { groups: FactEntityGroup[]; warnings: ResumeGenerationResult['entityWarnings'] } => {
  const eligibleFacts = getCurrentConfirmedFacts(session, facts)
    .filter((fact) => resolveFactEntityIdentity(fact))
    .sort(compareFacts);
  const groups: FactEntityGroup[] = [];
  const warnings = new Map<string, ResumeGenerationResult['entityWarnings'][number]>();
  const identityGroups = new Map<string, FactEntityGroup[]>();
  const weakIdentityFacts = new Map<string, ResumeFact[]>();

  const addWarning = (
    kind: EntityFactKind,
    reason: ResumeGenerationResult['entityWarnings'][number]['reason'],
    sourceFacts: ResumeFact[],
  ) => {
    const factIds = [...new Set(sourceFacts.map((fact) => fact.id))].sort();
    if (factIds.length < 2) return;
    const key = `${kind}:${reason}:${factIds.join('|')}`;
    warnings.set(key, { kind, reason, factIds });
  };

  for (const fact of eligibleFacts) {
    const identity = resolveFactEntityIdentity(fact);
    if (!identity) continue;
    if (identity.weakKey) {
      const weakGroup = weakIdentityFacts.get(identity.weakKey) ?? [];
      weakGroup.push(fact);
      weakIdentityFacts.set(identity.weakKey, weakGroup);
    }
    if (!identity.key) {
      groups.push({ kind: identity.kind, key: null, facts: [fact], value: getRecord(fact.value) });
      continue;
    }

    const indexKey = `${identity.kind}:${identity.key}`;
    const matchingGroups = identityGroups.get(indexKey) ?? [];
    let compatibleGroup: FactEntityGroup | undefined;
    const conflictingGroups: FactEntityGroup[] = [];
    for (const group of matchingGroups) {
      const merged = mergeCompatibleFactValues([...group.facts, fact]);
      if (merged.ok) {
        compatibleGroup = group;
        group.value = merged.value;
        group.facts.push(fact);
        break;
      }
      conflictingGroups.push(group);
    }
    if (compatibleGroup) continue;

    for (const group of conflictingGroups)
      addWarning(identity.kind, 'field-conflict', [...group.facts, fact]);
    const newGroup: FactEntityGroup = {
      kind: identity.kind,
      key: identity.key,
      facts: [fact],
      value: getRecord(fact.value),
    };
    groups.push(newGroup);
    matchingGroups.push(newGroup);
    identityGroups.set(indexKey, matchingGroups);
  }

  for (const weakFacts of weakIdentityFacts.values()) {
    if (weakFacts.length < 2) continue;
    const kind = resolveFactEntityIdentity(weakFacts[0]!)?.kind;
    if (!kind) continue;
    const ambiguousFacts = weakFacts.filter((fact) =>
      weakFacts.some(
        (candidate) => candidate.id !== fact.id && hasAmbiguousIdentityPair(fact, candidate),
      ),
    );
    if (ambiguousFacts.length > 1) addWarning(kind, 'identity-ambiguous', ambiguousFacts);
  }

  groups.sort((left, right) => compareFacts(left.facts[0]!, right.facts[0]!));
  return { groups, warnings: [...warnings.values()] };
};

const responsibilityLabel = (
  locale: ResumeGenerationLocale,
  category: 'individual' | 'team' | 'unspecified' | 'outcome',
) => {
  if (locale === 'zh-CN') {
    return {
      individual: '个人负责：',
      team: '与团队协作：',
      unspecified: '职责归属未说明：',
      outcome: '成果归属未说明：',
    }[category];
  }
  return {
    individual: 'Personally owned: ',
    team: 'Shared with the team: ',
    unspecified: 'Ownership unspecified: ',
    outcome: 'Outcome ownership unspecified: ',
  }[category];
};

const buildHighlights = (
  record: Record<string, unknown>,
  locale: ResumeGenerationLocale,
): string[] => [
  ...getTextList(record, 'individualResponsibilities').map(
    (text) => `${responsibilityLabel(locale, 'individual')}${text}`,
  ),
  ...getTextList(record, 'teamResponsibilities').map(
    (text) => `${responsibilityLabel(locale, 'team')}${text}`,
  ),
  ...getTextList(record, 'responsibilities').map(
    (text) => `${responsibilityLabel(locale, 'unspecified')}${text}`,
  ),
  ...getTextList(record, 'achievements').map(
    (text) => `${responsibilityLabel(locale, 'outcome')}${text}`,
  ),
];

const setFirstValue = (target: Record<string, string>, key: string, value: string | undefined) => {
  if (value && !target[key]) target[key] = value;
};

const getMissingFields = (resume: ResumeData): string[] => {
  const missing: string[] = [];
  if (!resume.personal.fullName?.trim()) missing.push('name');
  if (!resume.personal.title?.trim()) missing.push('title');
  if (!resume.personal.email?.trim() && !resume.personal.phone?.trim()) missing.push('contact');
  if (!resume.personal.summary?.trim()) missing.push('summary');
  if (resume.experience.length === 0) missing.push('experience');
  else {
    if (resume.experience.some((item) => !item.company?.trim())) missing.push('experienceCompany');
    if (resume.experience.some((item) => !item.role?.trim())) missing.push('experienceRole');
    if (resume.experience.some((item) => !item.startDate?.trim() && !item.endDate?.trim())) {
      missing.push('experienceDates');
    }
  }
  if (resume.projects.length === 0) missing.push('projects');
  else if (resume.projects.some((item) => !item.name?.trim())) missing.push('projectName');
  if (resume.education.length === 0) missing.push('education');
  else {
    if (resume.education.some((item) => !item.school?.trim())) missing.push('educationSchool');
    if (resume.education.some((item) => !item.degree?.trim())) missing.push('educationDegree');
  }
  if (resume.skills.every((group) => group.items.length === 0)) missing.push('skills');
  return missing;
};

export const getCurrentConfirmedFacts = (
  session: InterviewSession | null,
  facts: ResumeFact[],
): ResumeFact[] =>
  session
    ? facts.filter((fact) => fact.status === 'confirmed' && isFactCurrent(session, fact))
    : [];

/** Build resume fields only from confirmed, current facts. No model or sample data is used. */
export const buildResumeDraftFromFacts = (
  session: InterviewSession | null,
  facts: ResumeFact[],
  locale: ResumeGenerationLocale,
): ResumeGenerationResult => {
  const confirmedFacts = getCurrentConfirmedFacts(session, facts);
  const confirmedIds = new Set(confirmedFacts.map((fact) => fact.id));
  const entityResult = groupConfirmedFactsByEntity(session, facts);
  const resume = createEmptyResume();
  const personal: Record<string, string> = {};
  const summaries: string[] = [];
  const skills: string[] = [];
  const recordFactIds: ResumeGenerationResult['recordFactIds'] = [];

  for (const fact of confirmedFacts) {
    const value = getRecord(fact.value);

    switch (fact.kind) {
      case 'targetRole': {
        if (typeof fact.value === 'string') setFirstValue(personal, 'title', fact.value.trim());
        break;
      }
      case 'personal': {
        setFirstValue(personal, 'fullName', getText(value, 'fullName'));
        setFirstValue(personal, 'email', getText(value, 'email'));
        setFirstValue(personal, 'phone', getText(value, 'phone'));
        setFirstValue(personal, 'location', getText(value, 'location'));
        const summary = getText(value, 'summary');
        if (summary && !summaries.includes(summary)) summaries.push(summary);
        break;
      }
      case 'experience':
      case 'project':
      case 'education': {
        // Entity records are built from compatible fact groups below.
        break;
      }
      case 'skill': {
        if (typeof fact.value === 'string' && fact.value.trim()) skills.push(fact.value.trim());
        break;
      }
    }
  }

  const groupsByKind = (kind: EntityFactKind) =>
    entityResult.groups.filter((group) => group.kind === kind);
  for (const [index, group] of groupsByKind('experience').entries()) {
    const id = `generated-experience-${index}-${cleanId(group.facts[0]!.id)}`;
    resume.experience.push({
      id,
      company: getText(group.value, 'company'),
      role: getText(group.value, 'role'),
      location: getText(group.value, 'location'),
      startDate: getText(group.value, 'startDate'),
      endDate: getText(group.value, 'endDate'),
      highlights: buildHighlights(group.value, locale),
    });
    recordFactIds.push({
      recordId: id,
      kind: group.kind,
      factIds: group.facts.map(({ id: factId }) => factId),
    });
  }
  for (const [index, group] of groupsByKind('project').entries()) {
    const id = `generated-project-${index}-${cleanId(group.facts[0]!.id)}`;
    resume.projects.push({
      id,
      name: getText(group.value, 'name'),
      role: getText(group.value, 'role'),
      summary: getText(group.value, 'summary'),
      link: getText(group.value, 'link'),
      highlights: buildHighlights(group.value, locale),
    });
    recordFactIds.push({
      recordId: id,
      kind: group.kind,
      factIds: group.facts.map(({ id: factId }) => factId),
    });
  }
  for (const [index, group] of groupsByKind('education').entries()) {
    const id = `generated-education-${index}-${cleanId(group.facts[0]!.id)}`;
    resume.education.push({
      id,
      school: getText(group.value, 'school'),
      degree: getText(group.value, 'degree'),
      startDate: getText(group.value, 'startDate'),
      endDate: getText(group.value, 'endDate'),
      details: getText(group.value, 'details'),
    });
    recordFactIds.push({
      recordId: id,
      kind: group.kind,
      factIds: group.facts.map(({ id: factId }) => factId),
    });
  }

  resume.personal = {
    ...resume.personal,
    ...personal,
    summary: summaries.join('\n\n'),
  };
  const uniqueSkills = [...new Set(skills)];
  if (uniqueSkills.length > 0) resume.skills.push({ id: 'generated-skills', items: uniqueSkills });

  const parsed = resumeSchema.safeParse(resume);
  const validatedResume = parsed.success ? parsed.data : createEmptyResume();

  return {
    resume: validatedResume,
    includedFactIds: parsed.success ? confirmedFacts.map((fact) => fact.id) : [],
    excludedFactIds: parsed.success
      ? facts.filter((fact) => !confirmedIds.has(fact.id)).map((fact) => fact.id)
      : facts.map((fact) => fact.id),
    recordFactIds: parsed.success ? recordFactIds : [],
    entityWarnings: entityResult.warnings,
    missingFields: getMissingFields(validatedResume),
    validationError: parsed.success
      ? null
      : parsed.error.issues.map((issue) => issue.message).join('; '),
  };
};

export const getResumeDraftBasisKey = (
  session: InterviewSession | null,
  facts: ResumeFact[],
  provider: {
    configuration: Readonly<{ baseUrl: string; model: string }> | null;
    isConfigured: boolean;
    connectionStatus: string;
  },
): string => JSON.stringify({ session, facts, provider });
