import { createEmptyResume, type ResumeData, resumeSchema } from '@entities/resume';

import {
  type FactEntityKind,
  type FactEntityLink,
  type FactEntitySeparation,
  type FactEntityWarning,
  getFactEntityAmbiguities,
  mergeCompatibleFactValues,
  resolveFactEntityIdentity,
  validateFactEntityLinks,
} from './factEntityLinks';
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
  entityWarnings: FactEntityWarning[];
  missingFields: string[];
  validationError: string | null;
};

export type FactEntityGroup = {
  kind: FactEntityKind;
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

const compareFacts = (left: ResumeFact, right: ResumeFact): number =>
  left.extractedAt - right.extractedAt || left.id.localeCompare(right.id);

/** Only a current user-confirmed link can combine multiple source facts into a record. */
export const groupConfirmedFactsByEntity = (
  session: InterviewSession | null,
  facts: ResumeFact[],
  links: FactEntityLink[] = [],
  separations: FactEntitySeparation[] = [],
): { groups: FactEntityGroup[]; warnings: FactEntityWarning[] } => {
  const eligibleFacts = getCurrentConfirmedFacts(session, facts)
    .filter((fact) => resolveFactEntityIdentity(fact))
    .sort(compareFacts);
  const groups: FactEntityGroup[] = [];
  const eligibleById = new Map(eligibleFacts.map((fact) => [fact.id, fact]));
  const groupedFactIds = new Set<string>();

  for (const link of validateFactEntityLinks(session, facts, links)) {
    if (link.status !== 'active') continue;
    const linkedFacts = link.factIds
      .map((factId) => eligibleById.get(factId))
      .filter((fact): fact is ResumeFact => fact !== undefined)
      .sort(compareFacts);
    if (linkedFacts.length !== link.factIds.length) continue;
    const merged = mergeCompatibleFactValues(linkedFacts);
    if (!merged.ok) continue;
    groups.push({ kind: link.kind, key: link.entityId, facts: linkedFacts, value: merged.value });
    for (const fact of linkedFacts) groupedFactIds.add(fact.id);
  }

  for (const fact of eligibleFacts) {
    if (groupedFactIds.has(fact.id)) continue;
    groups.push({
      kind: fact.kind as FactEntityKind,
      key: null,
      facts: [fact],
      value: getRecord(fact.value),
    });
  }

  const warnings = getFactEntityAmbiguities(session, facts, links, separations);

  groups.sort((left, right) => compareFacts(left.facts[0]!, right.facts[0]!));
  return { groups, warnings };
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
  entityLinks: FactEntityLink[] = [],
  entitySeparations: FactEntitySeparation[] = [],
): ResumeGenerationResult => {
  const confirmedFacts = getCurrentConfirmedFacts(session, facts);
  const confirmedIds = new Set(confirmedFacts.map((fact) => fact.id));
  const entityResult = groupConfirmedFactsByEntity(session, facts, entityLinks, entitySeparations);
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

  const groupsByKind = (kind: FactEntityKind) =>
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
  entityState?: { links: FactEntityLink[]; separations: FactEntitySeparation[] },
): string =>
  JSON.stringify({
    session,
    facts,
    provider,
    entityState: entityState ?? { links: [], separations: [] },
  });
