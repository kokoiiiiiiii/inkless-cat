import { sectionOrder } from '@entities/module';
import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import type { CSSProperties } from 'react';
import { useCallback, useMemo } from 'react';

import { resolveVariant, type ThemeStyles, type VariantConfig } from '../lib/variants';

export type RegisterSectionRef = (
  sectionKey: string,
  itemKey: string,
  node: HTMLElement | null,
) => void;

export type SectionFlags = {
  socials: boolean;
  skills: boolean;
  projects: boolean;
  experience: boolean;
  education: boolean;
  awards: boolean;
  languages: boolean;
  interests: boolean;
};

type PersonalSettingsState = {
  showPhoto: boolean;
  photoSize: number;
  photoPosition: 'left' | 'right';
  shouldShowPhoto: boolean;
};

type ContactItem = {
  id: string;
  label: string;
  value: string;
};

type SectionsData = {
  socials: NonNullable<ResumeData['socials']>;
  experience: NonNullable<ResumeData['experience']>;
  projects: NonNullable<ResumeData['projects']>;
  education: NonNullable<ResumeData['education']>;
  skills: NonNullable<ResumeData['skills']>;
  languages: NonNullable<ResumeData['languages']>;
  interests: NonNullable<ResumeData['interests']>;
  awards: NonNullable<ResumeData['awards']>;
};

type UseResumePreviewStateParams = {
  resume: ResumeData;
  templateStyle?: string;
  accentColor?: string;
  activeSections?: string[];
  theme?: TemplateTheme;
  registerSectionRef?: RegisterSectionRef;
};

export type UseResumePreviewStateResult = {
  personal: NonNullable<ResumeData['personal']>;
  personalSettings: PersonalSettingsState;
  contactItems: ContactItem[];
  sections: SectionsData;
  sectionFlags: SectionFlags;
  customSections: ResumeCustomSection[];
  customSectionRegistry: Map<string, ResumeCustomSection>;
  normalizedActiveSections: string[];
  variant: VariantConfig;
  themeStyles: ThemeStyles;
  accentStyle?: CSSProperties;
  accentBulletStyle?: CSSProperties;
  articleStyle: CSSProperties;
  setSectionRef: (sectionKey: string, itemKey: string) => (node: HTMLElement | null) => void;
  registerSectionRef?: RegisterSectionRef;
  resolvedAccent?: string;
};

const clampPhotoSize = (value: number): number => Math.max(80, Math.min(value, 260));

