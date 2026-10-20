import { useI18n } from '@shared/i18n';

import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { EducationItem, SectionCollectionProps } from './types';

export type EducationSectionProps = SectionCollectionProps<EducationItem>;

export const EducationSection = ({
  items: education,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
}: EducationSectionProps) => {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <SectionContainer
      title={t('preview.sections.education')}
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
            ref={setSectionRef('education', edu.id)}
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
                  {edu.school || t('preview.placeholders.school')}
                </h4>
                <p className={cn('text-sm', variant.metaValue)} style={themeStyles.text}>
                  {edu.degree || t('preview.placeholders.degree')}
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
    </SectionContainer>
  );
};
