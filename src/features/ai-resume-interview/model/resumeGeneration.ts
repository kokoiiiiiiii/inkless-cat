import { createEmptyResume, type ResumeData, resumeSchema } from '@entities/resume';

import { isFactCurrent, type ResumeFact } from './facts';
import type { InterviewSession } from './types';

export type ResumeGenerationLocale = 'zh-CN' | 'en';

export type ResumeGenerationResult = {
  resume: ResumeData;
  includedFactIds: string[];
  excludedFactIds: string[];
  missingFields: string[];
  validationError: string | null;
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
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
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
  const resume = createEmptyResume();
  const personal: Record<string, string> = {};
  const summaries: string[] = [];
  const skills: string[] = [];

  for (const [index, fact] of confirmedFacts.entries()) {
    const value = getRecord(fact.value);
    const id = `generated-${fact.kind}-${index}-${cleanId(fact.id)}`;

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
      case 'experience': {
        resume.experience.push({
          id,
          company: getText(value, 'company'),
          role: getText(value, 'role'),
          location: getText(value, 'location'),
          startDate: getText(value, 'startDate'),
          endDate: getText(value, 'endDate'),
          highlights: buildHighlights(value, locale),
        });
        break;
      }
      case 'project': {
        resume.projects.push({
          id,
          name: getText(value, 'name'),
          role: getText(value, 'role'),
          summary: getText(value, 'summary'),
          link: getText(value, 'link'),
          highlights: buildHighlights(value, locale),
        });
        break;
      }
      case 'education': {
        resume.education.push({
          id,
          school: getText(value, 'school'),
          degree: getText(value, 'degree'),
          startDate: getText(value, 'startDate'),
          endDate: getText(value, 'endDate'),
          details: getText(value, 'details'),
        });
        break;
      }
      case 'skill': {
        if (typeof fact.value === 'string' && fact.value.trim()) skills.push(fact.value.trim());
        break;
      }
    }
  }

  resume.personal = {
    ...resume.personal,
    ...personal,
    summary: summaries.join('\n\n'),
  };
  const uniqueSkills = [...new Set(skills)];
  if (uniqueSkills.length > 0) resume.skills.push({ id: 'generated-skills', items: uniqueSkills });

  const parsed = resumeSchema.safeParse(resume);
  const validatedResume = parsed.success ? parsed.data : resume;

  return {
    resume: validatedResume,
    includedFactIds: confirmedFacts.map((fact) => fact.id),
    excludedFactIds: facts.filter((fact) => !confirmedIds.has(fact.id)).map((fact) => fact.id),
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
