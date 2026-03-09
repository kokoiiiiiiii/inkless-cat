import { z } from 'zod';

export const RESUME_SCHEMA_VERSION = 1 as const;

const optionalString = z.string().optional();
const optionalStringArray = z.array(z.string()).optional();

export const resumeCustomSectionModeSchema = z.enum(['list', 'fields', 'text']);

export const resumeSocialInputSchema = z
  .object({
    id: z.string().optional(),
    label: optionalString,
    url: optionalString,
  })
  .strip();

export const resumeExperienceInputSchema = z
  .object({
    id: z.string().optional(),
    company: optionalString,
    role: optionalString,
    location: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    highlights: optionalStringArray,
  })
  .strip();

export const resumeProjectInputSchema = z
  .object({
    id: z.string().optional(),
    name: optionalString,
    role: optionalString,
    summary: optionalString,
    link: optionalString,
    highlights: optionalStringArray,
  })
  .strip();

export const resumeEducationInputSchema = z
  .object({
    id: z.string().optional(),
    school: optionalString,
    degree: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    details: optionalString,
  })
  .strip();

export const resumeSkillInputSchema = z
  .object({
    id: z.string().optional(),
    title: optionalString,
    items: optionalStringArray,
  })
  .strip();

export const resumeLanguageInputSchema = z
  .object({
    id: z.string().optional(),
    name: optionalString,
    level: optionalString,
  })
  .strip();

export const resumeInterestInputSchema = z
  .object({
    id: z.string().optional(),
    name: optionalString,
  })
  .strip();

export const resumeAwardInputSchema = z
  .object({
    id: z.string().optional(),
    name: optionalString,
    issuer: optionalString,
    year: optionalString,
  })
  .strip();

export const resumeCustomFieldInputSchema = z
  .object({
    id: z.string().optional(),
    label: optionalString,
    value: optionalString,
  })
  .strip();

export const resumeCustomSectionInputSchema = z
  .object({
    id: z.string().optional(),
    title: optionalString,
    mode: resumeCustomSectionModeSchema.optional(),
    items: optionalStringArray,
    fields: z.array(resumeCustomFieldInputSchema).optional(),
    text: optionalString,
  })
  .strip();

export const resumePersonalExtraInputSchema = z
  .object({
    id: z.string().optional(),
    label: optionalString,
    value: optionalString,
  })
  .strip();

export const resumePersonalInputSchema = z
  .object({
    fullName: optionalString,
    title: optionalString,
    email: optionalString,
    emailLabel: optionalString,
    phone: optionalString,
    phoneLabel: optionalString,
    location: optionalString,
    locationLabel: optionalString,
    photo: optionalString,
    summary: optionalString,
    extras: z.array(resumePersonalExtraInputSchema).optional(),
  })
  .strip();

export const resumeSettingsInputSchema = z
  .object({
    personal: z
      .object({
        showPhoto: z.boolean().optional(),
        photoSize: z.number().finite().optional(),
        photoPosition: z.enum(['left', 'right']).optional(),
      })
      .strip()
      .optional(),
  })
  .strip();

export const resumeInputSchema = z
  .object({
    schemaVersion: z.number().int().optional(),
    personal: resumePersonalInputSchema,
    socials: z.array(resumeSocialInputSchema).optional(),
    experience: z.array(resumeExperienceInputSchema).optional(),
    projects: z.array(resumeProjectInputSchema).optional(),
    education: z.array(resumeEducationInputSchema).optional(),
    skills: z.array(resumeSkillInputSchema).optional(),
    languages: z.array(resumeLanguageInputSchema).optional(),
    interests: z.array(resumeInterestInputSchema).optional(),
    awards: z.array(resumeAwardInputSchema).optional(),
    customSections: z.array(resumeCustomSectionInputSchema).optional(),
    settings: resumeSettingsInputSchema.optional(),
  })
  .strip();

export const resumeSocialSchema = z
  .object({
    id: z.string(),
    label: optionalString,
    url: optionalString,
  })
  .strip();

export const resumeExperienceSchema = z
  .object({
    id: z.string(),
    company: optionalString,
    role: optionalString,
    location: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    highlights: z.array(z.string()),
  })
  .strip();

export const resumeProjectSchema = z
  .object({
    id: z.string(),
    name: optionalString,
    role: optionalString,
    summary: optionalString,
    link: optionalString,
    highlights: z.array(z.string()),
  })
  .strip();

export const resumeEducationSchema = z
  .object({
    id: z.string(),
    school: optionalString,
    degree: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    details: optionalString,
  })
  .strip();

export const resumeSkillSchema = z
  .object({
    id: z.string(),
    title: optionalString,
    items: z.array(z.string()),
  })
  .strip();

export const resumeLanguageSchema = z
  .object({
    id: z.string(),
    name: optionalString,
    level: optionalString,
  })
  .strip();

export const resumeInterestSchema = z
  .object({
    id: z.string(),
    name: optionalString,
  })
  .strip();

export const resumeAwardSchema = z
  .object({
    id: z.string(),
    name: optionalString,
    issuer: optionalString,
    year: optionalString,
  })
  .strip();

export const resumeCustomFieldSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  })
  .strip();

export const resumeCustomSectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    mode: resumeCustomSectionModeSchema,
    items: z.array(z.string()),
    fields: z.array(resumeCustomFieldSchema),
    text: z.string(),
  })
  .strip();

export const resumePersonalExtraSchema = z
  .object({
    id: z.string(),
    label: optionalString,
    value: optionalString,
  })
  .strip();

export const resumePersonalSchema = z
  .object({
    fullName: optionalString,
    title: optionalString,
    email: optionalString,
    emailLabel: optionalString,
    phone: optionalString,
    phoneLabel: optionalString,
    location: optionalString,
    locationLabel: optionalString,
    photo: optionalString,
    summary: optionalString,
    extras: z.array(resumePersonalExtraSchema).optional(),
  })
  .strip();

export const resumeSettingsSchema = z
  .object({
    personal: z
      .object({
        showPhoto: z.boolean().optional(),
        photoSize: z.number().finite().optional(),
        photoPosition: z.enum(['left', 'right']).optional(),
      })
      .strip()
      .optional(),
  })
  .strip();

export const resumeSchema = z
  .object({
    schemaVersion: z.literal(RESUME_SCHEMA_VERSION),
    personal: resumePersonalSchema,
    socials: z.array(resumeSocialSchema),
    experience: z.array(resumeExperienceSchema),
    projects: z.array(resumeProjectSchema),
    education: z.array(resumeEducationSchema),
    skills: z.array(resumeSkillSchema),
    languages: z.array(resumeLanguageSchema),
    interests: z.array(resumeInterestSchema),
    awards: z.array(resumeAwardSchema),
    customSections: z.array(resumeCustomSectionSchema),
    settings: resumeSettingsSchema.optional(),
  })
  .strip();
