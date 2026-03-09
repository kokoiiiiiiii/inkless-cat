import type { z } from 'zod';

import type {
  resumeAwardInputSchema,
  resumeAwardSchema,
  resumeCustomFieldInputSchema,
  resumeCustomFieldSchema,
  resumeCustomSectionInputSchema,
  resumeCustomSectionModeSchema,
  resumeCustomSectionSchema,
  resumeEducationInputSchema,
  resumeEducationSchema,
  resumeExperienceInputSchema,
  resumeExperienceSchema,
  resumeInputSchema,
  resumeInterestInputSchema,
  resumeInterestSchema,
  resumeLanguageInputSchema,
  resumeLanguageSchema,
  resumePersonalExtraInputSchema,
  resumePersonalExtraSchema,
  resumePersonalInputSchema,
  resumePersonalSchema,
  resumeProjectInputSchema,
  resumeProjectSchema,
  resumeSchema,
  resumeSettingsInputSchema,
  resumeSettingsSchema,
  resumeSkillInputSchema,
  resumeSkillSchema,
  resumeSocialInputSchema,
  resumeSocialSchema,
} from './schema/resume';

export type ResumeSocial = z.infer<typeof resumeSocialSchema>;
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;
export type ResumeProject = z.infer<typeof resumeProjectSchema>;
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;
export type ResumeSkill = z.infer<typeof resumeSkillSchema>;
export type ResumeLanguage = z.infer<typeof resumeLanguageSchema>;
export type ResumeInterest = z.infer<typeof resumeInterestSchema>;
export type ResumeAward = z.infer<typeof resumeAwardSchema>;
export type ResumeCustomField = z.infer<typeof resumeCustomFieldSchema>;
export type ResumeCustomSectionMode = z.infer<typeof resumeCustomSectionModeSchema>;
export type ResumeCustomSection = z.infer<typeof resumeCustomSectionSchema>;
export type ResumePersonalExtra = z.infer<typeof resumePersonalExtraSchema>;
export type ResumePersonal = z.infer<typeof resumePersonalSchema>;
export type ResumeSettings = z.infer<typeof resumeSettingsSchema>;
export type ResumeData = z.infer<typeof resumeSchema>;

export type ResumeSocialInput = z.infer<typeof resumeSocialInputSchema>;
export type ResumeExperienceInput = z.infer<typeof resumeExperienceInputSchema>;
export type ResumeProjectInput = z.infer<typeof resumeProjectInputSchema>;
export type ResumeEducationInput = z.infer<typeof resumeEducationInputSchema>;
export type ResumeSkillInput = z.infer<typeof resumeSkillInputSchema>;
export type ResumeLanguageInput = z.infer<typeof resumeLanguageInputSchema>;
export type ResumeInterestInput = z.infer<typeof resumeInterestInputSchema>;
export type ResumeAwardInput = z.infer<typeof resumeAwardInputSchema>;
export type ResumeCustomFieldInput = z.infer<typeof resumeCustomFieldInputSchema>;
export type ResumeCustomSectionInput = z.infer<typeof resumeCustomSectionInputSchema>;
export type ResumePersonalExtraInput = z.infer<typeof resumePersonalExtraInputSchema>;
export type ResumePersonalInput = z.infer<typeof resumePersonalInputSchema>;
export type ResumeSettingsInput = z.infer<typeof resumeSettingsInputSchema>;
export type ResumeInputData = z.infer<typeof resumeInputSchema>;
