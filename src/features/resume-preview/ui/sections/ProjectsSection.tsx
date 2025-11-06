import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { ProjectItem, SectionCollectionProps } from './types';

export type ProjectsSectionProps = SectionCollectionProps<ProjectItem>;

export const ProjectsSection = ({
  items: projects,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
  accentBulletStyle,
}: ProjectsSectionProps) => {
  if (!visible) return null;

  return (
    <SectionContainer
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
              ref={setSectionRef('projects', project.id)}
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
                    <p className={cn('text-sm', variant.metaValue)} style={themeStyles.text}>
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
                  className={cn('mt-1 hidden break-all text-xs print:block', variant.metaValue)}
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
              {Array.isArray(project.highlights) && project.highlights.length > 0 && (
                <ul
                  className={cn('mt-3 space-y-2 text-sm', variant.metaValue)}
                  style={themeStyles.text}
                >
                  {project.highlights.filter(Boolean).map((item, index) => (
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
    </SectionContainer>
  );
};
