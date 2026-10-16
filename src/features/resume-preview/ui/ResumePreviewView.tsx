import {
  extractCustomSectionId,
  isCustomSectionKey,
  sectionOrder,
  type StandardSectionKey,
} from '@entities/module';
import type { ResumeCustomSection } from '@entities/resume';
import { Fragment, memo, type ReactNode } from 'react';

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

const isStandardSectionKey = (key: string): key is StandardSectionKey =>
  sectionOrder.includes(key as StandardSectionKey);

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
  const commonSectionProps = {
    variant,
    themeStyles,
    registerSectionRef: effectiveRegisterRef,
    accentStyle,
    accentBulletStyle,
    setSectionRef,
  };

  const renderStandardSection = (sectionKey: StandardSectionKey): ReactNode => {
    switch (sectionKey) {
      case 'socials': {
        return (
          <SocialsSection
            items={sections.socials}
            visible={sectionFlags.socials}
            {...commonSectionProps}
          />
        );
      }
      case 'experience': {
        return (
          <ExperienceSection
            items={sections.experience}
            visible={sectionFlags.experience}
            {...commonSectionProps}
          />
        );
      }
      case 'education': {
        return (
          <EducationSection
            items={sections.education}
            visible={sectionFlags.education}
            {...commonSectionProps}
          />
        );
      }
      case 'projects': {
        return (
          <ProjectsSection
            items={sections.projects}
            visible={sectionFlags.projects}
            {...commonSectionProps}
          />
        );
      }
      case 'skills': {
        return (
          <SkillsSection
            items={sections.skills}
            visible={sectionFlags.skills}
            {...commonSectionProps}
          />
        );
      }
      case 'languages': {
        return (
          <LanguagesSection
            items={sections.languages}
            visible={sectionFlags.languages}
            {...commonSectionProps}
          />
        );
      }
      case 'interests': {
        return (
          <InterestsSection
            items={sections.interests}
            visible={sectionFlags.interests}
            {...commonSectionProps}
          />
        );
      }
      case 'awards': {
        return (
          <AwardsSection
            items={sections.awards}
            visible={sectionFlags.awards}
            {...commonSectionProps}
          />
        );
      }
    }
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
      setSectionRef={setSectionRef}
    />
  );

  const orderedSectionNodes = normalizedActiveSections
    .map((key) => {
      if (isStandardSectionKey(key)) {
        return <Fragment key={key}>{renderStandardSection(key)}</Fragment>;
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