export const useResumePreviewState = ({
  resume,
  templateStyle = 'modern',
  accentColor,
  activeSections,
  theme,
  registerSectionRef,
}: UseResumePreviewStateParams): UseResumePreviewStateResult => {
  const {
    personal = {},
    socials = [],
    experience = [],
    projects = [],
    education = [],
    skills = [],
    languages = [],
    interests = [],
    awards = [],
  } = resume;

  const personalSettingsRaw = {
    showPhoto: true,
    photoSize: 120,
    photoPosition: 'right',
    ...resume.settings?.personal,
  };

  const showPhoto = personalSettingsRaw.showPhoto !== false;
  const photoSize = clampPhotoSize(Number(personalSettingsRaw.photoSize) || 120);
  const photoPosition: 'left' | 'right' =
    personalSettingsRaw.photoPosition === 'left' ? 'left' : 'right';
  const shouldShowPhoto = showPhoto && Boolean(personal.photo);

  const extras = useMemo(
    () =>
      Array.isArray(personal.extras)
        ? personal.extras.filter((item) => item && (item.label || item.value))
        : [],
    [personal.extras],
  );

  const contactItems = useMemo<ContactItem[]>(() => {
    const items: ContactItem[] = [];

    if (personal.email) {
      const emailLabel =
        typeof personal.emailLabel === 'string' && personal.emailLabel.trim()
          ? personal.emailLabel.trim()
          : '邮箱';
      items.push({ id: 'email', label: emailLabel, value: personal.email });
    }

    if (personal.phone) {
      const phoneLabel =
        typeof personal.phoneLabel === 'string' && personal.phoneLabel.trim()
          ? personal.phoneLabel.trim()
          : '电话';
      items.push({ id: 'phone', label: phoneLabel, value: personal.phone });
    }

    if (personal.location) {
      const locationLabel =
        typeof personal.locationLabel === 'string' && personal.locationLabel.trim()
          ? personal.locationLabel.trim()
          : '所在地';
      items.push({ id: 'location', label: locationLabel, value: personal.location });
    }

    for (const [index, extra] of extras.entries()) {
      items.push({
        id: `extra-${extra.id ?? index}`,
        label: extra.label || '信息',
        value: extra.value || '',
      });
    }

    return items;
  }, [
    extras,
    personal.email,
    personal.emailLabel,
    personal.phone,
    personal.phoneLabel,
    personal.location,
    personal.locationLabel,
  ]);

  const customSections = useMemo<ResumeCustomSection[]>(
    () => (Array.isArray(resume.customSections) ? resume.customSections : []),
    [resume.customSections],
  );

  const customSectionRegistry = useMemo(
    () =>
      new Map<string, ResumeCustomSection>(customSections.map((section) => [section.id, section])),
    [customSections],
  );

  const normalizedActiveSections = useMemo(
    () => (Array.isArray(activeSections) ? activeSections : [...sectionOrder]),
    [activeSections],
  );

  const activeSectionSet = useMemo(
    () => new Set<string>(normalizedActiveSections),
    [normalizedActiveSections],
  );

  const sectionFlags: SectionFlags = {
    socials: activeSectionSet.has('socials') && socials.length > 0,
    skills: activeSectionSet.has('skills') && skills.length > 0,
    projects: activeSectionSet.has('projects') && projects.length > 0,
    experience: activeSectionSet.has('experience') && experience.length > 0,
    education: activeSectionSet.has('education') && education.length > 0,
    awards: activeSectionSet.has('awards') && awards.length > 0,
    languages: activeSectionSet.has('languages') && languages.length > 0,
    interests: activeSectionSet.has('interests') && interests.length > 0,
  };

  const variant = useMemo(() => resolveVariant(templateStyle), [templateStyle]);
  const resolvedAccent = accentColor ?? theme?.accent;

  const accentStyle = useMemo<CSSProperties | undefined>(
    () => (resolvedAccent ? { background: resolvedAccent } : undefined),
    [resolvedAccent],
  );

  const themeStyles = useMemo<ThemeStyles>(
    () => ({
      article:
        theme?.background || theme?.text
          ? ({ background: theme?.background, color: theme?.text } as CSSProperties)
          : undefined,
      heading: theme?.heading ? ({ color: theme.heading } as CSSProperties) : undefined,
      subheading: theme?.subheading ? ({ color: theme.subheading } as CSSProperties) : undefined,
      text: theme?.text ? ({ color: theme.text } as CSSProperties) : undefined,
      muted: theme?.muted ? ({ color: theme.muted } as CSSProperties) : undefined,
      card:
        theme?.cardBackground || theme?.cardBorder
          ? ({
              background: theme?.cardBackground,
              borderColor: theme?.cardBorder,
            } as CSSProperties)
          : undefined,
      divider: theme?.divider ? ({ borderColor: theme.divider } as CSSProperties) : undefined,
      chip: resolvedAccent
        ? ({ background: resolvedAccent, color: '#ffffff' } as CSSProperties)
        : undefined,
      link: resolvedAccent ? ({ color: resolvedAccent } as CSSProperties) : undefined,
    }),
    [
      resolvedAccent,
      theme?.background,
      theme?.cardBackground,
      theme?.cardBorder,
      theme?.divider,
      theme?.heading,
      theme?.muted,
      theme?.subheading,
      theme?.text,
    ],
  );

  const articleStyle = useMemo(
    () =>
      ({
        ...themeStyles.article,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }) as CSSProperties,
    [themeStyles.article],
  );

  const setSectionRef = useCallback(
    (sectionKey: string, itemKey: string) => (node: HTMLElement | null) => {
      if (registerSectionRef) {
        registerSectionRef(sectionKey, itemKey, node);
      }
    },
    [registerSectionRef],
  );

  const personalSettings: PersonalSettingsState = {
    showPhoto,
    photoSize,
    photoPosition,
    shouldShowPhoto,
  };

  return {
    personal,
    personalSettings,
    contactItems,
    sections: {
      socials,
      experience,
      projects,
      education,
      skills,
      languages,
      interests,
      awards,
    },
    sectionFlags,
    customSections,
    customSectionRegistry,
    normalizedActiveSections,
    variant,
    themeStyles,
    accentStyle,
    accentBulletStyle: accentStyle,
    articleStyle,
    setSectionRef,
    registerSectionRef,
    resolvedAccent,
  };
};
