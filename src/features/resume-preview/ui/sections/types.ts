import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import type { CSSProperties } from 'react';

import type { ThemeStyles, VariantConfig } from '../../lib/variants';
import type { RegisterSectionRef } from '../../model/useResumePreviewState';

export type BaseSectionProps = {
  variant: VariantConfig;
  themeStyles: ThemeStyles;
  accentStyle?: CSSProperties;
  accentBulletStyle?: CSSProperties;
  registerSectionRef?: RegisterSectionRef;
  setSectionRef: (sectionKey: string, itemKey: string) => (node: HTMLElement | null) => void;
};

export type SectionCollectionProps<T> = BaseSectionProps & {
  items: T[];
  visible: boolean;
};

export type CustomSectionProps = BaseSectionProps & {
  sectionKey: string;
  section: ResumeCustomSection | null;
};

export type SkillsItem = NonNullable<ResumeData['skills']>[number];
export type ExperienceItem = NonNullable<ResumeData['experience']>[number];
export type EducationItem = NonNullable<ResumeData['education']>[number];
export type ProjectItem = NonNullable<ResumeData['projects']>[number];
export type LanguageItem = NonNullable<ResumeData['languages']>[number];
export type InterestItem = NonNullable<ResumeData['interests']>[number];
export type AwardItem = NonNullable<ResumeData['awards']>[number];
