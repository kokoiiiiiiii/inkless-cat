import { createCustomSection } from '@entities/module';
import { clone, createId } from '@shared/lib';

import { RESUME_SCHEMA_VERSION } from '../schema/resume';
import type {
  ResumeAward,
  ResumeAwardInput,
  ResumeCustomField,
  ResumeCustomFieldInput,
  ResumeCustomSection,
  ResumeCustomSectionInput,
  ResumeData,
  ResumeEducation,
  ResumeEducationInput,
  ResumeExperience,
  ResumeExperienceInput,
  ResumeInputData,
  ResumeInterest,
  ResumeInterestInput,
  ResumeLanguage,
  ResumeLanguageInput,
  ResumePersonal,
  ResumePersonalExtra,
  ResumePersonalExtraInput,
  ResumePersonalInput,
  ResumeProject,
  ResumeProjectInput,
  ResumeSettings,
  ResumeSettingsInput,
  ResumeSkill,
  ResumeSkillInput,
  ResumeSocial,
  ResumeSocialInput,
} from '../types';

export type NormalizeOptions = {
  clone?: boolean;
};

const normalizeOptionalString = (value: string | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const normalizeStringList = (value?: string[]): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const normalizeCustomField = (
  field?: ResumeCustomFieldInput | ResumeCustomField | null,
): ResumeCustomField => ({
  id: field?.id || createId('custom-field'),
  label: typeof field?.label === 'string' ? field.label : '',
  value: typeof field?.value === 'string' ? field.value : '',
});

export const normalizeCustomSection = (
  section: ResumeCustomSectionInput | ResumeCustomSection | null | undefined,
): ResumeCustomSection => {
  if (!section) return createCustomSection();
  const mode = section.mode === 'fields' || section.mode === 'text' ? section.mode : 'list';
  const normalized: ResumeCustomSection = {
    id: section.id || createId('custom'),
    title: typeof section.title === 'string' ? section.title : '',
    mode,
    items: Array.isArray(section.items)
      ? section.items
          .map((item) => (typeof item === 'string' ? item : ''))
          .filter((item): item is string => item !== undefined)
      : [],
    fields: Array.isArray(section.fields)
      ? section.fields.map((field) => ({
          id: field?.id || createId('custom-field'),
          label: typeof field?.label === 'string' ? field.label : '',
          value: typeof field?.value === 'string' ? field.value : '',
        }))
      : [],
    text: typeof section.text === 'string' ? section.text : '',
  };
  if (normalized.mode === 'fields' && normalized.fields.length === 0) {
    normalized.fields = [
      {
        id: createId('custom-field'),
        label: '',
        value: '',
      },
    ];
  }
  return normalized;
};

const normalizeSocial = (item: ResumeSocialInput | ResumeSocial): ResumeSocial => ({
  id: item.id || createId('social'),
  label: normalizeOptionalString(item.label),
  url: normalizeOptionalString(item.url),
});

const normalizeExperience = (item: ResumeExperienceInput | ResumeExperience): ResumeExperience => ({
  id: item.id || createId('exp'),
  company: normalizeOptionalString(item.company),
  role: normalizeOptionalString(item.role),
  location: normalizeOptionalString(item.location),
  startDate: normalizeOptionalString(item.startDate),
  endDate: normalizeOptionalString(item.endDate),
  highlights: normalizeStringList(item.highlights),
});

const normalizeProject = (item: ResumeProjectInput | ResumeProject): ResumeProject => ({
  id: item.id || createId('proj'),
  name: normalizeOptionalString(item.name),
  role: normalizeOptionalString(item.role),
  summary: normalizeOptionalString(item.summary),
  link: normalizeOptionalString(item.link),
  highlights: normalizeStringList(item.highlights),
});

const normalizeEducation = (item: ResumeEducationInput | ResumeEducation): ResumeEducation => ({
  id: item.id || createId('edu'),
  school: normalizeOptionalString(item.school),
  degree: normalizeOptionalString(item.degree),
  startDate: normalizeOptionalString(item.startDate),
  endDate: normalizeOptionalString(item.endDate),
  details: normalizeOptionalString(item.details),
});

const normalizeSkill = (item: ResumeSkillInput | ResumeSkill): ResumeSkill => ({
  id: item.id || createId('skill'),
  title: normalizeOptionalString(item.title),
  items: normalizeStringList(item.items),
});

const normalizeLanguage = (item: ResumeLanguageInput | ResumeLanguage): ResumeLanguage => ({
  id: item.id || createId('lang'),
  name: normalizeOptionalString(item.name),
  level: normalizeOptionalString(item.level),
});

const normalizeInterest = (item: ResumeInterestInput | ResumeInterest): ResumeInterest => ({
  id: item.id || createId('interest'),
  name: normalizeOptionalString(item.name),
});

const normalizeAward = (item: ResumeAwardInput | ResumeAward): ResumeAward => ({
  id: item.id || createId('award'),
  name: normalizeOptionalString(item.name),
  issuer: normalizeOptionalString(item.issuer),
  year: normalizeOptionalString(item.year),
});

const normalizePersonalExtra = (
  item: ResumePersonalExtraInput | ResumePersonalExtra,
): ResumePersonalExtra => ({
  id: item.id || createId('extra'),
  label: normalizeOptionalString(item.label),
  value: normalizeOptionalString(item.value),
});

const normalizePersonal = (personal: ResumePersonalInput | ResumePersonal): ResumePersonal => ({
  fullName: normalizeOptionalString(personal.fullName),
  title: normalizeOptionalString(personal.title),
  email: normalizeOptionalString(personal.email),
  emailLabel: normalizeOptionalString(personal.emailLabel),
  phone: normalizeOptionalString(personal.phone),
  phoneLabel: normalizeOptionalString(personal.phoneLabel),
  location: normalizeOptionalString(personal.location),
  locationLabel: normalizeOptionalString(personal.locationLabel),
  photo: normalizeOptionalString(personal.photo),
  summary: normalizeOptionalString(personal.summary),
  extras: Array.isArray(personal.extras)
    ? personal.extras.map((item) => normalizePersonalExtra(item))
    : [],
});

const normalizeSettings = (
  settings?: ResumeSettingsInput | ResumeSettings,
): ResumeSettings | undefined => {
  if (!settings?.personal) {
    return undefined;
  }

  return {
    personal: {
      showPhoto: settings.personal.showPhoto,
      photoSize: settings.personal.photoSize,
      photoPosition: settings.personal.photoPosition,
    },
  };
};

export const normalizeResumeDraft = (draft: ResumeData): void => {
  if (!Array.isArray(draft.customSections)) {
    draft.customSections = [];
  }
  draft.customSections = draft.customSections.map((section) => normalizeCustomSection(section));
};

export const normalizeResumeInput = (
  data: ResumeInputData,
  options: NormalizeOptions = {},
): ResumeData => {
  const source = options.clone ? clone(data) : data;
  const normalized: ResumeData = {
    schemaVersion: RESUME_SCHEMA_VERSION,
    personal: normalizePersonal(source.personal),
    socials: Array.isArray(source.socials)
      ? source.socials.map((item) => normalizeSocial(item))
      : [],
    experience: Array.isArray(source.experience)
      ? source.experience.map((item) => normalizeExperience(item))
      : [],
    projects: Array.isArray(source.projects)
      ? source.projects.map((item) => normalizeProject(item))
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((item) => normalizeEducation(item))
      : [],
    skills: Array.isArray(source.skills) ? source.skills.map((item) => normalizeSkill(item)) : [],
    languages: Array.isArray(source.languages)
      ? source.languages.map((item) => normalizeLanguage(item))
      : [],
    interests: Array.isArray(source.interests)
      ? source.interests.map((item) => normalizeInterest(item))
      : [],
    awards: Array.isArray(source.awards) ? source.awards.map((item) => normalizeAward(item)) : [],
    customSections: Array.isArray(source.customSections)
      ? source.customSections.map((section) => normalizeCustomSection(section))
      : [],
    settings: normalizeSettings(source.settings),
  };
  normalizeResumeDraft(normalized);
  return normalized;
};

export const normalizeResumeSchema = (
  data: ResumeData,
  options: NormalizeOptions = {},
): ResumeData => {
  return normalizeResumeInput(data, options);
};
