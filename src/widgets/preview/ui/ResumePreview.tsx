import {
  extractCustomSectionId,
  isCustomSectionKey,
  sectionOrder,
} from '@entities/module';
import type { ResumeCustomSection, ResumeData } from '@entities/resume';
import type { TemplateTheme } from '@entities/template';
import { type CSSProperties, memo, type ReactNode,useMemo } from 'react';

const cn = (...classes: Array<string | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type VariantKey = 'modern' | 'classic' | 'creative' | 'custom';

type VariantConfig = {
  article: string;
  heading: string;
  subheading: string;
  metaWrapper: string;
  metaLabel: string;
  metaValue: string;
  sectionHeading: string;
  divider: string;
  card: string;
  chip: string;
  link: string;
  accentBar: string;
  bullet: string;
  timelineBorder: string;
  timelineMeta: string;
};

const modernVariant: VariantConfig = {
  article: 'border border-slate-200/80 bg-white/90 text-slate-600 shadow-soft',
  heading: 'text-slate-900 dark:text-white',
  subheading: 'text-blue-600 dark:text-blue-300',
  metaWrapper: 'text-slate-500 dark:text-slate-400',
  metaLabel: 'text-slate-700 dark:text-slate-300',
  metaValue: 'text-slate-500 dark:text-slate-400',
  sectionHeading: 'text-slate-900 dark:text-white',
  divider: 'border-slate-200 dark:border-slate-800',
  card: 'border border-slate-200/80 bg-slate-50/70 dark:border-slate-800/70 dark:bg-slate-900/40',
  chip: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200',
  link: 'text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200',
  accentBar: 'bg-blue-500/80',
  bullet: 'bg-blue-500',
  timelineBorder: 'border-slate-200 dark:border-slate-700',
  timelineMeta: 'text-slate-400 dark:text-slate-500',
};

const customVariant: VariantConfig = {
  article: 'border border-slate-200/50 bg-white/95 shadow-soft',
  heading: '',
  subheading: '',
  metaWrapper: '',
  metaLabel: '',
  metaValue: '',
  sectionHeading: '',
  divider: 'border-slate-200/50',
  card: 'border border-slate-200/40 bg-white/80',
  chip: '',
  link: '',
  accentBar: 'bg-slate-400/40',
  bullet: 'bg-slate-400',
  timelineBorder: 'border-slate-200/40',
  timelineMeta: '',
};

const variantConfig: Record<VariantKey, VariantConfig> = {
  modern: modernVariant,
  classic: {
    article:
      'border border-slate-800 bg-slate-950 text-slate-200 shadow-[0_35px_70px_-40px_rgba(15,23,42,0.85)]',
    heading: 'text-slate-100',
    subheading: 'text-cyan-300',
    metaWrapper: 'text-slate-300/80',
    metaLabel: 'text-slate-200',
    metaValue: 'text-slate-300/80',
    sectionHeading: 'text-cyan-200',
    divider: 'border-slate-800',
    card: 'border border-slate-800 bg-slate-900/60',
    chip: 'bg-cyan-500/20 text-cyan-200',
    link: 'text-cyan-300 hover:text-cyan-200',
    accentBar: 'bg-cyan-400',
    bullet: 'bg-cyan-300',
    timelineBorder: 'border-slate-800',
    timelineMeta: 'text-cyan-200/60',
  },
  creative: {
    article:
      'border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-slate-100 text-slate-600 shadow-[0_35px_70px_-40px_rgba(236,72,153,0.55)]',
    heading: 'text-rose-600',
    subheading: 'text-amber-500',
    metaWrapper: 'text-rose-400',
    metaLabel: 'text-rose-500',
    metaValue: 'text-rose-400',
    sectionHeading: 'text-rose-600',
    divider: 'border-rose-100',
    card: 'border border-rose-100/80 bg-white/75',
    chip: 'bg-rose-100 text-rose-500',
    link: 'text-rose-500 hover:text-rose-400',
    accentBar: 'bg-rose-400/80',
    bullet: 'bg-rose-400',
    timelineBorder: 'border-rose-100',
    timelineMeta: 'text-rose-300',
  },
  custom: customVariant,
};

const resolveVariant = (style: string): VariantConfig =>
  style in variantConfig ? variantConfig[style as VariantKey] : variantConfig.modern;

type SectionProps = {
  title: string;
  children: ReactNode;
  sectionKey: string;
  registerSectionRef?: (sectionKey: string, itemKey: string, node: HTMLElement | null) => void;
  variant: VariantConfig;
  accentStyle?: CSSProperties;
  headingStyle?: CSSProperties;
};

const Section = ({
  title,
  children,
  sectionKey,
  registerSectionRef,
  variant,
  accentStyle,
  headingStyle,
}: SectionProps) => {
  const handleRef = (node: HTMLElement | null) => {
    if (registerSectionRef) {
      registerSectionRef(sectionKey, '__section__', node);
    }
  };

  return (
    <section ref={handleRef} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={cn('h-2 w-8 rounded-full', variant.accentBar)} style={accentStyle} />
        <h3 className={cn('text-lg font-semibold', variant.sectionHeading)} style={headingStyle}>
          {title}
        </h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
};

type ResumePreviewProps = {
  resume: ResumeData;
  registerSectionRef?: (sectionKey: string, itemKey: string, node: HTMLElement | null) => void;
  templateStyle?: string;
  accentColor?: string;
  activeSections?: string[];
  theme?: TemplateTheme;
};

const ResumePreviewComponent = ({
  resume,
  registerSectionRef,
  templateStyle = 'modern',
  accentColor,
  activeSections,
  theme,
}: ResumePreviewProps) => {
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
  const personalSettings = {
    showPhoto: true,
    photoSize: 120,
    photoPosition: 'right',
    ...resume.settings?.personal,
  };
  const showPhoto = personalSettings.showPhoto !== false;
  const photoSize = Math.max(80, Math.min(Number(personalSettings.photoSize) || 120, 260));
  const photoPosition = personalSettings.photoPosition === 'left' ? 'left' : 'right';
  const shouldShowPhoto = showPhoto && Boolean(personal.photo);
  const extras = useMemo(
    () =>
      Array.isArray(personal.extras)
        ? personal.extras.filter((item) => item && (item.label || item.value))
        : [],
    [personal.extras],
  );
  const contactItems = useMemo(
    () => {
      const items: Array<{ id: string; label: string; value: string }> = [];

      if (personal.email) {
        items.push({ id: 'email', label: '邮箱', value: personal.email });
      }

      if (personal.phone) {
        items.push({ id: 'phone', label: '电话', value: personal.phone });
      }

      if (personal.location) {
        items.push({ id: 'location', label: '所在地', value: personal.location });
      }

      extras.forEach((extra, index) => {
        items.push({
          id: `extra-${extra.id ?? index}`,
          label: extra.label || '补充信息',
          value: extra.value || '',
        });
      });

      return items;
    },
    [extras, personal.email, personal.phone, personal.location],
  );
  const customSections = useMemo<ResumeCustomSection[]>(
    () =>
      Array.isArray(resume.customSections)
        ? (resume.customSections)
        : [],
    [resume.customSections],
  );

  const normalizedActiveSections = useMemo(
    () =>
      Array.isArray(activeSections) && activeSections.length > 0
        ? activeSections
        : sectionOrder.map((section) => section),
    [activeSections],
  );
  const activeSectionSet = useMemo(
    () => new Set<string>(normalizedActiveSections),
    [normalizedActiveSections],
  );

  const hasSocials = activeSectionSet.has('socials') && socials.length > 0;
  const hasSkills = activeSectionSet.has('skills') && skills.length > 0;
  const hasProjects = activeSectionSet.has('projects') && projects.length > 0;
  const hasExperience = activeSectionSet.has('experience') && experience.length > 0;
  const hasEducation = activeSectionSet.has('education') && education.length > 0;
  const hasAwards = activeSectionSet.has('awards') && awards.length > 0;
  const hasLanguages = activeSectionSet.has('languages') && languages.length > 0;
  const hasInterests = activeSectionSet.has('interests') && interests.length > 0;

  const customSectionRegistry = useMemo(
    () =>
      new Map<string, ResumeCustomSection>(
        customSections.map((section) => [section.id, section]),
      ),
    [customSections],
  );

  const setRef =
    (sectionKey: string, itemKey: string) =>
    (node: HTMLElement | null): void => {
      if (registerSectionRef) {
        registerSectionRef(sectionKey, itemKey, node);
      }
    };

  const variant = useMemo(() => resolveVariant(templateStyle), [templateStyle]);
  const resolvedAccent = accentColor ?? theme?.accent;
  const accentStyle: CSSProperties | undefined = useMemo(
    () => (resolvedAccent ? { background: resolvedAccent } : undefined),
    [resolvedAccent],
  );
  const accentBulletStyle = accentStyle;
  const themeStyles = useMemo(
    () =>
      ({
        article:
          theme?.background || theme?.text
            ? ({ background: theme.background, color: theme.text } as CSSProperties)
            : undefined,
        heading: theme?.heading ? ({ color: theme.heading } as CSSProperties) : undefined,
        subheading: theme?.subheading ? ({ color: theme.subheading } as CSSProperties) : undefined,
        text: theme?.text ? ({ color: theme.text } as CSSProperties) : undefined,
        muted: theme?.muted ? ({ color: theme.muted } as CSSProperties) : undefined,
        card:
          theme?.cardBackground || theme?.cardBorder
            ? ({
                background: theme.cardBackground,
                borderColor: theme.cardBorder,
              } as CSSProperties)
            : undefined,
        divider: theme?.divider ? ({ borderColor: theme.divider } as CSSProperties) : undefined,
        chip: resolvedAccent
          ? ({ background: resolvedAccent, color: '#ffffff' } as CSSProperties)
          : undefined,
        link: resolvedAccent ? ({ color: resolvedAccent } as CSSProperties) : undefined,
      }) as const,
    [resolvedAccent, theme],
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
  const renderStandardSection = (sectionKey: string): ReactNode => {
    switch (sectionKey) {
      case 'socials': {
        if (!hasSocials) return null;
        return (
          <Section
            key="section-socials"
            title="社交与链接"
            sectionKey="socials"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {socials.map((social) => (
                <li
                  key={social.id}
                  ref={setRef('socials', social.id)}
                  className={cn(
                    'rounded-2xl border border-transparent px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5',
                    variant.card,
                    variant.link,
                  )}
                  style={themeStyles.card}
                >
                  <p className={cn('font-semibold', variant.heading)} style={themeStyles.heading}>
                    {social.label || social.url || '链接'}
                  </p>
                  {social.url && (
                    <>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'mt-1 block truncate text-xs underline underline-offset-4 print:hidden',
                          variant.link,
                        )}
                        style={themeStyles.link}
                      >
                        {social.url}
                      </a>
                      <span
                        className={cn(
                          'mt-1 hidden break-words text-xs print:block',
                          variant.metaValue,
                        )}
                        style={themeStyles.text}
                      >
                        {social.url}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        );
      }
      case 'experience': {
        if (!hasExperience) return null;
        return (
          <Section
            key="section-experience"
            title="工作经历"
            sectionKey="experience"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="space-y-4">
              {experience.map((exp) => {
                const highlights = Array.isArray(exp.highlights)
                  ? exp.highlights.filter((item) => item && item.trim())
                  : [];
                return (
                  <li
                    key={exp.id}
                    ref={setRef('experience', exp.id)}
                    className={cn(
                      'rounded-2xl border border-transparent px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5',
                      variant.card,
                    )}
                    style={themeStyles.card}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4
                          className={cn('text-base font-semibold', variant.heading)}
                          style={themeStyles.heading}
                        >
                          {exp.company || '公司 / 组织'}
                        </h4>
                        <p className={cn('text-sm', variant.metaValue)} style={themeStyles.text}>
                          {exp.role || '职位'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs uppercase tracking-[0.28em] sm:text-right">
                        <span className={cn(variant.timelineMeta)} style={themeStyles.muted}>
                          {[exp.startDate, exp.endDate].filter(Boolean).join(' – ') || '时间'}
                        </span>
                        {exp.location && (
                          <span className={cn(variant.timelineMeta)} style={themeStyles.muted}>
                            {exp.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {highlights.length > 0 && (
                      <ul
                        className={cn('mt-3 space-y-2 text-sm', variant.metaValue)}
                        style={themeStyles.text}
                      >
                        {highlights.map((item, index) => (
                          <li key={index} className="flex gap-2">
                            <span
                              className={cn(
                                'mt-[0.4rem] h-1.5 w-1.5 flex-shrink-0 rounded-full',
                                variant.bullet,
                              )}
                              style={accentBulletStyle}
                            />
                            <span className="flex-1 break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      }
      case 'projects': {
        if (!hasProjects) return null;
        return (
          <Section
            key="section-projects"
            title="项目经历"
            sectionKey="projects"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="space-y-4">
              {projects.map((project) => {
                const hasLink = Boolean(project.link);
                return (
                  <li
                    key={project.id}
                    ref={setRef('projects', project.id)}
                    className={cn(
                      'rounded-2xl border border-transparent px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5',
                      variant.card,
                    )}
                    style={themeStyles.card}
                  >
                    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4
                          className={cn('text-base font-semibold', variant.heading)}
                          style={themeStyles.heading}
                        >
                          {project.name || '项目名称'}
                        </h4>
                        {project.role && (
                          <p
                            className={cn('text-sm', variant.metaValue)}
                            style={themeStyles.text}
                          >
                            {project.role}
                          </p>
                        )}
                      </div>
                      {hasLink && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'text-xs font-semibold uppercase tracking-wide underline underline-offset-4 print:hidden',
                            variant.link,
                          )}
                          style={themeStyles.link}
                        >
                          项目链接
                        </a>
                      )}
                    </header>
                    {project.link && (
                      <p
                        className={cn(
                          'mt-1 hidden break-all text-xs print:block',
                          variant.metaValue,
                        )}
                        style={themeStyles.text}
                      >
                        {project.link}
                      </p>
                    )}
                    {project.summary && (
                      <p
                        className={cn('mt-2 text-sm leading-6', variant.metaValue)}
                        style={themeStyles.text}
                      >
                        {project.summary}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      }
      case 'education': {
        if (!hasEducation) return null;
        return (
          <Section
            key="section-education"
            title="教育背景"
            sectionKey="education"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="space-y-3">
              {education.map((edu) => (
                <li
                  key={edu.id}
                  ref={setRef('education', edu.id)}
                  className={cn(
                    'rounded-2xl border border-transparent px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5',
                    variant.card,
                  )}
                  style={themeStyles.card}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4
                        className={cn('text-base font-semibold', variant.heading)}
                        style={themeStyles.heading}
                      >
                        {edu.school || '学校'}
                      </h4>
                      <p className={cn('text-sm', variant.metaValue)} style={themeStyles.text}>
                        {edu.degree || '学历 / 专业'}
                      </p>
                    </div>
                    <p className={cn('text-xs', variant.timelineMeta)} style={themeStyles.muted}>
                      {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                    </p>
                  </div>
                  {edu.details && (
                    <p
                      className={cn('mt-2 text-sm leading-6', variant.metaValue)}
                      style={themeStyles.text}
                    >
                      {edu.details}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        );
      }
      case 'skills': {
        if (!hasSkills) return null;
        return (
          <Section
            key="section-skills"
            title="技能特长"
            sectionKey="skills"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {skills.map((skill) => (
                <li
                  key={skill.id}
                  ref={setRef('skills', skill.id)}
                  className={cn(
                    'rounded-2xl border border-transparent px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5',
                    variant.card,
                  )}
                  style={themeStyles.card}
                >
                  <h4 className={cn('text-sm font-semibold', variant.heading)} style={themeStyles.heading}>
                    {skill.title || '技能方向'}
                  </h4>
                  <p
                    className={cn('mt-2 text-sm leading-6', variant.metaValue)}
                    style={themeStyles.text}
                  >
                    {(skill.items || []).filter(Boolean).join(' / ')}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        );
      }
      case 'languages': {
        if (!hasLanguages) return null;
        return (
          <Section
            key="section-languages"
            title="语言能力"
            sectionKey="languages"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="grid gap-2 sm:grid-cols-2">
              {languages.map((language) => (
                <li
                  key={language.id}
                  ref={setRef('languages', language.id)}
                  className={cn('flex flex-col gap-1 text-sm', variant.metaValue)}
                  style={themeStyles.text}
                >
                  <span className="font-semibold">{language.name}</span>
                  {language.level && (
                    <span className={cn('text-xs uppercase', variant.timelineMeta)} style={themeStyles.muted}>
                      {language.level}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        );
      }
      case 'interests': {
        if (!hasInterests) return null;
        return (
          <Section
            key="section-interests"
            title="兴趣爱好"
            sectionKey="interests"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <p className={cn('text-sm', variant.metaValue)} style={themeStyles.text}>
              {interests.map((interest) => interest.name).filter(Boolean).join(' ｜ ')}
            </p>
          </Section>
        );
      }
      case 'awards': {
        if (!hasAwards) return null;
        return (
          <Section
            key="section-awards"
            title="荣誉奖项"
            sectionKey="awards"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <ul className="space-y-2 text-sm">
              {awards.map((award) => (
                <li
                  key={award.id}
                  ref={setRef('awards', award.id)}
                  className={cn('flex items-start justify-between gap-2', variant.metaValue)}
                  style={themeStyles.text}
                >
                  <span>{award.name}</span>
                  <span className={cn('text-xs', variant.timelineMeta)} style={themeStyles.muted}>
                    {[award.issuer, award.year].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        );
      }
      default: {
        return null;
      }
    }
  };

  const renderCustomSection = (
    sectionKey: string,
    section: ResumeCustomSection | null,
  ): ReactNode => {
    if (!section) {
      return null;
    }

    const title = section.title || '自定义模块';
    const mode = section.mode || 'list';
    const items = Array.isArray(section.items)
      ? section.items.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : [];
    const fields = Array.isArray(section.fields)
      ? section.fields.filter((field) => field && (field.label || field.value))
      : [];
    const text = typeof section.text === 'string' ? section.text.trim() : '';

    return (
      <Section
        key={sectionKey}
        title={title}
        sectionKey={sectionKey}
        registerSectionRef={registerSectionRef}
        accentStyle={accentStyle}
        variant={variant}
        headingStyle={themeStyles.heading}
      >
        {mode === 'fields' && fields.length > 0 ? (
          <dl className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="flex gap-2 text-sm">
                <dt
                  className={cn('font-semibold uppercase tracking-wide', variant.metaLabel)}
                  style={themeStyles.heading}
                >
                  {field.label || '字段'}
                </dt>
                <dd className={cn('flex-1 break-words', variant.metaValue)} style={themeStyles.text}>
                  {field.value || '填写内容'}
                </dd>
              </div>
            ))}
          </dl>
        ) : mode === 'text' && text ? (
          <p className={cn('whitespace-pre-line text-sm', variant.metaValue)} style={themeStyles.text}>
            {text}
          </p>
        ) : items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={item || index} className="flex gap-2">
                <span
                  className={cn(
                    'mt-[0.4rem] h-1.5 w-1.5 flex-shrink-0 rounded-full',
                    variant.bullet,
                  )}
                  style={accentBulletStyle}
                />
                <span className={cn('flex-1', variant.metaValue)} style={themeStyles.text}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn('text-slate-500 dark:text-slate-400', variant.metaValue)} style={themeStyles.muted}>
            暂无内容
          </p>
        )}
      </Section>
    );
  };

  const orderedSectionNodes = normalizedActiveSections
    .map((sectionKey) => {
      if (sectionOrder.includes(sectionKey as (typeof sectionOrder)[number])) {
        return renderStandardSection(sectionKey);
      }
      if (isCustomSectionKey(sectionKey)) {
        const id = extractCustomSectionId(sectionKey);
        const section = id ? customSectionRegistry.get(id) ?? null : null;
        return renderCustomSection(sectionKey, section);
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
      <div
        ref={setRef('personal', '__section__')}
        className={cn('flex flex-col gap-6 pb-6', variant.divider)}
        style={themeStyles.divider}
      >
        <div className="flex flex-col gap-6">
          <div
            className={cn(
              'flex flex-col gap-4 sm:gap-6 sm:items-center sm:justify-between print:items-center print:justify-between',
              shouldShowPhoto
                ? (photoPosition === 'left'
                  ? 'sm:flex-row-reverse print:flex-row-reverse'
                  : 'sm:flex-row print:flex-row')
                : 'sm:flex-row print:flex-row',
            )}
          >
            <div className="space-y-2 sm:flex-1">
              <h1
                className={cn('text-3xl font-semibold tracking-tight', variant.heading)}
                style={themeStyles.heading}
              >
                {personal.fullName || '你的姓名'}
              </h1>
              <p className={cn('text-base font-medium', variant.subheading)} style={themeStyles.subheading}>
                {personal.title || '职业定位 / 目标'}
              </p>
            </div>
            {shouldShowPhoto && (
              <img
                src={personal.photo}
                alt={`${personal.fullName || '候选人'} 的照片`}
                className="flex-shrink-0 rounded-3xl object-cover shadow-lg shadow-slate-300/30 ring-4 ring-slate-200/50 dark:ring-slate-700/40"
                style={{
                  width: `${photoSize}px`,
                  height: `${photoSize}px`,
                  boxShadow: accentStyle ? `0 18px 40px -22px ${resolvedAccent}` : undefined,
                }}
              />
            )}
          </div>
          {contactItems.length > 0 && (
            <div className={cn('text-sm', variant.metaWrapper)} style={themeStyles.muted}>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
                {contactItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[auto,1fr] items-baseline gap-x-2">
                    <dt className={cn('font-medium', variant.metaLabel)} style={themeStyles.heading}>
                      {item.label}
                    </dt>
                    <dd className={cn('break-words', variant.metaValue)} style={themeStyles.text}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
        {personal.summary && (
          <Section
            title="个人简介"
            sectionKey="summary"
            registerSectionRef={registerSectionRef}
            accentStyle={accentStyle}
            variant={variant}
            headingStyle={themeStyles.heading}
          >
            <p className={cn('text-base leading-7', variant.metaValue)} style={themeStyles.text}>
              {personal.summary}
            </p>
          </Section>
        )}
      </div>
      {orderedSectionNodes}
    </article>
  );
};

const arePropsEqual = (prev: ResumePreviewProps, next: ResumePreviewProps): boolean =>
  prev.resume === next.resume &&
  prev.templateStyle === next.templateStyle &&
  prev.accentColor === next.accentColor &&
  prev.activeSections === next.activeSections &&
  prev.theme === next.theme &&
  prev.registerSectionRef === next.registerSectionRef;

export default memo(ResumePreviewComponent, arePropsEqual);
