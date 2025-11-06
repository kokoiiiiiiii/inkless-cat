import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { ExperienceItem, SectionCollectionProps } from './types';

export type ExperienceSectionProps = SectionCollectionProps<ExperienceItem>;

export const ExperienceSection = ({
  items: experience,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
  accentBulletStyle,
}: ExperienceSectionProps) => {
  if (!visible) return null;

  return (
    <SectionContainer
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
              ref={setSectionRef('experience', exp.id)}
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
    </SectionContainer>
  );
};
