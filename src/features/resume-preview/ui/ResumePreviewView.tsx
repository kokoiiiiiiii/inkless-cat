import { extractCustomSectionId, isCustomSectionKey, sectionOrder } from '@entities/module';
import type { ResumeCustomSection } from '@entities/resume';
import { type CSSProperties, Fragment, memo, type ReactNode } from 'react';

import { cn } from '../lib/cn';
import type {
  RegisterSectionRef,
  UseResumePreviewStateResult,
} from '../model/useResumePreviewState';
import { PersonalHeader } from './components/PersonalHeader';
import {
  AwardsSection,
  CustomSection,
  EducationSection,
  ExperienceSection,
  InterestsSection,
  LanguagesSection,
  ProjectsSection,
  SkillsSection,
  SocialsSection,
} from './sections';

type ResumePreviewViewProps = {
  state: UseResumePreviewStateResult;
  registerSectionRef?: RegisterSectionRef;
};

type SectionRenderer = (props: {
  items: any[];
  visible: boolean;
  variant: UseResumePreviewStateResult['variant'];
  themeStyles: UseResumePreviewStateResult['themeStyles'];
  registerSectionRef?: RegisterSectionRef;
  accentStyle?: CSSProperties;
  accentBulletStyle?: CSSProperties;
  setSectionRef: UseResumePreviewStateResult['setSectionRef'];
}) => ReactNode;

const standardSectionRenderers: Record<string, SectionRenderer> = {
  socials: SocialsSection as SectionRenderer,
  experience: ExperienceSection as SectionRenderer,
  projects: ProjectsSection as SectionRenderer,
  education: EducationSection as SectionRenderer,
  skills: SkillsSection as SectionRenderer,
  languages: LanguagesSection as SectionRenderer,
  interests: InterestsSection as SectionRenderer,
  awards: AwardsSection as SectionRenderer,
};

const ResumePreviewViewComponent = ({ state, registerSectionRef }: ResumePreviewViewProps) => {
  const {
    personal,
    personalSettings,
    contactItems,
    sections,
    sectionFlags,
    normalizedActiveSections,
    customSectionRegistry,
    variant,
    themeStyles,
    accentStyle,
    accentBulletStyle,
    articleStyle,
    setSectionRef,
    resolvedAccent,
    registerSectionRef: stateRegisterSectionRef,
  } = state;

  const effectiveRegisterRef = registerSectionRef ?? stateRegisterSectionRef;

  const renderStandardSection = (sectionKey: string) => {
    const renderer = standardSectionRenderers[sectionKey];
    if (!renderer) {
      return null;
    }

    const items = (sections as Record<string, any[]>)[sectionKey] ?? [];
    const visible = (sectionFlags as Record<string, boolean>)[sectionKey] ?? false;

    return renderer({
      items,
      visible,
      variant,
      themeStyles,
      registerSectionRef: effectiveRegisterRef,
      accentStyle,
      accentBulletStyle,
      setSectionRef,
    });
  };

  const renderCustomSectionNode = (
    sectionKey: string,
    section: ResumeCustomSection | null,
  ): ReactNode => (
    <CustomSection
      key={sectionKey}
      sectionKey={sectionKey}
      section={section}
      variant={variant}
      themeStyles={themeStyles}
      registerSectionRef={effectiveRegisterRef}
      accentStyle={accentStyle}
      accentBulletStyle={accentBulletStyle}
    />
  );

  const orderedSectionNodes = normalizedActiveSections
    .map((key) => {
      if (sectionOrder.includes(key as (typeof sectionOrder)[number])) {
        const sectionNode = renderStandardSection(key);
        if (!sectionNode) {
          return null;
        }
        return <Fragment key={key}>{sectionNode}</Fragment>;
      }

      if (isCustomSectionKey(key)) {
        const id = extractCustomSectionId(key);
        const section = id ? (customSectionRegistry.get(id) ?? null) : null;
        return renderCustomSectionNode(key, section);
      }

      return null;
    })
    .filter(Boolean);

  return (
    <article
      className={cn(
        'resume-preview flex min-h-full w-full flex-col gap-6 rounded-3xl p-4 text-sm leading-relaxed sm:gap-8 sm:p-6',
        variant.article,
      )}
      style={articleStyle}
    >
      <PersonalHeader
        personal={personal}
        contactItems={contactItems}
        personalSettings={personalSettings}
        variant={variant}
        themeStyles={themeStyles}
        accentStyle={accentStyle}
        resolvedAccent={resolvedAccent}
        registerSectionRef={effectiveRegisterRef}
      />
      {orderedSectionNodes}
    </article>
  );
};

ResumePreviewViewComponent.displayName = 'ResumePreviewView';

export const ResumePreviewView = memo(ResumePreviewViewComponent);

export default ResumePreviewView;
