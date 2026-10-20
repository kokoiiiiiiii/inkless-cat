import {
  MAX_CUSTOM_SECTIONS,
  MAX_PHOTO_DATA_URL_LENGTH,
  MAX_RESUME_TEXT_LENGTH,
  MAX_SECTION_ITEMS,
} from '@shared/lib/limits';
import { z } from 'zod';

export const RESUME_SCHEMA_VERSION = 1 as const;

const optionalString = z.string().max(MAX_RESUME_TEXT_LENGTH).optional();
const optionalStringArray = z
  .array(z.string().max(MAX_RESUME_TEXT_LENGTH))
  .max(MAX_SECTION_ITEMS)
  .optional();
const optionalId = z.string().max(128).optional();
const idSchema = z.string().min(1).max(128);

export const resumeCustomSectionModeSchema = z.enum(['list', 'fields', 'text']);

export const resumeSocialInputSchema = z
  .object({
    id: optionalId,
    label: optionalString,
    url: optionalString,
  })
  .strip();

export const resumeExperienceInputSchema = z
  .object({
    id: optionalId,
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
    id: optionalId,
    name: optionalString,
    role: optionalString,
    summary: optionalString,
    link: optionalString,
    highlights: optionalStringArray,
  })
  .strip();

export const resumeEducationInputSchema = z
  .object({
    id: optionalId,
    school: optionalString,
    degree: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    details: optionalString,
  })
  .strip();

export const resumeSkillInputSchema = z
  .object({
    id: optionalId,
    title: optionalString,
    items: optionalStringArray,
  })
  .strip();

export const resumeLanguageInputSchema = z
  .object({
    id: optionalId,
    name: optionalString,
    level: optionalString,
  })
  .strip();

export const resumeInterestInputSchema = z
  .object({
    id: optionalId,
    name: optionalString,
  })
  .strip();

export const resumeAwardInputSchema = z
  .object({
    id: optionalId,
    name: optionalString,
    issuer: optionalString,
    year: optionalString,
  })
  .strip();

export const resumeCustomFieldInputSchema = z
  .object({
    id: optionalId,
    label: optionalString,
    value: optionalString,
  })
  .strip();

export const resumeCustomSectionInputSchema = z
  .object({
    id: optionalId,
    title: optionalString,
    mode: resumeCustomSectionModeSchema.optional(),
    items: optionalStringArray,
    fields: z.array(resumeCustomFieldInputSchema).max(MAX_SECTION_ITEMS).optional(),
    text: optionalString,
  })
  .strip();

export const resumePersonalExtraInputSchema = z
  .object({
    id: optionalId,
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
    photo: z.string().max(MAX_PHOTO_DATA_URL_LENGTH).optional(),
    summary: optionalString,
    extras: z.array(resumePersonalExtraInputSchema).max(MAX_SECTION_ITEMS).optional(),
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
    socials: z.array(resumeSocialInputSchema).max(MAX_SECTION_ITEMS).optional(),
    experience: z.array(resumeExperienceInputSchema).max(MAX_SECTION_ITEMS).optional(),
    projects: z.array(resumeProjectInputSchema).max(MAX_SECTION_ITEMS).optional(),
    education: z.array(resumeEducationInputSchema).max(MAX_SECTION_ITEMS).optional(),
    skills: z.array(resumeSkillInputSchema).max(MAX_SECTION_ITEMS).optional(),
    languages: z.array(resumeLanguageInputSchema).max(MAX_SECTION_ITEMS).optional(),
    interests: z.array(resumeInterestInputSchema).max(MAX_SECTION_ITEMS).optional(),
    awards: z.array(resumeAwardInputSchema).max(MAX_SECTION_ITEMS).optional(),
    customSections: z.array(resumeCustomSectionInputSchema).max(MAX_CUSTOM_SECTIONS).optional(),
    settings: resumeSettingsInputSchema.optional(),
  })
  .strip();

export const resumeSocialSchema = z
  .object({
    id: idSchema,
    label: optionalString,
    url: optionalString,
  })
  .strip();

export const resumeExperienceSchema = z
  .object({
    id: idSchema,
    company: optionalString,
    role: optionalString,
    location: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    highlights: z.array(z.string().max(MAX_RESUME_TEXT_LENGTH)).max(MAX_SECTION_ITEMS),
  })
  .strip();

export const resumeProjectSchema = z
  .object({
    id: idSchema,
    name: optionalString,
    role: optionalString,
    summary: optionalString,
    link: optionalString,
    highlights: z.array(z.string().max(MAX_RESUME_TEXT_LENGTH)).max(MAX_SECTION_ITEMS),
  })
  .strip();

export const resumeEducationSchema = z
  .object({
    id: idSchema,
    school: optionalString,
    degree: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    details: optionalString,
  })
  .strip();

export const resumeSkillSchema = z
  .object({
    id: idSchema,
    title: optionalString,
    items: z.array(z.string().max(MAX_RESUME_TEXT_LENGTH)).max(MAX_SECTION_ITEMS),
  })
  .strip();

export const resumeLanguageSchema = z
  .object({
    id: idSchema,
    name: optionalString,
    level: optionalString,
  })
  .strip();

export const resumeInterestSchema = z
  .object({
    id: idSchema,
    name: optionalString,
  })
  .strip();

export const resumeAwardSchema = z
  .object({
    id: idSchema,
    name: optionalString,
    issuer: optionalString,
    year: optionalString,
  })
  .strip();

export const resumeCustomFieldSchema = z
  .object({
    id: idSchema,
    label: z.string().max(MAX_RESUME_TEXT_LENGTH),
    value: z.string().max(MAX_RESUME_TEXT_LENGTH),
  })
  .strip();

export const resumeCustomSectionSchema = z
  .object({
    id: idSchema,
    title: z.string().max(MAX_RESUME_TEXT_LENGTH),
    mode: resumeCustomSectionModeSchema,
    items: z.array(z.string().max(MAX_RESUME_TEXT_LENGTH)).max(MAX_SECTION_ITEMS),
    fields: z.array(resumeCustomFieldSchema).max(MAX_SECTION_ITEMS),
    text: z.string().max(MAX_RESUME_TEXT_LENGTH),
  })
  .strip();

export const resumePersonalExtraSchema = z
  .object({
    id: idSchema,
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
    photo: z.string().max(MAX_PHOTO_DATA_URL_LENGTH).optional(),
    summary: optionalString,
    extras: z.array(resumePersonalExtraSchema).max(MAX_SECTION_ITEMS).optional(),
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
    socials: z.array(resumeSocialSchema).max(MAX_SECTION_ITEMS),
    experience: z.array(resumeExperienceSchema).max(MAX_SECTION_ITEMS),
    projects: z.array(resumeProjectSchema).max(MAX_SECTION_ITEMS),
    education: z.array(resumeEducationSchema).max(MAX_SECTION_ITEMS),
    skills: z.array(resumeSkillSchema).max(MAX_SECTION_ITEMS),
    languages: z.array(resumeLanguageSchema).max(MAX_SECTION_ITEMS),
    interests: z.array(resumeInterestSchema).max(MAX_SECTION_ITEMS),
    awards: z.array(resumeAwardSchema).max(MAX_SECTION_ITEMS),
    customSections: z.array(resumeCustomSectionSchema).max(MAX_CUSTOM_SECTIONS),
    settings: resumeSettingsSchema.optional(),
  })
  .strip();
