import { useI18n } from '@shared/i18n';

import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { SectionCollectionProps, SkillsItem } from './types';

export type SkillsSectionProps = SectionCollectionProps<SkillsItem>;

export const SkillsSection = ({
  items: skills,
  visible,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  setSectionRef,
}: SkillsSectionProps) => {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <SectionContainer
      title={t('preview.sections.skills')}
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
            ref={setSectionRef('skills', skill.id)}
            className={cn(
              'rounded-2xl border border-transparent px-4 py-4 text-sm shadow-xs transition hover:-translate-y-0.5',
              variant.card,
            )}
            style={themeStyles.card}
          >
            <h4
              className={cn('text-sm font-semibold', variant.heading)}
              style={themeStyles.heading}
            >
              {skill.title || t('preview.placeholders.skill')}
            </h4>
            <p className={cn('mt-2 text-sm leading-6', variant.metaValue)} style={themeStyles.text}>
              {(skill.items || []).filter(Boolean).join(' / ')}
            </p>
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
};
